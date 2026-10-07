-- =============================================================================
-- Agenda automática (oct 2026)
--
-- Hasta aquí el horario semanal y la agenda eran dos cosas: había que acordarse
-- de pulsar «Generar», y cambiar el horario no tocaba las clases ya creadas
-- (feedback del usuario: «lo de las clases aún no es muy intuitivo»). Desde
-- aquí el horario MANDA y la agenda lo sigue sola:
--
--   · La agenda se rellena sola hasta `ajustes.semanas_por_delante` (4)
--     semanas: cada día (pg_cron) y además cada vez que se abre la agenda.
--   · ⚠️ Lo que se borra a mano NO vuelve: se guarda hasta dónde se generó
--     (`agenda_generada_hasta`) y solo se rellena lo nuevo. Una clase
--     cancelada sigue ocupando su franja ese día (único `franja_id + fecha`).
--   · Cambiar una franja cambia sus próximas clases (las que no han empezado):
--       instructora nueva → pasa a esas clases (salvo donde choque);
--       apagarla          → se borran las que nadie reservó; las reservadas se
--                           quedan para que alguien decida y avise;
--       encenderla        → se crean hasta donde llega la agenda.
--   · El botón «Generar clases» desaparece (y `generar_clases`).
-- =============================================================================

-- Ajustes del estudio: una sola fila. Aquí irán los de Configuración.
create table ajustes (
  id                      boolean primary key default true check (id),
  semanas_por_delante     integer not null default 4 check (semanas_por_delante between 1 and 12),
  agenda_generada_hasta   date
);
insert into ajustes default values;

alter table ajustes enable row level security;
create policy "ajustes: lectura del personal" on ajustes for select using (tiene_perfil());
create policy "ajustes: administración edita" on ajustes for update using (es_admin()) with check (es_admin());

-- De qué franja del horario salió cada clase (NULL = programada a mano).
alter table clases
  add column franja_id uuid references horario_semanal (id) on delete set null;
create unique index clases_una_por_franja_y_dia on clases (franja_id, fecha) where franja_id is not null;

/**
 * Crea las clases del horario entre dos fechas (todas las franjas, o una).
 * Solo franjas encendidas con instructora y nada que ya haya empezado.
 * `on conflict do nothing` cubre el único de franja y día y las exclusiones
 * de sala e instructora: nada se duplica ni choca.
 *
 * ⚠️ Interna: `security definer` y SIN permiso para nadie. La llaman el
 * trigger del horario, `extender_agenda` y el cron.
 */
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
  select h.sala::tipo_clase, h.sala, d::date, h.hora_inicio, h.duracion_min, h.instructora_id, s.capacidad, h.id
  from generate_series(greatest(p_desde, current_date), p_hasta, interval '1 day') d
  join horario_semanal h on h.dia = extract(isodow from d) and h.activa and h.instructora_id is not null
  join salas s on s.id = h.sala
  where (p_franja is null or h.id = p_franja)
    and (d::date > current_date or h.hora_inicio > localtime)
  on conflict do nothing;
  get diagnostics v_creadas = row_count;
  return v_creadas;
end $$;

revoke execute on function crear_clases_de_horario(date, date, uuid) from public, anon, authenticated;

/** Rellena la agenda hasta `semanas_por_delante`, solo los días nuevos. */
create or replace function extender_agenda_interna()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_desde   date;
  v_hasta   date;
  v_creadas integer := 0;
begin
  select greatest(current_date, coalesce(agenda_generada_hasta + 1, current_date)),
         current_date + semanas_por_delante * 7 - 1
    into v_desde, v_hasta
    from ajustes
    for update;
  if v_desde <= v_hasta then
    v_creadas := crear_clases_de_horario(v_desde, v_hasta);
    update ajustes set agenda_generada_hasta = v_hasta;
  end if;
  return v_creadas;
end $$;

revoke execute on function extender_agenda_interna() from public, anon, authenticated;

/** La misma, para la app: la llama la agenda al abrirse. */
create or replace function extender_agenda()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(tiene_perfil(), false) then
    raise exception 'Solo el equipo del estudio.' using errcode = '42501';
  end if;
  return extender_agenda_interna();
end $$;

revoke execute on function extender_agenda() from public, anon;
grant execute on function extender_agenda() to authenticated;

/**
 * El horario manda: al cambiar una franja, sus próximas clases la siguen.
 * Solo las que no han empezado; las pasadas son historia.
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
begin
  if new.activa is not distinct from old.activa
     and new.instructora_id is not distinct from old.instructora_id then
    return new;
  end if;

  if not new.activa or new.instructora_id is null then
    -- Sin clase o sin instructora: fuera las que nadie reservó.
    delete from clases c
      where c.franja_id = new.id and not c.cancelada
        and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime))
        and not exists (select 1 from reservas r where r.clase_id = c.id);
  elsif old.activa and old.instructora_id is not null then
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
  end if;

  if new.activa and new.instructora_id is not null then
    select agenda_generada_hasta into v_hasta from ajustes;
    if v_hasta is not null then
      perform crear_clases_de_horario(current_date, v_hasta, new.id);
    end if;
  end if;
  return new;
end $$;

create trigger horario_sincroniza_clases
  after update on horario_semanal
  for each row execute function horario_sincroniza_clases();

drop function if exists generar_clases(date, date);

-- Cada día a las 03:00 de Bogotá (08:00 UTC) se rellena lo que falte.
create extension if not exists pg_cron;
select cron.schedule('extender-agenda', '0 8 * * *', $$select public.extender_agenda_interna()$$);

-- Primera pasada: deja fijada la ventana desde hoy.
select extender_agenda_interna();

/**
 * Cuántas clases de una modalidad le quedan a cada cliente para un día
 * concreto: lo que le queda en las membresías que cubren ese día (la misma
 * cuenta que hace `reservas_descuentan_clase` al reservar). Solo salen los
 * clientes con alguna membresía que cubra la fecha. Para el buscador de
 * «Apuntar a»: recepción ve el saldo ANTES de pulsar.
 */
create or replace function disponibles_para(p_fecha date, p_tipo tipo_clase)
returns table (cliente_id uuid, disponibles integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not coalesce(tiene_perfil(), false) then
    raise exception 'Solo el equipo del estudio.' using errcode = '42501';
  end if;
  return query
    select m.cliente_id,
           sum(case p_tipo when 'Reformer' then m.clases_reformer when 'Mat' then m.clases_mat else 0 end
               - clases_usadas(m.id, p_tipo))::integer
    from membresias m
    where p_fecha between m.inicio and m.vencimiento
    group by m.cliente_id;
end $$;

revoke execute on function disponibles_para(date, tipo_clase) from public, anon;
grant execute on function disponibles_para(date, tipo_clase) to authenticated;
