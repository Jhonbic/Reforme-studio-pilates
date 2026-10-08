-- =============================================================================
-- Datos de ejemplo — equivalente de `src/lib/admin/mock.ts`
--
-- ⚠️ **La relación va al revés que en el mock, y es el arreglo de un bug.**
-- Allí el cliente tenía un vencimiento y el pago se deducía restándole la
-- vigencia; como el vencimiento se repartía sin mirar el plan, salían cobros
-- fechados en el futuro. Aquí se decide el VENCIMIENTO y el inicio sale de
-- restarle la vigencia, con la garantía de que nunca queda por delante de hoy.
--
-- Determinista a propósito: nada de `random()`. Dos ejecuciones dan la misma
-- base, así que un fallo se puede reproducir.
--
-- Ejecutar con:  npx supabase db push --include-seed --linked
-- =============================================================================

-- Idempotente: la semilla se puede volver a lanzar sin duplicar.
-- `restart identity cascade` limpia también lo que cuelga por clave foránea.
truncate table reservas, clases, pagos, membresias, clientes, gastos, presupuestos, equipo, planes
  restart identity cascade;


-- Planes ---------------------------------------------------------------------
-- Los planes REALES del estudio (oct 2026), todos de 30 días. Las clases de
-- cada tipo son las que se descuentan al reservar.

insert into planes (nombre, precio, vigencia_dias, modalidad, clases_reformer, clases_mat) values
  ('Inicio',            140000, 30, 'Mat',       0,  4),
  ('Origen',            260000, 30, 'Mat',       0,  8),
  ('Armonía',           360000, 30, 'Mat',       0, 12),
  ('Esencia',           220000, 30, 'Reformer',  4,  0),
  ('Equilibrio',        360000, 30, 'Reformer',  8,  0),
  ('Evolución',         480000, 30, 'Reformer', 12,  0),
  ('Fusión Inicio',     470000, 30, 'Fusión',    4,  4),
  ('Fusión Esencial',   580000, 30, 'Fusión',    8,  4),
  ('Fusión Equilibrio', 680000, 30, 'Fusión',   12,  4);


-- Equipo ---------------------------------------------------------------------

insert into equipo (nombre, correo, telefono, rol, clases_semana, alta) values
  ('Daniela Ospina',    'daniela@reforme.com',  '3201234567', 'Instructora',    18, current_date - 720),
  ('Mariana Restrepo',  'mariana@reforme.com',  '3202345678', 'Instructora',    14, current_date - 540),
  ('Carolina Muñoz',    'carolina@reforme.com', '3203456789', 'Instructora',    12, current_date - 300),
  ('Alejandra Torres',  'ale@reforme.com',      '3204567890', 'Recepción',       0, current_date - 420),
  ('Juliana Cardona',   'juliana@reforme.com',  '3205678901', 'Administración',  0, current_date - 900);


-- Presupuesto y gastos del mes en curso --------------------------------------

insert into presupuestos (categoria, mes, importe) values
  ('Arriendo',      date_trunc('month', current_date)::date, 4200000),
  ('Nómina',        date_trunc('month', current_date)::date, 4400000),
  ('Servicios',     date_trunc('month', current_date)::date,  900000),
  ('Mantenimiento', date_trunc('month', current_date)::date,  600000),
  ('Marketing',     date_trunc('month', current_date)::date,  500000);

-- `least(..., current_date)` porque el trigger rechaza gastos futuros: si la
-- semilla corre el día 3 del mes, «día 1 + 9» caería por delante de hoy.
insert into gastos (categoria, concepto, importe, fecha, metodo) values
  ('Arriendo',      'Arriendo del local',      4200000, least(date_trunc('month', current_date)::date + 1, current_date), 'Transferencia'),
  ('Nómina',        'Nómina de instructoras',  4600000, least(date_trunc('month', current_date)::date + 4, current_date), 'Transferencia'),
  ('Servicios',     'Energía, agua e internet', 850000, least(date_trunc('month', current_date)::date + 6, current_date), 'Transferencia'),
  ('Mantenimiento', 'Revisión de reformers',    780000, least(date_trunc('month', current_date)::date + 9, current_date), 'Efectivo'),
  ('Marketing',     'Pauta en redes',           370000, least(date_trunc('month', current_date)::date + 2, current_date), 'Tarjeta');


