-- =============================================================================
-- Clases semanales desde la agenda (oct 2026)
--
-- Feedback del usuario: «no es claro el tema de las clases para un
-- administrador». Había dos pantallas con dos ideas (el horario = plantilla, y
-- la agenda = clases con fecha) y la plantilla actuaba sola por detrás. Desde
-- aquí se crea TODO desde la agenda, como en el calendario del móvil:
--
--   · «Nueva clase» pregunta «¿Se repite? Solo este día / Todos los lunes».
--     «Todos los lunes» es una franja del horario, pero eso ya no se ve.
--   · Editar o quitar una clase que se repite pregunta «solo esta» o «todas
--     las próximas».
--   · La pestaña «Horario semanal» desaparece. La tabla `horario_semanal`, el
--     relleno automático (cron + al abrir la agenda) y `ajustes` siguen igual.
--
-- Lo que cambia en la base:
--   · `horario_semanal.desde`: la serie empieza el día en que se creó. Sin
--     esto, crear «todos los lunes» mirando el lunes de la semana que viene
--     creaba también el de esta.
--   · `horario_semanal.cupos`: la serie puede tener menos cupos que la sala.
--   · Tres funciones: crear, cambiar y quitar una clase semanal. Hacen todo en
--     una transacción y dicen qué pasó (cuántas, cuáles no se pudieron).
-- =============================================================================

alter table horario_semanal
  add column desde date,
  add column cupos integer check (cupos is null or cupos > 0);

comment on column horario_semanal.desde is
  'Primer día de la serie. NULL = sin límite (franjas de antes de oct 2026).';
comment on column horario_semanal.cupos is
  'Cupos de sus clases. NULL = el aforo de la sala.';

