-- =============================================================================
-- `clientes_vigentes` dice «Sin plan» cuando el cliente no tiene membresía.
--
-- Mismo SELECT que la migración del esquema, salvo el CASE del estado. Sin
-- membresía, plan / vencimiento / importe ya salían NULL por el `left join`;
-- solo el estado mentía.
--
-- ⚠️ `with (security_invoker = on)` se repite AQUÍ, no se da por heredado.
-- Sin esa opción la vista se ejecuta con los permisos de quien la creó (el
-- superusuario) y devuelve todos los clientes a cualquiera, incluida la clave
-- anónima pública. Es el fallo que cerró `20260727130000`: recrear la vista
-- no puede volver a abrirlo.
-- =============================================================================

create or replace view clientes_vigentes
with (security_invoker = on) as
select
  c.id,
  c.nombre,
  c.tipo_identificacion,
  c.identificacion,
  c.correo,
  c.telefono,
  c.alta,
  c.ultima_asistencia,
  p.nombre                                              as plan,
  m.vencimiento,
  m.importe                                             as importe_renovacion,
  case
    when m.id is null then 'Sin plan'::estado_membresia
    else estado_de_membresia(m.vencimiento, c.ultima_asistencia)
  end                                                   as estado
from clientes c
-- `left join lateral`: UNA membresía por cliente, la más reciente.
left join lateral (
  select *
  from membresias
  where cliente_id = c.id
  order by vencimiento desc
  limit 1
) m on true
left join planes p on p.id = m.plan_id;
