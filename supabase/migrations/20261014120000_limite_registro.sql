-- Protección del registro contra robots: límite de intentos por conexión.
--
-- `/registro` crea cuentas con la clave `service_role`, que se salta los
-- límites propios de Supabase Auth: sin esto, un script podía crear cuentas
-- (y fichas de cliente) en bucle. Cada intento que pasa la validación deja
-- aquí una fila; el registro cuenta las de la última hora.
--
-- La IP NO se guarda: solo su hash (sha256 con sal), y las filas se borran
-- al día. Basta para contar, no para saber quién es nadie.

create table intentos_registro (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  creado_en  timestamptz not null default now()
);

comment on table intentos_registro is
  'Intentos de registro de la última hora (hash de la IP). Solo la usa el servidor con service_role; sin políticas RLS a propósito.';

create index intentos_registro_ip_idx on intentos_registro (ip_hash, creado_en desc);
create index intentos_registro_fecha_idx on intentos_registro (creado_en);

-- RLS encendido y SIN políticas: ni `anon` ni `authenticated` la leen ni la
-- escriben. `service_role` se salta RLS.
alter table intentos_registro enable row level security;
revoke all on intentos_registro from anon, authenticated;
