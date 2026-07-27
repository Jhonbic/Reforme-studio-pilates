-- =============================================================================
-- Reforme Studio Pilates — esquema inicial
--
-- Traduce `src/lib/admin/types.ts` a Postgres. Tres decisiones que se apartan
-- del mock a propósito, y están razonadas donde toca:
--
--   1. `planes` es una TABLA, no un enum. En el mock, `TipoPlan` es una unión
--      cerrada de cuatro literales, y por eso el formulario de alta de plan no
--      puede guardar: un nombre libre no cabe en esa unión. Como tabla, crear
--      un plan es un INSERT.
--   2. La membresía se separa del cliente. En el mock, `Cliente` lleva dentro
--      plan, vencimiento e importe; pero una persona renueva muchas veces, y
--      con esos campos dentro solo cabe la última. Sin histórico no hay forma
--      de saber si alguien lleva tres años o acaba de entrar.
--   3. El ESTADO no se guarda: se calcula. Guardado, un cliente «Activa» cuya
--      membresía venció ayer sigue diciendo «Activa» hasta que alguien pase a
--      corregirlo. Es un dato que envejece solo.
--
-- Importes: enteros en pesos colombianos, sin centavos (250000 = $250.000),
-- igual que en `types.ts`.
-- =============================================================================

-- Enums --------------------------------------------------------------------

create type metodo_pago as enum ('Efectivo', 'Nequi', 'Transferencia', 'Tarjeta');

create type categoria_gasto as enum (
  'Arriendo', 'Nómina', 'Servicios', 'Mantenimiento', 'Marketing'
);

create type rol_equipo as enum ('Instructora', 'Administración', 'Recepción');

create type tipo_identificacion as enum ('C.C.', 'T.I.', 'C.E.', 'Pasaporte', 'R.C.');

create type estado_membresia as enum ('Activa', 'Por vencer', 'Vencida', 'Inactiva');


-- Perfiles: enlaza una cuenta de auth con su rol -----------------------------
-- Supabase guarda las credenciales en `auth.users`, que no se toca. El rol y
-- el nombre viven aquí porque son del dominio, no de la autenticación.

create table perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null check (length(trim(nombre)) >= 2),
  rol         rol_equipo not null default 'Recepción',
  creado_en   timestamptz not null default now()
);

comment on table perfiles is
  'Rol de cada cuenta. Sin fila aquí, RLS no deja leer nada: dar de alta a alguien en auth.users no le da acceso por sí solo.';


-- Planes ---------------------------------------------------------------------

