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
truncate table pagos, membresias, clientes, gastos, presupuestos, equipo, planes
  restart identity cascade;


-- Planes ---------------------------------------------------------------------
-- Los mismos precios y condiciones que `PRECIO_PLAN` y `CONDICIONES_PLANES`.

insert into planes (nombre, precio, vigencia_dias, clases_incluidas, descripcion, caracteristicas) values
  ('Mensual', 190000, 30, null,
   'Para quien entrena de forma constante todas las semanas.',
   array['Reserva con 7 días de antelación',
         'Grupos de máximo 6 personas',
         'Valoración postural al empezar',
         'Congela hasta 7 días por viaje o enfermedad']),

  ('Trimestral', 510000, 90, null,
   'Tres meses por adelantado, con descuento sobre el mensual.',
   array['Todo lo del plan Mensual',
         'Ahorro de $60.000 frente a pagar mes a mes',
         'Reserva con 14 días de antelación',
         'Congela hasta 15 días',
         'Una clase de invitado al trimestre']),

  ('Pack 10 clases', 320000, 60, 10,
   'Diez clases para usar cuando se pueda, sin atarse al mes.',
   array['Sin días fijos: se reserva según agenda',
         'Grupos de máximo 6 personas',
         'Transferible a otra persona una vez']),

  ('Clase suelta', 35000, 1, 1,
   'Una clase para probar el estudio o para quien está de paso.',
   array['Sin compromiso ni matrícula',
         'Se descuenta si se contrata un plan esa semana']);


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
-- ⚠️ Y por eso «Clase suelta» solo aparece entre las vencidas: dura UN día, así
-- que su vencimiento nunca puede caer a más de 15 días vista y no puede estar
-- «Activa». No es un apaño, es lo que significa una clase suelta.
--
-- Reparto, el mismo que documenta el mock: 87 activas · 7 por vencer ·
-- 12 vencidas · 12 inactivas = 118.
-- =============================================================================

with base as (
  select
    i,
    -- El estado objetivo de cada fila.
    case
      when i < 12 then 'Vencida'
      when i < 19 then 'Por vencer'
      when i < 31 then 'Inactiva'
      else 'Activa'
    end as objetivo
  from generate_series(0, 117) as i
),
asignado as (
  select
    b.i,
    b.objetivo,
    -- Solo las vencidas admiten «Clase suelta»; el resto rota entre los tres
    -- planes que duran lo suficiente para estar vigentes.
    case
      when b.objetivo = 'Vencida'
        then (array['Mensual','Trimestral','Pack 10 clases','Clase suelta'])[1 + (b.i % 4)]
      else (array['Mensual','Trimestral','Pack 10 clases'])[1 + (b.i % 3)]
    end as nombre_plan
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
      when 'Por vencer' then 1 + (p.i - 12) * 2
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
