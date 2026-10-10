-- =============================================================================
-- Estado «De baja» (oct 2026)
--
-- Va solo en su migración: un valor nuevo de un enum no se puede USAR en la
-- misma transacción que lo crea (mismo motivo que `20261001140000`, «Sin
-- plan»). La vista que lo usa va en `20261017120100_dar_de_baja`.
-- =============================================================================

alter type estado_membresia add value if not exists 'De baja';
