-- =============================================================================
-- `destacar_plan()` no funcionaba NUNCA. Dos fallos, encontrados al probarla
-- contra la base local (sep 2026):
--
-- 1. **`UPDATE requires a WHERE clause` (21000).** Supabase carga `safeupdate`,
--    que rechaza todo UPDATE sin WHERE — también dentro de una función. La
--    versión anterior era `update planes set destacado = (…)` a secas, así que
--    marcar la casilla «Destacado» fallaba siempre. No se vio porque el catálogo
--    real arranca vacío y nadie había marcado ninguno.
--
-- 2. **El índice único `solo_un_plan_destacado` se comprueba FILA A FILA**, no
--    al final de la sentencia (no es DEFERRABLE, y un índice no puede serlo).
--    En un solo UPDATE, si Postgres recorría antes el plan nuevo que el viejo,
--    habría dos `true` a la vez y fallaría — según el orden físico de las filas,
--    o sea, a veces sí y a veces no.
--
-- Arreglo: dos sentencias, primero desmarcar y luego marcar. Siguen siendo
-- ATÓMICAS: una función corre entera dentro de la transacción de la llamada,
-- así que si la segunda falla la primera se deshace. Lo que la migración
-- original quería evitar eran dos llamadas separadas desde la app, y eso sigue
-- sin pasar.
--
-- `default null`: con `null` el catálogo se queda sin destacado. Además, así el
-- generador de tipos marca el parámetro como opcional; sin default lo tipaba
-- como `string` obligatorio y no dejaba pasar el `null` que la función sí admite.
-- =============================================================================

create or replace function destacar_plan(plan_id uuid default null)
returns void
language sql
volatile
set search_path = public
as $$
  update planes set destacado = false where destacado;
  update planes set destacado = true  where id = plan_id;
$$;
