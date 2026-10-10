-- =============================================================================
-- Clases semanales con fecha de fin (oct 2026)
--
-- Feedback del usuario: «no me termina de convencer, siento que sigue algo
-- raro». Una serie sin fin se iba creando por detrás cada noche, hasta donde
-- dijera un número escondido en Configuración (8 semanas en producción): no se
-- veía hasta cuándo estaba programada una clase y aparecían clases solas.
--
-- Desde aquí una clase semanal tiene FECHA DE FIN (`horario_semanal.hasta`),
-- como «Termina el…» del calendario del móvil:
--   · Al crearla salen TODAS sus clases de golpe, hasta esa fecha.
--   · El relleno de cada noche (cron + al abrir la agenda) ya NO toca las
--     series con fin: solo las franjas antiguas sin `hasta`, que no se crean
--     desde la app. Así nada aparece solo, y una clase quitada a mano no vuelve.
--   · Para que siga, se alarga la serie («Todas las próximas» → Hasta).
--     Acortarla quita las clases que sobran (las reservadas se cancelan).
--   · Máximo un año por serie.
-- =============================================================================

alter table horario_semanal add column hasta date;

comment on column horario_semanal.hasta is
  'Último día de la serie. NULL = sin fin (franjas de antes de oct 2026; las rellena el cron).';

-- Respeta `hasta`. Sin franja concreta (lo que llama el relleno de cada noche)
-- solo crea las franjas SIN fin: las que tienen fin ya se crearon enteras.
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

/**
 * El horario manda: al cambiar una franja, sus próximas clases la siguen.
 *
 * ⚠️ Arreglo (lo cazó un test): antes, CUALQUIER cambio en una franja
 * encendida (p. ej. otra instructora) volvía a llamar a «crear sus clases» y
 * resucitaba las que se habían quitado a mano. Ahora solo se crean al
 * ENCENDERLA (o al darle instructora por primera vez).
 */
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
     and new.instructora_id is not distinct from old.instructora_id then
    return new;
  end if;

  if not v_ahora then
    -- Sin clase o sin instructora: fuera las que nadie reservó.
    delete from clases c
      where c.franja_id = new.id and not c.cancelada
        and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime))
        and not exists (select 1 from reservas r where r.clase_id = c.id);
  elsif v_antes then
    -- Otra instructora: pasa a las próximas clases, una a una, para que un
    -- choque en un día concreto no tumbe el cambio entero.
    for v_clase in
      select c.id from clases c
      where c.franja_id = new.id and not c.cancelada
        and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime))
    loop
      begin
        update clases set instructora_id = new.instructora_id where id = v_clase;
      exception when exclusion_violation then
        null; -- Ese día ya tiene otra clase a esa hora: se queda con la anterior.
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

-- Abrir otra vez un día cerrado devuelve sus clases: las de series con fin
-- (si el día cae dentro de la serie) y las de franjas sin fin (si el día está
-- dentro de lo que ya rellenó la agenda).
create or replace function dias_cerrados_sincronizan_agenda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    delete from clases c
      where c.fecha = new.fecha and not c.cancelada
        and (c.fecha > current_date or c.hora_inicio > localtime)
        and not exists (select 1 from reservas r where r.clase_id = c.id);
    return new;
  end if;
  perform crear_clases_de_horario(old.fecha, old.fecha, h.id)
    from horario_semanal h
    where h.activa
      and (h.hasta is not null
           or old.fecha <= coalesce((select agenda_generada_hasta from ajustes where id), old.fecha));
  return old;
end $$;


-- Crear: ahora con fecha de fin ---------------------------------------------

drop function crear_clase_semanal(date, time, text, integer, uuid, integer);

/**
 * Crea una clase que se repite cada semana de `p_fecha` a `p_hasta` (ese día
 * de la semana, a esa hora, en esa sala), con TODAS sus clases al momento.
 *
 * ⚠️ La PRIMERA clase tiene que poder crearse: si la sala o la instructora
 * están ocupadas ese día, falla todo y no queda nada a medias. Las semanas
 * siguientes que choquen se saltan y se cuentan (`saltadas`).
 *
 * Devuelve `{creadas, saltadas, hasta}` (`hasta` = la última clase creada).
 */
create function crear_clase_semanal(
  p_fecha       date,
  p_hora        time,
  p_sala        text,
  p_duracion    integer,
  p_instructora uuid,
  p_cupos       integer,
  p_hasta       date
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
  if exists (select 1 from horario_semanal
             where dia = v_dia and hora_inicio = p_hora and sala = p_sala and activa) then
    raise exception 'Ya hay una clase semanal ese día a esa hora en esa sala.' using errcode = 'P0001';
  end if;

  insert into horario_semanal (dia, hora_inicio, sala, duracion_min, activa, instructora_id, desde, hasta, cupos)
  values (v_dia, p_hora, p_sala, p_duracion, true, p_instructora, p_fecha, p_hasta, p_cupos)
  on conflict (dia, hora_inicio, sala) do update
    set duracion_min = excluded.duracion_min, activa = true, instructora_id = excluded.instructora_id,
        desde = excluded.desde, hasta = excluded.hasta, cupos = excluded.cupos
  returning id into v_franja;

  perform crear_clases_de_horario(p_fecha, p_hasta, v_franja);

  if not exists (select 1 from clases where franja_id = v_franja and fecha = p_fecha) then
    raise exception 'Ese día la sala o la instructora ya están ocupadas a esa hora.' using errcode = 'P0001';
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

revoke execute on function crear_clase_semanal(date, time, text, integer, uuid, integer, date) from public, anon;
grant execute on function crear_clase_semanal(date, time, text, integer, uuid, integer, date) to authenticated;


-- Cambiar todas las próximas: ahora también hasta cuándo ---------------------

drop function editar_clase_semanal(uuid, uuid, integer, integer);

/**
 * Cambia instructora, duración, cupos y FECHA DE FIN de una serie, en todas
 * sus próximas clases (las que no han empezado) y en la serie.
 *
 *   · Alargarla crea las clases nuevas, solo DESPUÉS del fin anterior: una
 *     clase quitada a mano dentro de la serie no vuelve.
 *   · Acortarla borra las que sobran sin reservas y CANCELA las que tienen
 *     gente (se quedan «Canceladas» para saber a quién avisar).
 *
 * Una clase que no admite el cambio (choque de instructora, más reservas que
 * cupos) se queda como estaba y se cuenta en `sin_cambiar`.
 * Devuelve `{cambiadas, sin_cambiar, creadas, quitadas, canceladas, hasta}`.
 */
create function editar_clase_semanal(
  p_franja      uuid,
  p_instructora uuid,
  p_duracion    integer,
  p_cupos       integer,
  p_hasta       date
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
  -- Sin fin (franjas antiguas): su «fin» era hasta donde llegaba la agenda.
  v_fin_viejo := coalesce(v_franja.hasta, (select agenda_generada_hasta from ajustes where id), current_date);

  update horario_semanal
    set instructora_id = p_instructora, duracion_min = p_duracion, cupos = p_cupos, hasta = p_hasta
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
        set instructora_id = p_instructora, duracion_min = p_duracion,
            cupos = least(p_cupos, v_clase.capacidad)
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

revoke execute on function editar_clase_semanal(uuid, uuid, integer, integer, date) from public, anon;
grant execute on function editar_clase_semanal(uuid, uuid, integer, integer, date) to authenticated;

-- Quitar la serie también borra su fin.
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
    set activa = false, instructora_id = null, desde = null, hasta = null, cupos = null
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
