-- =============================================================================
-- Destacar un plan como «el más contratado»
--
-- Hasta ahora la pantalla lo DERIVABA del número de clientes de cada plan. Con
-- el catálogo arrancando vacío eso deja de servir: todos los planes valen 0 y el
-- cálculo marcaba a uno arbitrario con el cartel «El más contratado» sin tener
-- ni un solo cliente. Pasa a ser una decisión explícita de quien administra.
-- =============================================================================

alter table planes add column destacado boolean not null default false;

comment on column planes.destacado is
  'Plan resaltado en el catálogo. Como máximo uno: lo garantiza el índice '
  'solo_un_plan_destacado.';


-- ⚠️ Solo puede haber UN plan destacado, y quien lo garantiza es la BASE, no el
-- formulario. Todas las filas marcadas comparten el mismo valor (`true`), así
-- que un índice único sobre ellas admite exactamente una.
--
-- No es redundante con `destacar_plan()`: esa función mantiene la invariante en
-- el uso normal, pero un `PATCH /rest/v1/planes` directo a la API no pasa por
-- ella. Misma doctrina que el resto del esquema — la regla vive en la base.
create unique index solo_un_plan_destacado
  on planes (destacado)
  where destacado;


-- Marca un plan y desmarca el resto EN UNA SOLA SENTENCIA.
--
-- ⚠️ Dos updates separados desde el navegador («desmarca todos» y luego «marca
-- este») no son atómicos: si el segundo falla, el catálogo se queda sin ningún
-- destacado; y entre uno y otro se violaría el índice de arriba. Aquí es una
-- sola sentencia, así que o pasa entera o no pasa.
--
-- ⚠️ `is not distinct from` y no `=`: con `plan_id` a NULL, `id = NULL` daría
-- NULL y la columna es `not null` → error. Con `is not distinct from`, un NULL
-- deja todas las filas en `false`, que es justo lo que hace falta para poder
-- QUITAR el destacado sin tener que marcar otro.
--
-- Se queda `security invoker` (el defecto): el UPDATE de dentro se ejecuta con
-- los permisos de quien llama, así que sigue pasando por la policy
-- «planes: escritura de Administración». Una recepcionista no puede destacar.
create or replace function destacar_plan(plan_id uuid)
returns void
language sql
volatile
set search_path = public
as $$
  update planes set destacado = (id is not distinct from plan_id);
$$;

-- Todo lo que vive en `public` se publica en /rest/v1/rpc/<nombre>, y Postgres
-- concede EXECUTE a PUBLIC al crear la función. Mismo cierre que aplicó
-- 20260727130100_revocar_execute_public.sql al resto.
revoke execute on function destacar_plan(uuid) from public;
grant  execute on function destacar_plan(uuid) to authenticated;