-- Respeta `desde` y `cupos`. Los cupos nunca pasan del aforo de la sala: el
-- trigger `clases_sala_y_aforo` lo rechazaría y tumbaría el lote entero.
create or replace function crear_clases_de_horario(p_desde date, p_hasta date, p_franja uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creadas integer;
begin
  insert into clases (tipo, sala, fecha, hora_inicio, duracion_min, instructora_id, cupos, franja_id)
  select h.sala::tipo_clase, h.sala, d::date, h.hora_inicio, h.duracion_min, h.instructora_id,
         least(coalesce(h.cupos, s.capacidad), s.capacidad), h.id
  from generate_series(greatest(p_desde, current_date), p_hasta, interval '1 day') d
  join horario_semanal h on h.dia = extract(isodow from d) and h.activa and h.instructora_id is not null
  join salas s on s.id = h.sala
  where (p_franja is null or h.id = p_franja)
    and (h.desde is null or d::date >= h.desde)
    and (d::date > current_date or h.hora_inicio > localtime)
    and not exists (select 1 from dias_cerrados dc where dc.fecha = d::date)
  on conflict do nothing;
  get diagnostics v_creadas = row_count;
  return v_creadas;
end $$;

revoke execute on function crear_clases_de_horario(date, date, uuid) from public, anon, authenticated;


/**
 * Crea una clase que se repite cada semana desde `p_fecha` (ese día de la
 * semana, a esa hora, en esa sala). Las clases salen al momento hasta donde
 * llega la agenda; el relleno automático sigue con las siguientes.
 *
 * ⚠️ La PRIMERA clase (la de `p_fecha`) tiene que poder crearse: si la sala o
 * la instructora están ocupadas ese día, falla todo y no queda nada a medias.
 * Las semanas siguientes que choquen se saltan y se cuentan (`saltadas`).
 *
 * Devuelve `{creadas, saltadas, hasta}`.
 */
create or replace function crear_clase_semanal(
  p_fecha       date,
  p_hora        time,
  p_sala        text,
  p_duracion    integer,
  p_instructora uuid,
  p_cupos       integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia      smallint := extract(isodow from p_fecha);
  v_franja   uuid;
  v_hasta    date;
  v_creadas  integer;
  v_esperadas integer;
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo Administración y Recepción programan clases.' using errcode = '42501';
  end if;
  if p_fecha < current_date or (p_fecha = current_date and p_hora <= localtime) then
    raise exception 'Esa clase ya habría empezado.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from equipo where id = p_instructora) then
    raise exception 'Elige una instructora.' using errcode = 'P0001';
  end if;
  if exists (select 1 from horario_semanal
             where dia = v_dia and hora_inicio = p_hora and sala = p_sala and activa) then
    raise exception 'Ya hay una clase semanal ese día a esa hora en esa sala.' using errcode = 'P0001';
  end if;

  -- Las franjas del horario de antes ya existen apagadas: se reutilizan.
  insert into horario_semanal (dia, hora_inicio, sala, duracion_min, activa, instructora_id, desde, cupos)
  values (v_dia, p_hora, p_sala, p_duracion, true, p_instructora, p_fecha, p_cupos)
  on conflict (dia, hora_inicio, sala) do update
    set duracion_min = excluded.duracion_min, activa = true,
        instructora_id = excluded.instructora_id, desde = excluded.desde, cupos = excluded.cupos
  returning id into v_franja;

  -- Hasta donde llega la agenda; y si el día elegido cae más lejos, ese día.
  select greatest(coalesce(agenda_generada_hasta, current_date + semanas_por_delante * 7 - 1), p_fecha)
    into v_hasta from ajustes;
  perform crear_clases_de_horario(p_fecha, v_hasta, v_franja);

  if not exists (select 1 from clases where franja_id = v_franja and fecha = p_fecha) then
    raise exception 'Ese día la sala o la instructora ya están ocupadas a esa hora.' using errcode = 'P0001';
  end if;

  select count(*) into v_creadas from clases
    where franja_id = v_franja and fecha >= p_fecha and not cancelada;
  select count(*) into v_esperadas
    from generate_series(p_fecha, v_hasta, interval '7 days') d
    where not exists (select 1 from dias_cerrados dc where dc.fecha = d::date);

  return jsonb_build_object(
    'creadas', v_creadas,
    'saltadas', greatest(v_esperadas - v_creadas, 0),
    'hasta', (select max(fecha) from clases where franja_id = v_franja));
end $$;

revoke execute on function crear_clase_semanal(date, time, text, integer, uuid, integer) from public, anon;
grant execute on function crear_clase_semanal(date, time, text, integer, uuid, integer) to authenticated;


/**
 * Cambia quién da, cuánto dura y cuántos caben en TODAS las próximas clases
 * de una serie (las que no han empezado), y en la serie para las que vengan.
 * Día, hora y sala no se cambian aquí: eso es otra serie.
 *
 * Una clase que no admite el cambio (esa instructora ya tiene otra clase ese
 * día, o hay más reservas que los cupos nuevos) se queda como estaba y se
 * cuenta en `sin_cambiar`. Devuelve `{cambiadas, sin_cambiar}`.
 */
create or replace function editar_clase_semanal(
  p_franja      uuid,
  p_instructora uuid,
  p_duracion    integer,
  p_cupos       integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clase     record;
  v_cambiadas integer := 0;
  v_fallos    integer := 0;
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo Administración y Recepción cambian la agenda.' using errcode = '42501';
  end if;
  if not exists (select 1 from equipo where id = p_instructora) then
    raise exception 'Elige una instructora.' using errcode = 'P0001';
  end if;

  update horario_semanal
    set instructora_id = p_instructora, duracion_min = p_duracion, cupos = p_cupos
    where id = p_franja and activa;
  if not found then
    raise exception 'Esa clase ya no se repite.' using errcode = 'P0002';
  end if;

  for v_clase in
    select c.id, s.capacidad from clases c join salas s on s.id = c.sala
    where c.franja_id = p_franja and not c.cancelada
      and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime))
  loop
    begin
      update clases
        set instructora_id = p_instructora, duracion_min = p_duracion,
            cupos = least(p_cupos, v_clase.capacidad)
        where id = v_clase.id;
      v_cambiadas := v_cambiadas + 1;
    exception when exclusion_violation or raise_exception or check_violation then
      v_fallos := v_fallos + 1;
    end;
  end loop;

  return jsonb_build_object('cambiadas', v_cambiadas, 'sin_cambiar', v_fallos);
end $$;

revoke execute on function editar_clase_semanal(uuid, uuid, integer, integer) from public, anon;
grant execute on function editar_clase_semanal(uuid, uuid, integer, integer) to authenticated;


/**
 * Deja de repetir una clase: borra las próximas que nadie reservó y CANCELA
 * las que tienen reservas (se quedan marcadas «Cancelada» con su gente, para
 * saber a quién avisar). Las pasadas no se tocan.
 * Devuelve `{borradas, canceladas}`.
 */
create or replace function quitar_clase_semanal(p_franja uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes      integer;
  v_canceladas integer;
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo Administración y Recepción cambian la agenda.' using errcode = '42501';
  end if;

  select count(*) into v_antes from clases c
    where c.franja_id = p_franja and not c.cancelada
      and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime));

  -- Apagarla: el trigger `horario_sincroniza_clases` borra las que nadie reservó.
  update horario_semanal
    set activa = false, instructora_id = null, desde = null, cupos = null
    where id = p_franja and activa;
  if not found then
    raise exception 'Esa clase ya no se repite.' using errcode = 'P0002';
  end if;

  update clases c set cancelada = true
    where c.franja_id = p_franja and not c.cancelada
      and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime));
  get diagnostics v_canceladas = row_count;

  return jsonb_build_object('borradas', v_antes - v_canceladas, 'canceladas', v_canceladas);
end $$;

revoke execute on function quitar_clase_semanal(uuid) from public, anon;
grant execute on function quitar_clase_semanal(uuid) to authenticated;
