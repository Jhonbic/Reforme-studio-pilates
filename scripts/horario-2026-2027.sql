-- =============================================================================
-- Horario del estudio, nov 2026 → 30 jun 2027 (cartel «Horarios de clase»)
--
--   Lunes a viernes: 07, 08, 09, 10 · receso · 15, 16, 17, 18, 19 h
--   Sábado:          08, 09, 10, 11 · receso · 13, 14, 15 h
--   Clases de 50 min, Reformer y Mat A LA VEZ (cada una en su sala), las DOS
--   instructoras en las dos clases. Domingo y festivos cerrado.
--
-- Cómo se ejecuta (una sola vez, en producción, DESPUÉS de aplicar la
-- migración 20261114120000_dos_instructoras): pegarlo ENTERO en el SQL Editor
-- de Supabase (Dashboard → SQL Editor → Run), o con psql:
--
--   psql "<cadena de conexión del proyecto>" -v ON_ERROR_STOP=1 -f scripts/horario-2026-2027.sql
--
-- ⚠️ `npx supabase db query -f` NO sirve: solo admite una sentencia por
-- llamada («cannot insert multiple commands into a prepared statement»).
--
-- Corre como `postgres`, así que no pasa por `es_mostrador()`: por eso
-- enciende las franjas a mano y deja que el trigger
-- `horario_sincroniza_clases` cree las clases (de `desde` a `hasta`,
-- saltándose los días cerrados).
--
-- Se puede volver a lanzar: los festivos van con `on conflict do nothing`, y
-- las franjas se apagan y se vuelven a encender (las clases reservadas se
-- conservan). Necesita EXACTAMENTE dos instructoras activas en `equipo`.
--
-- Ensayado en local el 14 nov 2026: 3058 clases del 17 nov 2026 al 30 jun
-- 2027, ninguna en festivo ni en domingo, 50 min, 8 cupos, las dos
-- instructoras en cada una; 104 franjas encendidas (las dos del sábado a las
-- 12:00, que no están en el cartel, se quedan apagadas).
-- =============================================================================

begin;

-- 1. Festivos de Colombia (ley Emiliani: los movibles pasan al lunes).
insert into dias_cerrados (fecha, motivo) values
  ('2026-11-16', 'Independencia de Cartagena'),
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo'),
  ('2027-01-11', 'Reyes Magos'),
  ('2027-03-22', 'San José'),
  ('2027-03-25', 'Jueves Santo'),
  ('2027-03-26', 'Viernes Santo'),
  ('2027-05-01', 'Día del Trabajo'),
  ('2027-05-10', 'Ascensión del Señor'),
  ('2027-05-31', 'Corpus Christi'),
  ('2027-06-07', 'Sagrado Corazón'),
  ('2027-06-28', 'San Pedro y San Pablo')
on conflict (fecha) do nothing;

-- 2. Las franjas del cartel, por si faltara alguna (las 106 ya existen).
insert into horario_semanal (dia, hora_inicio, sala)
select d.dia, h.hora::time, s.sala
from (values (1), (2), (3), (4), (5)) d (dia)
cross join (values ('07:00'), ('08:00'), ('09:00'), ('10:00'),
                   ('15:00'), ('16:00'), ('17:00'), ('18:00'), ('19:00')) h (hora)
cross join (values ('Reformer'), ('Mat')) s (sala)
union all
select 6, h.hora::time, s.sala
from (values ('08:00'), ('09:00'), ('10:00'), ('11:00'),
             ('13:00'), ('14:00'), ('15:00')) h (hora)
cross join (values ('Reformer'), ('Mat')) s (sala)
on conflict do nothing;

-- 3. Encenderlas con las dos instructoras. El trigger crea las clases.
do $$
declare
  v_n  integer;
  v_i1 uuid;
  v_i2 uuid;
  v_creadas integer;
begin
  select count(*) into v_n from equipo where rol = 'Instructora' and activo;
  if v_n <> 2 then
    raise exception 'Hay % instructoras activas en el equipo y el guion espera exactamente 2. Da de alta (o desactiva) en Usuarios → Equipo y vuelve a lanzarlo.', v_n;
  end if;
  select id into v_i1 from equipo where rol = 'Instructora' and activo order by alta, nombre limit 1;
  select id into v_i2 from equipo where rol = 'Instructora' and activo order by alta, nombre offset 1 limit 1;

  -- Las franjas del cartel. Se apagan primero: el trigger solo CREA las clases
  -- al encender una franja, y así vale igual si alguna ya estaba encendida.
  -- Apagar borra sus próximas clases sin reservas; las reservadas se quedan y
  -- al encender no se duplican (único por franja y fecha).
  create temp table objetivo on commit drop as
    select h.id from horario_semanal h
    where (h.dia between 1 and 5 and extract(hour from h.hora_inicio) in (7, 8, 9, 10, 15, 16, 17, 18, 19))
       or (h.dia = 6 and extract(hour from h.hora_inicio) in (8, 9, 10, 11, 13, 14, 15));

  update horario_semanal
    set activa = false, instructora_id = null, instructora2_id = null, desde = null, hasta = null, cupos = null
    where id in (select id from objetivo);

  update horario_semanal
    set activa = true,
        instructora_id = v_i1,
        instructora2_id = v_i2,
        duracion_min = 50,
        cupos = null,                 -- el aforo de la sala (8)
        desde = '2026-11-16',         -- el lunes que viene (el 16 es festivo: no sale)
        hasta = '2027-06-30'
    where id in (select id from objetivo);

  -- Las clases que ya existían (reservadas) se ponen al día con la serie.
  update clases
    set instructora_id = v_i1, instructora2_id = v_i2, duracion_min = 50
    where franja_id in (select id from objetivo) and not cancelada
      and fecha >= '2026-11-16'
      and (instructora_id, instructora2_id) is distinct from (v_i1, v_i2);

  select count(*) into v_creadas from clases
    where fecha between '2026-11-16' and '2027-06-30' and not cancelada and franja_id is not null;
  raise notice 'Franjas encendidas: % · Clases en la agenda del 16 nov 2026 al 30 jun 2027: %',
    (select count(*) from horario_semanal where activa), v_creadas;
end $$;

commit;

-- Comprobación rápida (opcional):
-- select fecha, hora_inicio, sala, cupos from clases
--   where fecha between '2026-11-17' and '2026-11-21' order by fecha, hora_inicio, sala;
