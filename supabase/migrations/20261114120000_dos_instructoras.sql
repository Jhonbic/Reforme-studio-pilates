-- =============================================================================
-- Dos instructoras por clase y sin bloqueo de horario (nov 2026)
--
-- Pedido del estudio: Reformer y Mat se dan A LA VEZ (dos salas) y las dos
-- instructoras están en las dos clases. Hasta aquí la base impedía que una
-- instructora tuviera dos clases a la misma hora (`clases_instructora_sin_solapes`)
-- y cada clase llevaba una sola.
--
--   · Se QUITA la restricción de exclusión por instructora. La de SALA se queda:
--     dos clases en la misma sala a la vez siguen sin caber.
--   · `clases.instructora2_id` y `horario_semanal.instructora2_id`: la segunda
--     instructora, opcional. Tiene que ser distinta de la primera.
--   · Las series la copian a sus clases, el cambio de una franja la propaga,
--     «Copiar este día a…» la copia, y la segunda instructora también marca la
--     asistencia de su clase.
--   · `agenda_cliente` y `mi_historial` siguen devolviendo una sola columna
--     `instructora`: con dos, «Ana y Laura».
-- =============================================================================

alter table clases drop constraint clases_instructora_sin_solapes;

alter table clases
  add column instructora2_id uuid references equipo (id) on delete restrict,
  add constraint clases_instructoras_distintas
    check (instructora2_id is null or instructora2_id <> instructora_id);

comment on column clases.instructora2_id is
  'Segunda instructora, si la clase la dan dos. NULL = una sola.';
comment on table clases is
  'La agenda. El estado (Programada, Llena, Finalizada) se deriva; solo cancelada se guarda. Una instructora puede tener dos clases a la vez (Reformer y Mat); lo que no cabe es dos clases en la misma sala (clases_sala_sin_solapes).';

create index clases_instructora2_idx on clases (instructora2_id) where instructora2_id is not null;

alter table horario_semanal
  add column instructora2_id uuid references equipo (id) on delete set null,
  add constraint horario_instructoras_distintas
    check (instructora2_id is null or instructora2_id <> instructora_id);

comment on column horario_semanal.instructora2_id is
  'Segunda instructora de la serie (opcional). Sus clases la copian.';


-- Las clases de una franja llevan a las dos ------------------------------------
create or replace function crear_clases_de_horario(p_desde date, p_hasta date, p_franja uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creadas integer;
begin
  insert into clases (tipo, sala, fecha, hora_inicio, duracion_min, instructora_id, instructora2_id, cupos, franja_id)
  select h.sala::tipo_clase, h.sala, d::date, h.hora_inicio, h.duracion_min, h.instructora_id, h.instructora2_id,
         least(coalesce(h.cupos, s.capacidad), s.capacidad), h.id
  from generate_series(greatest(p_desde, current_date), p_hasta, interval '1 day') d
  join horario_semanal h on h.dia = extract(isodow from d) and h.activa and h.instructora_id is not null
  join salas s on s.id = h.sala
  where (p_franja is null and h.hasta is null or h.id = p_franja)
    and (h.desde is null or d::date >= h.desde)
    and (h.hasta is null or d::date <= h.hasta)
    and (d::date > current_date or h.hora_inicio > localtime)
    and not exists (select 1 from dias_cerrados dc where dc.fecha = d::date)
  on conflict do nothing;
  get diagnostics v_creadas = row_count;
  return v_creadas;
end $$;

revoke execute on function crear_clases_de_horario(date, date, uuid) from public, anon, authenticated;


-- Cambiar la franja cambia también a la segunda instructora ----------------------
create or replace function horario_sincroniza_clases()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hasta date;
  v_clase uuid;
  v_antes boolean := old.activa and old.instructora_id is not null;
  v_ahora boolean := new.activa and new.instructora_id is not null;
begin
  if new.activa is not distinct from old.activa
     and new.instructora_id is not distinct from old.instructora_id
     and new.instructora2_id is not distinct from old.instructora2_id then
    return new;
  end if;

  if not v_ahora then
    -- Sin clase o sin instructora: fuera las que nadie reservó.
    delete from clases c
      where c.franja_id = new.id and not c.cancelada
        and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime))
        and not exists (select 1 from reservas r where r.clase_id = c.id);
  elsif v_antes then
    -- Otras instructoras: pasan a las próximas clases, una a una, para que un
    -- fallo en un día concreto no tumbe el cambio entero.
    for v_clase in
      select c.id from clases c
      where c.franja_id = new.id and not c.cancelada
        and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime))
    loop
      begin
        update clases
          set instructora_id = new.instructora_id, instructora2_id = new.instructora2_id
          where id = v_clase;
      exception when exclusion_violation or check_violation then
        null; -- Esa clase se queda como estaba.
      end;
    end loop;
  else
    -- Se acaba de encender: sus clases, hasta su fin (o hasta donde llega la
    -- agenda, si es una franja antigua sin fin).
    select coalesce(new.hasta, agenda_generada_hasta) into v_hasta from ajustes where id;
    if v_hasta is not null then
      perform crear_clases_de_horario(current_date, v_hasta, new.id);
    end if;
  end if;
  return new;