create table planes (
  id                uuid primary key default gen_random_uuid(),
  nombre            text not null unique check (length(trim(nombre)) >= 3),
  precio            integer not null check (precio > 0),
  vigencia_dias     integer not null check (vigencia_dias > 0),
  -- NULL = ilimitadas dentro de la vigencia. Es la casilla del formulario:
  -- «ilimitadas» no es un número especial (¿0? ¿-1?), es ausencia de número.
  clases_incluidas  integer check (clases_incluidas > 0),
  se_vende          boolean not null default true,
  descripcion       text not null default '',
  caracteristicas   text[] not null default '{}',
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

comment on column planes.se_vende is
  'Un plan retirado deja de ofrecerse pero conserva a sus clientes vigentes. Por eso se marca en vez de borrarse: borrarlo dejaría membresías huérfanas.';


-- Clientes -------------------------------------------------------------------

create table clientes (
  id                        uuid primary key default gen_random_uuid(),
  nombre                    text not null check (length(trim(nombre)) >= 3),
  tipo_identificacion       tipo_identificacion not null default 'C.C.',
  -- En crudo, sin puntos: si se guardara «1.045.678.912», buscar «1045» no lo
  -- encontraría. El formato lo pone la UI al pintar (`documento()`).
  identificacion            text not null check (identificacion ~ '^[A-Z0-9]+$'),
  correo                    text check (correo is null or correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Móvil colombiano: 10 dígitos empezando por 3, sin prefijo de país.
  telefono                  text check (telefono is null or telefono ~ '^3\d{9}$'),
  fecha_nacimiento          date,
  eps                       text,

  emergencia_nombre         text,
  emergencia_telefono       text check (emergencia_telefono is null or emergencia_telefono ~ '^3\d{9}$'),

  -- Solo si era menor al darse de alta.
  acudiente_nombre          text,
  acudiente_identificacion  text,
  acudiente_telefono        text check (acudiente_telefono is null or acudiente_telefono ~ '^3\d{9}$'),

  acepta_terminos           boolean not null default false,
  alta                      date not null default current_date,
  ultima_asistencia         date,
  creado_en                 timestamptz not null default now(),

  -- Dos personas no pueden compartir documento; distintos tipos sí pueden
  -- repetir número (una C.C. y un pasaporte podrían coincidir en dígitos).
  unique (tipo_identificacion, identificacion)
);

-- La búsqueda del listado va por nombre o por documento.
create index clientes_identificacion_idx on clientes (identificacion);
create index clientes_nombre_idx on clientes using gin (to_tsvector('spanish', nombre));


-- Membresías -----------------------------------------------------------------

create table membresias (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes (id) on delete cascade,
  -- `restrict`: un plan con membresías no se borra. La pantalla de Planes ya
  -- avisa de cuántos clientes lo tienen y sugiere marcarlo «no se vende».
  plan_id      uuid not null references planes (id) on delete restrict,
  inicio       date not null,
  vencimiento  date not null,
  -- Se copia del plan al contratar, NO se lee de `planes` al consultar: si
  -- mañana sube el precio, lo que esta persona pagó no puede cambiar solo.
  importe      integer not null check (importe > 0),
  creado_en    timestamptz not null default now(),
  check (vencimiento >= inicio)
);

create index membresias_cliente_idx on membresias (cliente_id, vencimiento desc);


-- Pagos ----------------------------------------------------------------------

create table pagos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes (id) on delete restrict,
  membresia_id  uuid references membresias (id) on delete set null,
  metodo        metodo_pago not null,
  fecha         date not null,
  importe       integer not null check (importe > 0),
  creado_en     timestamptz not null default now()
);

comment on table pagos is
  'El libro de movimientos. ⚠️ Aquí el pago es el HECHO y el vencimiento se calcula a partir de él; en el mock era al revés (los pagos se derivaban de los clientes) y por eso salían fechas en el futuro.';

-- ⚠️ La regla «un pago no puede ser futuro» NO va en un CHECK: Postgres exige
-- que las funciones de un CHECK sean IMMUTABLE y `current_date` no lo es
-- (cambia cada día). Va en un trigger, más abajo.

create index pagos_fecha_idx on pagos (fecha desc);
create index pagos_cliente_idx on pagos (cliente_id);


-- Equipo ---------------------------------------------------------------------

create table equipo (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null check (length(trim(nombre)) >= 3),
  correo         text not null unique,
  telefono       text check (telefono is null or telefono ~ '^3\d{9}$'),
  rol            rol_equipo not null,
  clases_semana  integer not null default 0 check (clases_semana >= 0),
  activo         boolean not null default true,
  alta           date not null default current_date
);


-- Gastos y presupuesto -------------------------------------------------------

create table gastos (
  id                uuid primary key default gen_random_uuid(),
  categoria         categoria_gasto not null,
  concepto          text not null check (length(trim(concepto)) >= 3),
  importe           integer not null check (importe > 0),
  fecha             date not null,
  metodo            metodo_pago not null,
  -- Ruta dentro del bucket de Storage, no una URL: las URL firmadas caducan.
  comprobante_path  text,
  registrado_por    uuid references auth.users (id) on delete set null,
  creado_en         timestamptz not null default now()
);

create index gastos_fecha_idx on gastos (fecha desc);

create table presupuestos (
  categoria  categoria_gasto not null,
  -- Primer día del mes al que aplica.
  mes        date not null,
  importe    integer not null check (importe >= 0),
  primary key (categoria, mes),
  check (extract(day from mes) = 1)
);

comment on table presupuestos is
  'Presupuesto por categoría y mes. En el mock era una columna dentro de GASTOS, lo que impedía tener presupuesto de un mes sin gastos y obligaba a repetirlo en cada fila.';


-- Estado de la membresía: se calcula, no se guarda ---------------------------

create or replace function estado_de_membresia(
  p_vencimiento       date,
  p_ultima_asistencia date,
  p_hoy               date default current_date
)
returns estado_membresia
language sql
-- STABLE y no IMMUTABLE: el valor por defecto de `p_hoy` es `current_date`,
-- que cambia entre días. Basta STABLE porque solo se usa en vistas, no en
-- índices.
stable
as $$
  select case
    -- El orden ES la definición, y hay un caso que se decide aquí: alguien que
    -- vence en 10 días y lleva 60 sin venir sale «Por vencer», no «Inactiva».
    -- Se prioriza lo accionable —hay que llamarle para que renueve— sobre el
    -- diagnóstico. Cambiar este orden cambia las cifras del dashboard.
    when p_vencimiento < p_hoy
      then 'Vencida'::estado_membresia
    when p_vencimiento <= p_hoy + 15
      then 'Por vencer'::estado_membresia
    when p_ultima_asistencia is null or p_ultima_asistencia < p_hoy - 30
      then 'Inactiva'::estado_membresia
    else 'Activa'::estado_membresia
  end
$$;


-- Vista que devuelve la forma que espera la UI -------------------------------
-- `getClientes()` consumirá esto tal cual: cliente + su membresía vigente +
-- el estado calculado.

create or replace view clientes_vigentes as
select
  c.id,
  c.nombre,
  c.tipo_identificacion,
  c.identificacion,
  c.correo,
  c.telefono,
  c.alta,
  c.ultima_asistencia,
  p.nombre                                              as plan,
  m.vencimiento,
  m.importe                                             as importe_renovacion,
  estado_de_membresia(m.vencimiento, c.ultima_asistencia) as estado
from clientes c
-- `left join lateral` y no un join normal: se quiere UNA membresía por
-- cliente, la más reciente. Con un join normal saldría una fila por cada
-- renovación histórica y el listado contaría de más.
left join lateral (
  select *
  from membresias
  where cliente_id = c.id
  order by vencimiento desc
  limit 1
) m on true
left join planes p on p.id = m.plan_id;


-- Triggers -------------------------------------------------------------------

-- `actualizado_en` al vuelo, para el histórico de cambios de precio.
create or replace function tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger planes_actualizado_en
  before update on planes
  for each row execute function tocar_actualizado_en();

-- Un cobro no puede estar por delante de hoy. Va aquí y no en un CHECK por lo
-- explicado arriba (`current_date` no es IMMUTABLE).
create or replace function pago_no_futuro()
returns trigger language plpgsql as $$
begin
  if new.fecha > current_date then
    raise exception 'La fecha del pago (%) es posterior a hoy (%)', new.fecha, current_date;
  end if;
  return new;
end $$;

create trigger pagos_no_futuros
  before insert or update on pagos
  for each row execute function pago_no_futuro();

-- Lo mismo para los gastos: un gasto es un hecho ya ocurrido, y el formulario
-- ya lo impide poniendo `max` en el calendario. Esto lo garantiza aunque la
-- escritura no venga del formulario.
create trigger gastos_no_futuros
  before insert or update on gastos
  for each row execute function pago_no_futuro();
