-- =============================================================================
-- Nuevo estado de membresía: «Sin plan».
--
-- El alta de cliente NO pregunta por el plan (decisión del usuario: se asigna
-- después). Un cliente recién dado de alta no tiene ninguna membresía, y
-- `estado_de_membresia(null, …)` lo daba por «Activa» o «Inactiva», según
-- hubiera venido o no: las dos falsas. «Sin plan» es lo que pasa de verdad, y
-- a recepción le sirve como lista de a quién falta asignarle uno.
--
-- ⚠️ Va SOLO en esta migración: un valor añadido a un enum no se puede usar en
-- la misma transacción en que se crea. La vista que lo usa va en la siguiente.
-- =============================================================================

alter type estado_membresia add value if not exists 'Sin plan';
