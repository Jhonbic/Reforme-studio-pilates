-- =============================================================================
-- Personal: una sola ficha por persona, con un solo rol.
--
-- Antes había DOS tablas con rol y nada que las uniera:
--   · `perfiles` — quién puede entrar y con qué permisos (lo miraba `mi_rol()`);
--   · `equipo`   — la plantilla del estudio (lo que pinta la pestaña Equipo).
-- Laura podía salir «Administración» en la plantilla y ser «Recepción» al
-- entrar, y marcarla inactiva al irse NO le quitaba el acceso.
--
-- Ahora `equipo` es la ficha y la cuenta de acceso cuelga de ella
-- (`cuenta_id`), opcional: una instructora que solo da clases tiene ficha y no
-- tiene cuenta. El rol vive en un único sitio y `activo` corta el acceso.
--
-- ⚠️ **Arregla además un agujero que se habría abierto al conectar
-- `/registro`.** El trigger `al_crear_usuario` daba 'Recepción' a TODA cuenta
-- nueva, y Recepción lee los clientes: cada clienta que se registrase habría
-- podido leer los datos de las demás. Sin trigger, una cuenta sin ficha no ve
-- nada. El personal se da de alta con `npm run alta-personal`.
-- =============================================================================

alter table equipo
  add column cuenta_id uuid unique references auth.users (id) on delete set null;

comment on column equipo.cuenta_id is
  'Cuenta de acceso a la app. NULL = está en la plantilla pero no entra (p. ej. una instructora que solo da clases). El acceso exige además `activo`.';


-- Migrar las cuentas que ya existan ------------------------------------------
-- Manda el rol de `perfiles`: es el que de verdad concedía permisos.

update equipo e
set cuenta_id = p.id,
    rol       = p.rol
from perfiles p
join auth.users u on u.id = p.id
where lower(e.correo) = lower(u.email)
  and e.cuenta_id is null;

insert into equipo (nombre, correo, rol, cuenta_id)
select
  case when length(trim(p.nombre)) >= 3 then p.nombre else u.email end,
  u.email,
  p.rol,
  p.id
from perfiles p
join auth.users u on u.id = p.id
where not exists (select 1 from equipo e where e.cuenta_id = p.id);


-- El rol sale ahora de la ficha ----------------------------------------------
-- `create or replace` conserva los permisos: sigue siendo `security definer`
-- (lee `equipo` sin caer en su propia policy, que llama a esta función) y sigue
-- concedida solo a `authenticated`.
-- ⚠️ `and activo`: dar de baja a alguien en la plantilla le quita el acceso en
-- la misma sentencia. Antes eran dos gestos, y el segundo se olvidaba.

create or replace function mi_rol()
returns rol_equipo
language sql
stable
security definer
set search_path = public
as $$
  select rol from equipo where cuenta_id = auth.uid() and activo
$$;


-- Fuera lo viejo -------------------------------------------------------------

drop trigger if exists al_crear_usuario on auth.users;
drop function if exists crear_perfil_al_registrarse();
drop table perfiles;