-- =============================================================================
-- Clientes, membresías y pagos
--
-- ⚠️ Se parte del ESTADO que se quiere y se calcula la fecha hacia atrás, no al
-- revés. El primer intento repartía «días desde el inicio» en bandas fijas, y
-- no funcionaba porque **la vigencia cambia según el plan**: 40 días desde el
-- inicio deja vencido un Mensual (30 días) pero vigente un Trimestral (90).
--
-- Reparto: 11 activas · 3 por vencer · 4 vencidas · 2 inactivas = 20.
-- Antes eran 118, copiando el mock; se bajó a 20 en oct 2026 (decisión del
-- usuario) porque no aportaban nada que no aporten estos. Lo que SÍ importa
-- conservar: los cuatro estados presentes y más de 12 filas, para que el
-- listado tenga una segunda página.
-- =============================================================================

with base as (
  select
    i,
    -- El estado objetivo de cada fila.
    case
      when i < 4 then 'Vencida'
      when i < 7 then 'Por vencer'
      when i < 9 then 'Inactiva'
      else 'Activa'
    end as objetivo
  from generate_series(0, 19) as i
),
asignado as (
  select
    b.i,
    b.objetivo,
    -- Rota entre una de cada modalidad (todos duran 30 días).
    (array['Origen','Equilibrio','Fusión Esencial'])[1 + (b.i % 3)] as nombre_plan
  from base b
),
persona as (
  select
    a.*,
    (array['Laura','Andrés','Valentina','Camila','Santiago','Daniela','Mateo',
           'Sofía','Juan','Isabella','Sebastián','Mariana','Nicolás','Gabriela',
           'Felipe','Catalina','Alejandra','Tomás','Natalia','Esteban']
    )[1 + (a.i * 7) % 20] || ' ' ||
    (array['Gutiérrez','Rodríguez','Martínez','Vargas','Cárdenas','Restrepo',
           'Quintero','Salazar','Escobar','Arboleda','Calderón','Cifuentes',
           'Ospina','Muñoz','Torres','Cardona','Mejía','Zapata','Naranjo','Duque']
    )[1 + (a.i * 13) % 20]                          as nombre,
    -- ⚠️ Los multiplicadores 7 y 13 son primos con 20: así `(i*7) % 20` recorre
    -- los veinte nombres sin repetir ninguno.
    -- Diez dígitos, únicos por construcción y ordenables como texto (todos
    -- tienen la misma longitud), que es de lo que depende el reparto de abajo.
    (1000000000 + a.i * 4517)::text                 as identificacion
  from asignado a
),
fechas as (
  select
    p.*,
    pl.id           as plan_id,
    pl.precio,
    pl.vigencia_dias,
    /*  El vencimiento, en días desde hoy:
          Vencida    → ya pasó
          Por vencer → dentro de 1 a 13 días (≤ 15)
          resto      → más de 15 días, y nunca más allá de la vigencia del plan,
                       porque `inicio = vencimiento - vigencia` tiene que caer
                       en el pasado o el trigger de pagos lo rechaza.          */
    case p.objetivo
      when 'Vencida'    then -(5 + (p.i * 7) % 40)
      when 'Por vencer' then 1 + (p.i - 4) * 2
      else 16 + (p.i * 7) % greatest(pl.vigencia_dias - 15, 1)
    end::int                                        as dias_hasta_vencimiento
  from persona p
  join planes pl on pl.nombre = p.nombre_plan
),
nuevos as (
  insert into clientes
    (nombre, identificacion, correo, telefono, alta, ultima_asistencia, acepta_terminos)
  select
    f.nombre,
    f.identificacion,
    lower(translate(split_part(f.nombre, ' ', 1), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) || '.' ||
    lower(translate(split_part(f.nombre, ' ', 2), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) || '@correo.com',
    '3' || lpad(((f.i * 7919) % 1000000000)::text, 9, '0'),
    current_date - (60 + (f.i * 23) % 840),
    -- Las inactivas llevan más de 30 días sin aparecer; el resto, poco.
    case when f.objetivo = 'Inactiva'
      then current_date - (35 + f.i % 25)
      else current_date - (f.i % 20)
    end,
    true
  from fechas f
  returning id, identificacion
)
-- Una membresía por cliente: la vigente. El vencimiento manda y el inicio se
-- calcula restándole la vigencia del plan.
insert into membresias (cliente_id, plan_id, inicio, vencimiento, importe)
select
  n.id,
  f.plan_id,
  current_date + f.dias_hasta_vencimiento - f.vigencia_dias,
  current_date + f.dias_hasta_vencimiento,
  f.precio
from nuevos n
join fechas f on f.identificacion = n.identificacion;


-- Pagos ----------------------------------------------------------------------
-- Un cobro por membresía, el día en que empezó. El método sigue la proporción
-- de `REPARTO_METODOS`: Nequi 4 de cada 10, Transferencia 3, Efectivo 2,
-- Tarjeta 1.
--
-- ⚠️ El `row_number()` va aquí, en una consulta sobre TODA la tabla, y no
-- dentro de un `cross join lateral` como en el primer intento: un lateral solo
-- ve una fila cada vez, así que `row_number()` devolvía 1 siempre y los 118
-- clientes acababan con el mismo plan y la misma fecha.

insert into pagos (cliente_id, membresia_id, metodo, fecha, importe)
select
  m.cliente_id,
  m.id,
  (array['Nequi','Transferencia','Nequi','Efectivo','Nequi',
         'Transferencia','Tarjeta','Nequi','Transferencia','Efectivo']
  )[1 + (n.fila % 10)]::metodo_pago,
  m.inicio,
  m.importe
from membresias m
join (
  select id, (row_number() over (order by inicio, id) - 1)::int as fila
  from membresias
) n on n.id = m.id;

-- Dos membresías vigentes que quedan debiendo (paso 6, pagos pendientes): una
-- con abono de la mitad y otra sin pagar nada todavía.
update pagos set importe = importe / 2
where id = (
  select g.id from pagos g join membresias m on m.id = g.membresia_id
  where m.vencimiento >= current_date order by m.inicio desc, m.id limit 1
);
delete from pagos
where id = (
  select g.id from pagos g join membresias m on m.id = g.membresia_id
  where m.vencimiento >= current_date order by m.inicio desc, m.id offset 1 limit 1
);


-- Equipo ↔ cuentas -----------------------------------------------------------
-- ⚠️ El `truncate` del principio vacía `equipo`, incluidas las filas de las
-- cuentas reales con acceso (la del dueño). Esto las vuelve a enlazar y a
-- crear, igual que la migración `20261001160000`. Sin ello, recargar la
-- semilla sacaría al dueño de la lista de «quién tiene acceso» del panel
-- (seguiría entrando, pero nadie podría gestionarlo desde ahí).
update equipo e
set cuenta_id = u.id
from auth.users u
where lower(u.email) = lower(e.correo);

insert into equipo (nombre, correo, rol, cuenta_id)
select p.nombre, u.email, p.rol, p.id
from perfiles p
join auth.users u on u.id = p.id
where not exists (select 1 from equipo e where e.cuenta_id = p.id)
on conflict (correo) do nothing;


-- =============================================================================
-- Agenda: clases y reservas (paso 9)
--
-- Va AL FINAL, después de enlazar el equipo con las cuentas: así las
-- instructoras con cuenta local también dan clase.
--
-- ⚠️ Se GENERA de una plantilla semanal, que es como funciona un estudio de
-- verdad: dos semanas atrás (para que «Finalizada» y el reparto por día del
-- dashboard tengan algo que enseñar) y tres por delante. Domingo cerrado.
-- Determinista: nada de `random()`; la variedad sale de `hashtext()`.
-- =============================================================================

delete from reservas;
delete from clases;

with
-- Lunes a viernes. Las dos de las 18:00 son SIMULTÁNEAS a propósito (dos salas,
-- dos instructoras) y van en posiciones consecutivas: el reparto de
-- instructoras es por posición, y así nunca les toca la misma.
comun (idx, hora, tipo, dur) as (values
  (0, '06:00', 'Reformer', 50),
  (1, '07:00', 'Reformer', 50),
  (2, '09:00', 'Mat',      55),
  (3, '17:00', 'Reformer', 50),
  (4, '18:00', 'Reformer', 50),
  (5, '18:00', 'Mat',      55),
  (6, '19:00', 'Reformer', 50)
),
plantilla (dow, idx, hora, tipo, dur) as (
  select d, c.idx, c.hora, c.tipo, c.dur
  from generate_series(1, 5) d cross join comun c
  -- Privada martes y jueves.
  union all select d, 7, '16:00', 'Privada', 55 from (values (2), (4)) v(d)
  -- Sábado, solo mañana.
  union all select 6, s.idx, s.hora, s.tipo, s.dur from (values
    (0, '07:00', 'Reformer', 50),
    (1, '08:00', 'Reformer', 50),
    (2, '09:00', 'Mat',      55)
  ) s(idx, hora, tipo, dur)
),
instructoras as (
  select id, (row_number() over (order by nombre))::int - 1 as n,
         (count(*) over ())::int as total
  from equipo
  where rol = 'Instructora' and activo
),
dias as (
  select current_date + d as fecha, d + 14 as desde_inicio
  from generate_series(-14, 21) d
)
insert into clases (tipo, fecha, hora_inicio, duracion_min, instructora_id, cupos, cancelada)
select
  p.tipo::tipo_clase,
  dd.fecha,
  p.hora::time,
  p.dur,
  i.id,
  case p.tipo when 'Reformer' then 8 when 'Mat' then 8 else 1 end,
  -- ~2 % anuladas: las justas para que el estado exista sin que la agenda
  -- parezca rota.
  abs(hashtext(dd.fecha::text || p.hora || p.tipo || 'anulada')) % 45 = 0
from dias dd
join plantilla p on p.dow = extract(isodow from dd.fecha)
-- Desplazada un puesto cada día, para que no siempre den la misma clase.
join instructoras i on i.n = (p.idx + dd.desde_inicio) % i.total;

-- Reservas: cuántas, por hash; quiénes, los clientes ordenados por otro hash.
-- Más allá de una semana el techo baja a la mitad del aforo: una clase a tres
-- semanas vista llena no se la cree nadie. Nunca más que cupos (además lo
-- impide el trigger `reservas_respetan_aforo`).
with objetivo as (
  select c.id, c.fecha, c.hora_inicio, c.tipo,
    abs(hashtext(c.fecha::text || c.hora_inicio::text || c.tipo::text))
      % (case when c.fecha > current_date + 7 then ceil(c.cupos / 2.0)::int else c.cupos end + 1)
      as cuantas
  from clases c
),
candidatos as (
  select o.id as clase_id, cl.id as cliente_id, o.cuantas,
    row_number() over (
      partition by o.id
      order by abs(hashtext(cl.identificacion || o.fecha::text || o.hora_inicio::text || o.tipo::text))
    ) as orden
  from objetivo o
  cross join clientes cl
)
insert into reservas (clase_id, cliente_id)
select clase_id, cliente_id from candidatos where orden <= cuantas;

-- Horario semanal: las franjas del estudio (las mismas que carga la migración
-- `20261009120000_horario_semanal`, porque el `truncate … cascade` de arriba
-- las vacía al vaciar `equipo`). En local se encienden unas cuantas con
-- instructora para poder probar «Generar clases»; en producción las elige el
-- estudio.
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
cross join (values ('Reformer'), ('Mat')) s (sala)
on conflict do nothing;

with instructoras as (
  select id, row_number() over (order by nombre) - 1 as n, count(*) over () as total
  from equipo where rol = 'Instructora' and activo
)
update horario_semanal h
set activa = true,
    instructora_id = (select id from instructoras i
                      where i.n = (h.dia + extract(hour from h.hora_inicio)::int
                                   + case h.sala when 'Mat' then 1 else 0 end) % i.total)
where (h.sala = 'Reformer' and extract(hour from h.hora_inicio) in (7, 8, 17, 18, 19))
   or (h.sala = 'Mat' and extract(hour from h.hora_inicio) in (9, 18));
