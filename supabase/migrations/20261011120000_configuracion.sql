-- =============================================================================
-- Configuración (oct 2026, paso 4 de la lista del estudio)
--
-- Lo que el estudio tiene que poder cambiar sin el desarrollador:
--   · Semanas por delante de la agenda (ya en `ajustes`).
--   · Aforo de cada sala (ya en `salas`): al cambiarlo, las próximas clases
--     que tenían el aforo de la sala lo siguen.
--   · Horas mínimas para cancelar (antes, 2 h escritas en la función).
--   · Días cerrados (festivos): la agenda automática se los salta.
--   · Daviplata y «Otro» como formas de pago.
-- =============================================================================

-- Horas para cancelar --------------------------------------------------------
alter table ajustes
  add column horas_para_cancelar integer not null default 2 check (horas_para_cancelar between 0 and 72);

-- El cliente también tiene que leerlas (su pantalla anuncia el plazo), y en
-- `ajustes` no hay nada privado: cualquier sesión la lee.
drop policy "ajustes: lectura del personal" on ajustes;
create policy "ajustes: lectura con sesión" on ajustes for select using (auth.uid() is not null);

create or replace function cancelar_mi_reserva(p_clase uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := mi_cliente_id();
  v_inicio  timestamp;
  v_horas   integer;
begin
  if v_cliente is null then
    raise exception 'Esta cuenta no es de un cliente.' using errcode = 'P0001';
  end if;

  select c.fecha + c.hora_inicio into v_inicio
  from clases c
  join reservas r on r.clase_id = c.id and r.cliente_id = v_cliente
  where c.id = p_clase;
  if v_inicio is null then
    raise exception 'No tienes esa clase reservada.' using errcode = 'P0001';
  end if;

  select horas_para_cancelar into v_horas from ajustes;
  if v_inicio - make_interval(hours => v_horas) <= localtimestamp then
    raise exception 'Faltan menos de % horas para la clase: para cancelarla, escribe a recepción.', v_horas
      using errcode = 'P0001';
  end if;

  delete from reservas where clase_id = p_clase and cliente_id = v_cliente;
end $$;

-- Días cerrados ----------------------------------------------------------------
create table dias_cerrados (
  fecha   date primary key,
  motivo  text not null check (length(trim(motivo)) between 1 and 80)
);

comment on table dias_cerrados is
  'Festivos y días sin clases. La agenda automática no crea clases en ellos.';

alter table dias_cerrados enable row level security;
create policy "dias cerrados: lectura del personal" on dias_cerrados for select using (tiene_perfil());
create policy "dias cerrados: administración añade" on dias_cerrados for insert with check (es_admin());
create policy "dias cerrados: administración quita" on dias_cerrados for delete using (es_admin());

-- La agenda automática se los salta.
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
    and not exists (select 1 from dias_cerrados dc where dc.fecha = d::date)
  on conflict do nothing;
  get diagnostics v_creadas = row_count;
  return v_creadas;
end $$;

revoke execute on function crear_clases_de_horario(date, date, uuid) from public, anon, authenticated;

/**
 * Cerrar un día quita sus clases que nadie reservó (las reservadas se quedan:
 * hay gente a la que avisar, y la pantalla dice cuántas). Abrirlo otra vez
 * devuelve las del horario.
 */
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
  perform crear_clases_de_horario(old.fecha, least(old.fecha, coalesce((select agenda_generada_hasta from ajustes), old.fecha)));
  return old;
end $$;

create trigger dias_cerrados_sincronizan_agenda
  after insert or delete on dias_cerrados
  for each row execute function dias_cerrados_sincronizan_agenda();

-- Aforo de las salas -----------------------------------------------------------
/**
 * Cambiar el aforo de una sala lo lleva a sus próximas clases que tenían el
 * aforo de la sala (las que se pusieron a mano con otro número se respetan).
 * Al bajarlo, solo donde la gente apuntada cabe; el resto se queda y la
 * pantalla lo dice.
 */
create or replace function salas_sincronizan_aforo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.capacidad = old.capacidad then
    return new;
  end if;
  update clases c set cupos = new.capacidad
    where c.sala = new.id and c.cupos = old.capacidad and not c.cancelada
      and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime))
      and (select count(*) from reservas r where r.clase_id = c.id) <= new.capacidad;
  return new;
end $$;

create trigger salas_sincronizan_aforo
  after update of capacidad on salas
  for each row execute function salas_sincronizan_aforo();

-- Formas de pago ---------------------------------------------------------------
alter type metodo_pago add value if not exists 'Daviplata';
alter type metodo_pago add value if not exists 'Otro';

-- Arreglo: rellenar la agenda desde la APP fallaba ------------------------------
-- ⚠️ Supabase tiene `pg_safeupdate`: por la API (PostgREST) rechaza todo
-- UPDATE sin WHERE, también dentro de una función. `extender_agenda_interna`
-- hacía `update ajustes set …` a secas: desde la agenda daba «UPDATE requires
-- a WHERE clause» (y la página seguía, porque ese fallo no la rompe). Solo
-- funcionaban el cron y las migraciones, que no pasan por la API. Los tests de
-- base tampoco pasan por ella: por eso no lo cazaron.
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
    where id
    for update;
  if v_desde <= v_hasta then
    v_creadas := crear_clases_de_horario(v_desde, v_hasta);
    update ajustes set agenda_generada_hasta = v_hasta where id;
  end if;
  return v_creadas;
end $$;

revoke execute on function extender_agenda_interna() from public, anon, authenticated;
