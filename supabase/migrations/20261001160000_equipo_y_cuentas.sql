-- =============================================================================
-- Une el equipo (quién trabaja en el estudio) con las cuentas (quién entra al
-- panel), para que Administración pueda dar y quitar acceso desde el panel.
--
-- Hasta aquí eran dos mundos sin relación: `equipo` tenía nombre, correo y rol,
-- y `perfiles` tenía el rol de cada cuenta, sin correo y sin saber a qué
-- persona del equipo correspondía. Dar acceso exigía SQL a mano.
--
-- Modelo:
--   · `equipo.cuenta_id` → la cuenta de `auth.users` de esa persona, si tiene.
--   · Tener ACCESO = que esa cuenta tenga fila en `perfiles`. Quitar el acceso
--     borra el perfil pero conserva la cuenta: devolverlo no obliga a crear
--     otra ni a cambiar la contraseña.
-- =============================================================================

alter table equipo
  add column cuenta_id uuid unique references auth.users (id) on delete set null;

comment on column equipo.cuenta_id is
  'Cuenta de acceso de esta persona. NULL = nunca se le dio acceso. Con cuenta pero sin fila en perfiles = acceso retirado.';

-- Enlaza lo que ya existe por correo (sin distinguir mayúsculas).
update equipo e
set cuenta_id = u.id
from auth.users u
where lower(u.email) = lower(e.correo);

-- ⚠️ Quien YA tiene acceso pero no está en el equipo (la cuenta del dueño,
-- creada a mano con SQL) entra en el equipo. Si no, la lista de «quién tiene
-- acceso» del panel no lo enseñaría, y nadie podría gestionarlo desde ahí.
insert into equipo (nombre, correo, rol, cuenta_id)
select p.nombre, u.email, p.rol, p.id
from perfiles p
join auth.users u on u.id = p.id
where not exists (select 1 from equipo e where e.cuenta_id = p.id)
on conflict (correo) do nothing;


-- Cambiar el rol de alguien, en UNA transacción ------------------------------
-- ⚠️ El rol vive en DOS sitios: `equipo.rol` (su puesto) y `perfiles.rol` (lo
-- que RLS le deja hacer). Cambiarlos con dos `update` desde la app podría
-- dejarlos distintos si el segundo fallara: alguien figuraría como Recepción
-- con permisos de Administración. Aquí cambian los dos o ninguno.
--
-- ⚠️ No deja el estudio sin Administración: si el cambio dejaría cero cuentas
-- con ese rol y acceso, se rechaza. Sin eso, un clic podría dejar el panel sin
-- nadie que pueda dar acceso a nadie (y arreglarlo exigiría SQL).

create or replace function cambiar_rol_equipo(p_equipo uuid, p_rol rol_equipo)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cuenta uuid;
  v_rol    rol_equipo;
begin
  select cuenta_id, rol into v_cuenta, v_rol from equipo where id = p_equipo;
  if not found then
    raise exception 'Esa persona no está en el equipo.' using errcode = 'P0002';
  end if;

  if v_rol = 'Administración' and p_rol <> 'Administración' and (
    select count(*) from perfiles where rol = 'Administración' and id is distinct from v_cuenta
  ) = 0 then
    raise exception 'Es la única cuenta de Administración: el estudio se quedaría sin nadie que gestione el panel.' using errcode = 'P0001';
  end if;

  update equipo set rol = p_rol where id = p_equipo;
  if v_cuenta is not null then
    update perfiles set rol = p_rol where id = v_cuenta;
  end if;
end $$;

-- Igual que `registrar_membresia`: fuera de PUBLIC y de `anon` POR NOMBRE
-- (Supabase se lo concede a `anon` directamente en cada función nueva).
revoke execute on function cambiar_rol_equipo(uuid, rol_equipo) from public;
revoke execute on function cambiar_rol_equipo(uuid, rol_equipo) from anon;
grant execute on function cambiar_rol_equipo(uuid, rol_equipo) to authenticated;
