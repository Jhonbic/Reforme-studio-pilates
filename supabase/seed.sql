-- =============================================================================
-- Datos de ejemplo — equivalente de `src/lib/admin/mock.ts`
--
-- ⚠️ **La relación va al revés que en el mock, y es el arreglo de un bug.**
-- Allí el cliente tenía un vencimiento y el pago se deducía restándole la
-- vigencia; como el vencimiento se repartía sin mirar el plan, salían cobros
-- fechados en el futuro. Aquí se genera el INICIO (un hecho pasado) y el
-- vencimiento sale de sumarle la vigencia del plan. Es imposible que un pago
-- caiga por delante de hoy.
--
-- Determinista a propósito: nada de `random()`. Dos ejecuciones dan la misma
-- base, así que un fallo se puede reproducir.
--
-- Ejecutar con:  npx supabase db reset
-- =============================================================================

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


-- Presupuesto del mes en curso -----------------------------------------------
-- `date_trunc` al primer día del mes, que es lo que exige el CHECK.

insert into presupuestos (categoria, mes, importe) values
  ('Arriendo',      date_trunc('month', current_date)::date, 4200000),
  ('Nómina',        date_trunc('month', current_date)::date, 4400000),
  ('Servicios',     date_trunc('month', current_date)::date,  900000),
  ('Mantenimiento', date_trunc('month', current_date)::date,  600000),
  ('Marketing',     date_trunc('month', current_date)::date,  500000);


-- Gastos del mes -------------------------------------------------------------

insert into gastos (categoria, concepto, importe, fecha, metodo) values
  ('Arriendo',      'Arriendo del local',            4200000, date_trunc('month', current_date)::date + 1,  'Transferencia'),
  ('Nómina',        'Nómina de instructoras',        4600000, date_trunc('month', current_date)::date + 4,  'Transferencia'),
  ('Servicios',     'Energía, agua e internet',       850000, date_trunc('month', current_date)::date + 6,  'Transferencia'),
  ('Mantenimiento', 'Revisión de reformers',          780000, date_trunc('month', current_date)::date + 9,  'Efectivo'),
  ('Marketing',     'Pauta en redes',                 370000, date_trunc('month', current_date)::date + 2,  'Tarjeta');


-- Clientes -------------------------------------------------------------------
-- 118, repartidos en cuatro bandas de antigüedad de la membresía para que
-- aparezcan los cuatro estados sin escribirlos: el estado lo calcula
-- `estado_de_membresia()` a partir de las fechas.

with nombres as (
  select array[
    'Laura','Andrés','Valentina','Camila','Santiago','Daniela','Mateo','Sofía',
    'Juan','Isabella','Sebastián','Mariana','Nicolás','Gabriela','Felipe',
    'Catalina','Alejandra','Tomás','Natalia','Esteban'
  ] as n,
  array[
    'Gutiérrez','Rodríguez','Martínez','Vargas','Cárdenas','Restrepo','Quintero',
    'Salazar','Escobar','Arboleda','Calderón','Cifuentes','Ospina','Muñoz',
    'Torres','Cardona','Mejía','Zapata','Naranjo','Duque'
  ] as a
),
generados as (
  select
    i,
    (select n[1 + (i * 7) % 20] from nombres) || ' ' ||
    (select a[1 + (i * 13) % 20] from nombres)              as nombre,
    -- Cédulas de 10 dígitos, únicas por construcción.
    (1000000000 + i * 4517)::text                            as identificacion,
    -- El plan rota, como en el mock.
    (array['Mensual','Trimestral','Pack 10 clases','Clase suelta'])[1 + (i * 3) % 4] as plan,
    /*  Banda de antigüedad. El inicio es SIEMPRE pasado; el estado sale solo:
          i < 12  → venció hace tiempo            → Vencida
          i < 19  → vence dentro de pocos días    → Por vencer
          i < 31  → vigente pero sin venir a clase → Inactiva
          resto   → vigente y viniendo             → Activa                    */
    case
      when i < 12 then 40 + (i * 3) % 50
      when i < 19 then 24 + (i % 6)
      when i < 31 then 5  + (i % 20)
      else 1 + (i * 11) % 25
    end                                                      as dias_desde_inicio,
    case
      when i between 19 and 30 then current_date - (35 + (i % 25))
      when i < 12              then current_date - (45 + (i % 40))
      else current_date - ((i * 3) % 12)
    end                                                      as ultima_asistencia
  from generate_series(0, 117) as i
)
insert into clientes (nombre, identificacion, correo, telefono, alta, ultima_asistencia, acepta_terminos)
select
  g.nombre,
  g.identificacion,
  lower(translate(split_part(g.nombre, ' ', 1), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) || '.' ||
  lower(translate(split_part(g.nombre, ' ', 2), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) || '@correo.com',
  '3' || lpad(((g.i * 7919) % 1000000000)::text, 9, '0'),
  current_date - (60 + (g.i * 23) % 840),
  g.ultima_asistencia,
  true
from generados g;


-- Membresías -----------------------------------------------------------------
-- Una por cliente: la vigente. El vencimiento SALE del inicio más la vigencia
-- del plan, nunca al revés.

insert into membresias (cliente_id, plan_id, inicio, vencimiento, importe)
select
  c.id,
  p.id,
  ini.inicio,
  ini.inicio + p.vigencia_dias,
  p.precio
from clientes c
cross join lateral (
  select (row_number() over (order by c.identificacion) - 1)::int as i
) rn
cross join lateral (
  select (array['Mensual','Trimestral','Pack 10 clases','Clase suelta'])[1 + (rn.i * 3) % 4] as nombre_plan
) pl
join planes p on p.nombre = pl.nombre_plan
cross join lateral (
  select current_date - (
    case
      when rn.i < 12 then 40 + (rn.i * 3) % 50
      when rn.i < 19 then 24 + (rn.i % 6)
      when rn.i < 31 then 5  + (rn.i % 20)
      else 1 + (rn.i * 11) % 25
    end
  )::int as inicio
) ini;


-- Pagos ----------------------------------------------------------------------
-- Un cobro por membresía, el día en que empezó. El método sigue la misma
-- proporción que `REPARTO_METODOS`: Nequi 4 de cada 10, Transferencia 3,
-- Efectivo 2, Tarjeta 1.

insert into pagos (cliente_id, membresia_id, metodo, fecha, importe)
select
  m.cliente_id,
  m.id,
  (array['Nequi','Transferencia','Nequi','Efectivo','Nequi',
         'Transferencia','Tarjeta','Nequi','Transferencia','Efectivo']
  )[1 + (row_number() over (order by m.inicio) - 1)::int % 10]::metodo_pago,
  m.inicio,
  m.importe
from membresias m;
