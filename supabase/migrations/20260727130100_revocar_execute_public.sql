-- =============================================================================
-- Remata el punto 3 de la migración anterior, que no funcionó.
--
-- ⚠️ Allí se hizo `revoke execute ... from anon, authenticated` y el analizador
-- siguió avisando. El motivo: **Postgres concede `EXECUTE` a `PUBLIC` por
-- defecto** al crear una función. `anon` y `authenticated` no tenían un permiso
-- propio que quitarles — heredaban el de `PUBLIC`, que seguía intacto.
--
-- Hay que revocar a `PUBLIC` y volver a conceder solo a quien deba tenerlo.
-- =============================================================================

-- Funciones de trigger: no las llama nadie a mano. Postgres NO comprueba
-- EXECUTE cuando un trigger se dispara, así que revocarlo del todo no rompe
-- ni el alta de perfiles ni la validación de fechas.
revoke execute on function crear_perfil_al_registrarse() from public;
revoke execute on function tocar_actualizado_en()        from public;
revoke execute on function pago_no_futuro()              from public;

-- Ayudantes de RLS: los usan las políticas, que se evalúan con los permisos del
-- sistema, no con los de quien pregunta. Fuera de la API.
revoke execute on function mi_rol()        from public;
revoke execute on function es_admin()      from public;
revoke execute on function es_mostrador()  from public;
revoke execute on function tiene_perfil()  from public;

-- `mi_rol()` es la excepción: la UI necesita saber el rol de quien ha entrado
-- para decidir qué pinta. Se le devuelve solo a quien ha iniciado sesión —para
-- `anon` devolvería `null` de todas formas, así que no hay nada que exponer.
grant execute on function mi_rol() to authenticated;

-- `estado_de_membresia` sí es de consulta: la vista la usa y no toca permisos
-- ni datos, solo compara fechas. Se queda accesible.