end $$;


-- «Copiar este día a…» copia a las dos ----------------------------------------
create or replace function copiar_dia_horario(p_desde smallint, p_dias smallint[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cambiadas integer;
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo recepción o administración cambian el horario.' using errcode = '42501';
  end if;
  update horario_semanal t
    set activa = o.activa, instructora_id = o.instructora_id, instructora2_id = o.instructora2_id
    from horario_semanal o
    where o.dia = p_desde
      and t.dia = any (p_dias) and t.dia <> p_desde
      and t.hora_inicio = o.hora_inicio and t.sala = o.sala;
  get diagnostics v_cambiadas = row_count;
  return v_cambiadas;
end $$;


-- Crear una clase semanal, ahora con segunda instructora (opcional) -------------
-- Se borra la firma de 7 argumentos: con el valor por defecto, una llamada de
-- 7 sería ambigua entre las dos.
drop function crear_clase_semanal(date, time, text, integer, uuid, integer, date);

create function crear_clase_semanal(
  p_fecha        date,
  p_hora         time,
  p_sala         text,
  p_duracion     integer,
  p_instructora  uuid,
  p_cupos        integer,
  p_hasta        date,
  p_instructora2 uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia       smallint := extract(isodow from p_fecha);
  v_franja    uuid;
  v_creadas   integer;
  v_esperadas integer;
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo Administración y Recepción programan clases.' using errcode = '42501';
  end if;
  if p_fecha < current_date or (p_fecha = current_date and p_hora <= localtime) then
    raise exception 'Esa clase ya habría empezado: elige otro día u otra hora.' using errcode = 'P0001';
  end if;
  if p_hasta is null or p_hasta < p_fecha then
    raise exception 'La fecha de fin no puede ser anterior al primer día.' using errcode = 'P0001';
  end if;
  if p_hasta > p_fecha + 366 then
    raise exception 'Una clase semanal dura como mucho un año: alárgala más adelante.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from equipo where id = p_instructora) then
    raise exception 'Elige una instructora.' using errcode = 'P0001';
  end if;
  if p_instructora2 is not null and not exists (select 1 from equipo where id = p_instructora2) then
    raise exception 'La segunda instructora no existe.' using errcode = 'P0001';
  end if;
  if p_instructora2 = p_instructora then
    raise exception 'La segunda instructora tiene que ser otra persona.' using errcode = 'P0001';
  end if;
  if exists (select 1 from horario_semanal
             where dia = v_dia and hora_inicio = p_hora and sala = p_sala and activa) then
    raise exception 'Ya hay una clase semanal ese día a esa hora en esa sala.' using errcode = 'P0001';
  end if;

  insert into horario_semanal (dia, hora_inicio, sala, duracion_min, activa, instructora_id, instructora2_id, desde, hasta, cupos)
  values (v_dia, p_hora, p_sala, p_duracion, true, p_instructora, p_instructora2, p_fecha, p_hasta, p_cupos)
  on conflict (dia, hora_inicio, sala) do update
    set duracion_min = excluded.duracion_min, activa = true,
        instructora_id = excluded.instructora_id, instructora2_id = excluded.instructora2_id,
        desde = excluded.desde, hasta = excluded.hasta, cupos = excluded.cupos
  returning id into v_franja;

  perform crear_clases_de_horario(p_fecha, p_hasta, v_franja);

  if not exists (select 1 from clases where franja_id = v_franja and fecha = p_fecha) then
    raise exception 'Ese día la sala ya está ocupada a esa hora.' using errcode = 'P0001';
  end if;

  select count(*) into v_creadas from clases
    where franja_id = v_franja and fecha between p_fecha and p_hasta and not cancelada;
  select count(*) into v_esperadas
    from generate_series(p_fecha, p_hasta, interval '7 days') d
    where not exists (select 1 from dias_cerrados dc where dc.fecha = d::date);

  return jsonb_build_object(
    'creadas', v_creadas,
    'saltadas', greatest(v_esperadas - v_creadas, 0),
    'hasta', (select max(fecha) from clases where franja_id = v_franja));
end $$;

revoke execute on function crear_clase_semanal(date, time, text, integer, uuid, integer, date, uuid) from public, anon;
grant execute on function crear_clase_semanal(date, time, text, integer, uuid, integer, date, uuid) to authenticated;


-- Cambiar toda la serie, con segunda instructora -------------------------------
drop function editar_clase_semanal(uuid, uuid, integer, integer, date);

create function editar_clase_semanal(
  p_franja       uuid,
  p_instructora  uuid,
  p_duracion     integer,
  p_cupos        integer,
  p_hasta        date,
  p_instructora2 uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_franja     horario_semanal%rowtype;
  v_fin_viejo  date;
  v_clase      record;
  v_cambiadas  integer := 0;
  v_fallos     integer := 0;
  v_creadas    integer := 0;
  v_quitadas   integer := 0;
  v_canceladas integer := 0;
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo Administración y Recepción cambian la agenda.' using errcode = '42501';
  end if;
  if not exists (select 1 from equipo where id = p_instructora) then
    raise exception 'Elige una instructora.' using errcode = 'P0001';
  end if;
  if p_instructora2 is not null and not exists (select 1 from equipo where id = p_instructora2) then
    raise exception 'La segunda instructora no existe.' using errcode = 'P0001';
  end if;
  if p_instructora2 = p_instructora then
    raise exception 'La segunda instructora tiene que ser otra persona.' using errcode = 'P0001';
  end if;

  select * into v_franja from horario_semanal where id = p_franja and activa for update;
  if not found then
    raise exception 'Esa clase ya no se repite.' using errcode = 'P0002';
  end if;
  if p_hasta is null or p_hasta < current_date then
    raise exception 'La fecha de fin no puede haber pasado.' using errcode = 'P0001';
  end if;
  if p_hasta > current_date + 366 then
    raise exception 'Una clase semanal llega como mucho a un año desde hoy.' using errcode = 'P0001';
  end if;
  v_fin_viejo := coalesce(v_franja.hasta, (select agenda_generada_hasta from ajustes where id), current_date);

  update horario_semanal
    set instructora_id = p_instructora, instructora2_id = p_instructora2,
        duracion_min = p_duracion, cupos = p_cupos, hasta = p_hasta
    where id = p_franja;

  -- Acortar: fuera las que pasan del nuevo fin.
  if p_hasta < v_fin_viejo then
    delete from clases c
      where c.franja_id = p_franja and not c.cancelada and c.fecha > p_hasta
        and (c.fecha > current_date or c.hora_inicio > localtime)
        and not exists (select 1 from reservas r where r.clase_id = c.id);
    get diagnostics v_quitadas = row_count;
    update clases c set cancelada = true
      where c.franja_id = p_franja and not c.cancelada and c.fecha > p_hasta
        and (c.fecha > current_date or c.hora_inicio > localtime);
    get diagnostics v_canceladas = row_count;
  end if;

  -- Las que quedan, al día con la serie.
  for v_clase in
    select c.id, s.capacidad from clases c join salas s on s.id = c.sala
    where c.franja_id = p_franja and not c.cancelada
      and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime))
  loop
    begin
      update clases
        set instructora_id = p_instructora, instructora2_id = p_instructora2,
            duracion_min = p_duracion, cupos = least(p_cupos, v_clase.capacidad)
        where id = v_clase.id;
      v_cambiadas := v_cambiadas + 1;
    exception when exclusion_violation or raise_exception or check_violation then
      v_fallos := v_fallos + 1;
    end;
  end loop;

  -- Alargar: solo lo que viene DESPUÉS del fin anterior.
  if p_hasta > v_fin_viejo then
    v_creadas := crear_clases_de_horario(v_fin_viejo + 1, p_hasta, p_franja);
  end if;

  return jsonb_build_object(
    'cambiadas', v_cambiadas, 'sin_cambiar', v_fallos, 'creadas', v_creadas,
    'quitadas', v_quitadas, 'canceladas', v_canceladas,
    'hasta', (select max(fecha) from clases where franja_id = p_franja and not cancelada));
end $$;

revoke execute on function editar_clase_semanal(uuid, uuid, integer, integer, date, uuid) from public, anon;
grant execute on function editar_clase_semanal(uuid, uuid, integer, integer, date, uuid) to authenticated;


-- La segunda instructora también pasa lista -----------------------------------
create or replace function marcar_asistencia(p_reserva uuid, p_asistencia asistencia)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva reservas%rowtype;
  v_clase   clases%rowtype;
begin
  select * into v_reserva from reservas where id = p_reserva;
  if not found then
    raise exception 'Esa reserva ya no existe.' using errcode = 'P0002';
  end if;
  select * into v_clase from clases where id = v_reserva.clase_id;

  -- ⚠️ `coalesce`: `es_mostrador()` devuelve NULL a quien no es del equipo.
  if not coalesce(
    es_mostrador()
    or exists (
      select 1 from equipo e
      where e.id in (v_clase.instructora_id, v_clase.instructora2_id)
        and e.cuenta_id = auth.uid() and e.activo
    ), false
  ) then
    raise exception 'Solo recepción, administración o las instructoras de la clase marcan la asistencia.'
      using errcode = '42501';
  end if;

  if v_clase.cancelada then
    raise exception 'La clase se canceló: no hay asistencia que marcar.' using errcode = 'P0001';
  end if;
  if (v_clase.fecha + v_clase.hora_inicio) > localtimestamp then
    raise exception 'La clase todavía no ha empezado.' using errcode = 'P0001';
  end if;

  update reservas set
    asistencia             = p_asistencia,
    asistencia_marcada_en  = case when p_asistencia is null then null else now() end,
    asistencia_marcada_por = case when p_asistencia is null then null else auth.uid() end
  where id = p_reserva;

  if p_asistencia = 'Asistió' then
    update clientes
      set ultima_asistencia = greatest(coalesce(ultima_asistencia, v_clase.fecha), v_clase.fecha)
      where id = v_reserva.cliente_id;
  end if;
end $$;


-- El cliente ve a las dos: «Ana y Laura» ---------------------------------------
create or replace function agenda_cliente(p_desde date, p_hasta date)
returns table (
  id            uuid,
  tipo          tipo_clase,
  fecha         date,
  hora_inicio   time,
  duracion_min  integer,
  instructora   text,
  cupos         integer,
  reservas      integer,
  reservada     boolean,
  disponibles   integer,
  puesto_espera integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cliente uuid := mi_cliente_id();
begin
  if v_cliente is null then
    raise exception 'Esta cuenta no es de un cliente.' using errcode = 'P0001';
  end if;
  return query
    select c.id, c.tipo, c.fecha, c.hora_inicio, c.duracion_min,
           e.nombre || coalesce(' y ' || e2.nombre, ''),
           c.cupos,
           (select count(*)::integer from reservas r where r.clase_id = c.id),
           exists (select 1 from reservas r where r.clase_id = c.id and r.cliente_id = v_cliente),
           case when c.tipo = 'Privada' then null else (
             select coalesce(sum(
               (case c.tipo when 'Reformer' then m.clases_reformer else m.clases_mat end)
               - clases_usadas(m.id, c.tipo)), 0)::integer
             from membresias m
             where m.cliente_id = v_cliente and c.fecha between m.inicio and m.vencimiento
           ) end,
           (select (count(*) filter (where l2.creado_en <= l.creado_en))::integer
              from lista_espera l
              join lista_espera l2 on l2.clase_id = l.clase_id
              where l.clase_id = c.id and l.cliente_id = v_cliente
              group by l.id)
    from clases c
    join equipo e on e.id = c.instructora_id
    left join equipo e2 on e2.id = c.instructora2_id
    where not c.cancelada
      and c.fecha between greatest(p_desde, current_date) and least(p_hasta, current_date + 84)
      and (c.fecha + c.hora_inicio) > localtimestamp
    order by c.fecha, c.hora_inicio;
end $$;

create or replace function mi_historial(p_desde date, p_hasta date)
returns table (
  reserva_id    uuid,
  fecha         date,
  hora_inicio   time,
  duracion_min  integer,
  tipo          tipo_clase,
  instructora   text,
  asistencia    asistencia,
  cancelada     boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cliente uuid := mi_cliente_id();
begin
  if v_cliente is null then
    raise exception 'Esta cuenta no es de un cliente.' using errcode = 'P0001';
  end if;
  return query
    select r.id, c.fecha, c.hora_inicio, c.duracion_min, c.tipo,
           e.nombre || coalesce(' y ' || e2.nombre, ''),
           r.asistencia, c.cancelada
    from reservas r
    join clases c on c.id = r.clase_id
    join equipo e on e.id = c.instructora_id
    left join equipo e2 on e2.id = c.instructora2_id
    where r.cliente_id = v_cliente
      and c.fecha between greatest(p_desde, p_hasta - 366) and p_hasta
      and (c.fecha + c.hora_inicio) <= localtimestamp
    order by c.fecha, c.hora_inicio;
end $$;
