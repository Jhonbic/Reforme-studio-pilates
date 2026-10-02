-- =============================================================================
-- Crear una cuenta ya NO da acceso al panel.
--
-- ⚠️ El trigger `al_crear_usuario` daba perfil de 'Recepción' a TODA cuenta
-- nueva. Supabase deja registrarse con la clave anónima, que es pública (viaja
-- en el navegador), así que cualquiera podía crearse una cuenta por la API —sin
-- pasar por la web— y leer nombre, cédula y teléfono de todos los clientes.
--
-- Se decidió esto y no desactivar el registro porque los CLIENTES van a
-- registrarse (`/registro`, CTA «Reservar mi clase»). Su cuenta existirá en
-- `auth.users`, pero sin fila en `perfiles` RLS no les da nada del estudio.
--
-- Desde aquí, el perfil (= el acceso al panel) lo da Administración: hoy a mano
-- con SQL, mañana desde la pantalla de Equipo. La política
-- "perfiles: solo Administración gestiona" ya lo permite.
-- =============================================================================

drop trigger if exists al_crear_usuario on auth.users;
drop function if exists crear_perfil_al_registrarse();

-- Perfiles que creó el trigger y que nadie ha revisado: en un proyecto con
-- datos reales habría que mirarlos uno a uno. Aquí no se borran a ciegas — un
-- DELETE automático podría quitarle el acceso al único administrador.
