-- =============================================================================
-- Cierra tres agujeros que encontró `supabase db advisors --type security`
-- después de aplicar el esquema. El primero era serio.
-- =============================================================================

-- 1. LA VISTA SE SALTABA RLS  (severidad: ERROR)
--
-- En Postgres, una vista se ejecuta por defecto con los permisos de QUIEN LA
-- CREÓ, no de quien la consulta. Como `clientes_vigentes` la creó el superusuario
-- de la migración, devolvía las 118 filas a cualquiera — incluido el rol `anon`,
-- que es el de la clave pública que viaja en el navegador.
--
-- Verificado antes del arreglo:
--   select count(*) from clientes           con rol anon →   0  ✅ (RLS aplicaba)
--   select count(*) from clientes_vigentes  con rol anon → 118  ❌ (se lo saltaba)
--
-- Es decir: nombre, cédula, teléfono y correo de todos los clientes eran
-- legibles sin autenticarse. `security_invoker` hace que la vista use los
-- permisos y las políticas de quien pregunta, que es lo que se pretendía.
alter view clientes_vigentes set (security_invoker = on);


-- 2. FUNCIONES CON search_path MUTABLE  (severidad: WARN)
--
-- Sin `search_path` fijo, quien pueda crear objetos en un esquema que preceda a
-- `public` puede sombrear una tabla o un operador y hacer que la función use el
-- suyo. En las `security definer` es escalada de privilegios directa; en el
-- resto es igualmente una vía que no hay razón para dejar abierta.
--
-- `mi_rol` y `crear_perfil_al_registrarse` ya lo tenían desde el principio.
alter function tocar_actualizado_en()                     set search_path = public;
alter function pago_no_futuro()                           set search_path = public;
alter function estado_de_membresia(date, date, date)      set search_path = public;
alter function es_admin()                                 set search_path = public;
alter function es_mostrador()                             set search_path = public;
alter function tiene_perfil()                             set search_path = public;


-- 3. FUNCIONES INTERNAS EXPUESTAS EN LA API REST  (severidad: WARN)
--
-- Todo lo que vive en `public` queda publicado como endpoint en
-- `/rest/v1/rpc/<nombre>`. `crear_perfil_al_registrarse` es una función de
-- trigger: nadie debería poder llamarla a mano, y menos siendo `security
-- definer` (se ejecuta con permisos de su creador).
--
-- Revocar EXECUTE no rompe los triggers: Postgres no comprueba ese permiso
-- cuando un trigger se dispara, solo cuando alguien invoca la función.
revoke execute on function crear_perfil_al_registrarse() from anon, authenticated;
revoke execute on function tocar_actualizado_en()        from anon, authenticated;
revoke execute on function pago_no_futuro()              from anon, authenticated;

-- `mi_rol()` sí puede llamarla quien ha iniciado sesión —devuelve su propio rol
-- y la UI lo necesita— pero no tiene ningún sentido para el rol anónimo.
revoke execute on function mi_rol() from anon;
