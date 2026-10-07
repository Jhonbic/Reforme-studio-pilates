-- =============================================================================
-- Horario semanal (oct 2026, paso 4 de la lista del estudio)
--
-- Hasta aquí cada clase se programaba una a una. El estudio tiene un horario
-- que se repite cada semana (imágenes del 8 oct 2026):
--   · Lunes a viernes: 07, 08, 09, 10 · pausa · 15, 16, 17, 18 y 19 h.
--   · Sábado: de 08 a 15 h, jornada continua.
--   · Clases de 50 minutos. Domingo cerrado.
--
-- Cada fila es una FRANJA: un día, una hora y una de las dos salas. Qué
-- franjas se usan y quién las da lo decide el estudio desde el panel (por eso
-- se cargan todas apagadas y sin instructora). La modalidad la da la sala: en
-- la de Reformer se da Reformer y en la de Mat, Mat. Las privadas no van en el
-- horario: se programan sueltas.
--
-- `generar_clases(desde, hasta)` crea en la agenda las clases de las franjas
-- encendidas y con instructora. Repetirlo no duplica nada.
-- =============================================================================

create table horario_semanal (
  id              uuid primary key default gen_random_uuid(),
  -- ISO: 1 = lunes … 7 = domingo, como `extract(isodow …)`.
  dia             smallint not null check (dia between 1 and 7),
  hora_inicio     time not null,
  duracion_min    integer not null default 50 check (duracion_min between 15 and 240),
  sala            text not null references salas (id) on update cascade,
  activa          boolean not null default false,
  -- `set null`: sacar a alguien del equipo deja la franja sin instructora en
  -- vez de impedirlo; generar se la salta hasta que se asigne otra.
  instructora_id  uuid references equipo (id) on delete set null,
  unique (dia, hora_inicio, sala)
);

comment on table horario_semanal is
  'Franjas que se repiten cada semana (día, hora, sala). generar_clases() las convierte en clases.';

insert into horario_semanal (dia, hora_inicio, sala)
select d.dia, h.hora::time, s.sala
from (values (1), (2), (3), (4), (5)) d (dia)
cross join (values ('07:00'), ('08:00'), ('09:00'), ('10:00'),
                   ('15:00'), ('16:00'), ('17:00'), ('18:00'), ('19:00')) h (hora)
cross join (values ('Reformer'), ('Mat')) s (sala)
union all
select 6, h.hora::time, s.sala
from (values ('08:00'), ('09:00'), ('10:00'), ('11:00'),
             ('12:00'), ('13:00'), ('14:00'), ('15:00')) h (hora)
cross join (values ('Reformer'), ('Mat')) s (sala);

alter table horario_semanal enable row level security;
create policy "horario: lectura del personal" on horario_semanal
  for select using (tiene_perfil());
-- Lo arma quien programa la agenda: el mostrador.
create policy "horario: el mostrador lo edita" on horario_semanal
  for update using (es_mostrador()) with check (es_mostrador());

/**
 * Crea las clases del horario entre dos fechas (incluidas).
 *
 * · Solo las franjas encendidas Y con instructora: una clase sin instructora
 *   no existe (`clases.instructora_id` es obligatorio). Se cuentan aparte para
 *   decirlo.
 * · ⚠️ `on conflict do nothing` sobre las restricciones de EXCLUSIÓN de sala e
 *   instructora: una franja que ya tiene su clase (o cuya sala o instructora
 *   ya están ocupadas a esa hora) no se crea dos veces ni hace fallar al resto.
 *   Por eso se puede generar otra vez sin miedo.
 * · Nada en el pasado: ni días anteriores a hoy ni horas de hoy que ya pasaron.
 * · `security invoker`: inserta con los permisos de quien llama (RLS manda).
 */
create or replace function generar_clases(p_desde date, p_hasta date)
returns table (creadas integer, ya_estaban integer, sin_instructora integer)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo recepción o administración generan clases.' using errcode = '42501';
  end if;
  if p_hasta < p_desde then
    raise exception 'La fecha final va antes que la inicial.' using errcode = 'P0001';
  end if;
  if p_hasta - p_desde > 92 then
    raise exception 'Como mucho, tres meses de una vez.' using errcode = 'P0001';
  end if;

  with candidatas as (
    select d::date as fecha, h.hora_inicio, h.duracion_min, h.sala, h.instructora_id
    from generate_series(greatest(p_desde, current_date), p_hasta, interval '1 day') d
    join horario_semanal h on h.dia = extract(isodow from d) and h.activa
    where d::date > current_date or h.hora_inicio > localtime
  ), nuevas as (
    insert into clases (tipo, sala, fecha, hora_inicio, duracion_min, instructora_id, cupos)
    select c.sala::tipo_clase, c.sala, c.fecha, c.hora_inicio, c.duracion_min, c.instructora_id, s.capacidad
    from candidatas c
    join salas s on s.id = c.sala
    where c.instructora_id is not null
    on conflict do nothing
    returning 1
  )
  select (select count(*) from nuevas),
         count(*) filter (where instructora_id is not null) - (select count(*) from nuevas),
         count(*) filter (where instructora_id is null)
    into creadas, ya_estaban, sin_instructora
    from candidatas;

  return next;
end $$;

revoke execute on function generar_clases(date, date) from public, anon;
grant execute on function generar_clases(date, date) to authenticated;

/**
 * Copia lo que está encendido (y quién lo da) de un día a otros. Solo toca las
 * franjas que existen en los dos días con la misma hora y sala: copiar el
 * lunes al sábado copia 08:00, 09:00 y 10:00, y deja el resto del sábado como
 * estaba (sus horas son otras).
 */
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
    set activa = o.activa, instructora_id = o.instructora_id
    from horario_semanal o
    where o.dia = p_desde
      and t.dia = any (p_dias) and t.dia <> p_desde
      and t.hora_inicio = o.hora_inicio and t.sala = o.sala;
  get diagnostics v_cambiadas = row_count;
  return v_cambiadas;
end $$;

revoke execute on function copiar_dia_horario(smallint, smallint[]) from public, anon;
grant execute on function copiar_dia_horario(smallint, smallint[]) to authenticated;
