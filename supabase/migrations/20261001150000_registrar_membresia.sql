-- =============================================================================
-- Asignar un plan a un cliente y cobrarlo, en UNA transacción.
--
-- ⚠️ Es una función y no dos `insert` desde la app porque son dos filas que
-- solo tienen sentido juntas: la membresía (qué se contrató y hasta cuándo) y
-- el pago (que se cobró). Con dos llamadas, si la segunda fallara quedaría una
-- membresía vigente que nadie pagó, o un pago sin nada que lo justifique. Una
-- función de Postgres es atómica: o entran las dos o ninguna.
--
-- `security invoker` (el valor por defecto, se escribe para que se vea): corre
-- con los permisos de quien llama, así que RLS sigue mandando — solo el
-- mostrador (Administración y Recepción) puede insertar membresías y pagos.
-- =============================================================================

create or replace function registrar_membresia(
  p_cliente uuid,
  p_plan    uuid,
  p_metodo  metodo_pago
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan        planes%rowtype;
  v_ultimo      date;
  v_inicio      date;
  v_membresia   uuid;
begin
  select * into v_plan from planes where id = p_plan;
  if not found then
    raise exception 'El plan no existe.' using errcode = 'P0002';
  end if;
  -- Un plan retirado lo conserva quien ya lo tiene, pero no se vende ni se
  -- renueva: es lo que significa «no se vende».
  if not v_plan.se_vende then
    raise exception 'Ese plan ya no se vende.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from clientes where id = p_cliente) then
    raise exception 'El cliente no existe.' using errcode = 'P0002';
  end if;

  -- ⚠️ Renovar antes de tiempo NO pisa los días que ya pagó: la membresía
  -- nueva empieza el día después de que acabe la actual. Si ya venció (o no
  -- tenía ninguna), empieza hoy.
  select max(vencimiento) into v_ultimo from membresias where cliente_id = p_cliente;
  v_inicio := greatest(current_date, coalesce(v_ultimo + 1, current_date));

  -- Misma convención que la semilla: vence `vigencia_dias` después del inicio.
  -- El importe se COPIA del plan: si mañana sube el precio, lo que esta
  -- persona pagó no cambia.
  insert into membresias (cliente_id, plan_id, inicio, vencimiento, importe)
  values (p_cliente, p_plan, v_inicio, v_inicio + v_plan.vigencia_dias, v_plan.precio)
  returning id into v_membresia;

  -- El pago es de HOY aunque la membresía empiece más adelante: es cuándo
  -- entró el dinero, que es lo que lee el libro de Finanzas.
  insert into pagos (cliente_id, membresia_id, metodo, fecha, importe)
  values (p_cliente, v_membresia, p_metodo, current_date, v_plan.precio);

  return v_membresia;
end $$;

-- Mismo criterio que el resto de funciones (`20260727130100`): fuera de
-- PUBLIC, y solo para quien ha iniciado sesión. RLS decide el resto.
-- ⚠️ Y fuera de `anon` POR NOMBRE: Supabase concede EXECUTE a `anon` y a
-- `authenticated` directamente en cada función nueva del esquema `public`
-- (privilegios por defecto), así que revocar a PUBLIC no se lo quita.
-- Verificado con `has_function_privilege('anon', …)`.
revoke execute on function registrar_membresia(uuid, uuid, metodo_pago) from public;
revoke execute on function registrar_membresia(uuid, uuid, metodo_pago) from anon;
grant execute on function registrar_membresia(uuid, uuid, metodo_pago) to authenticated;


-- =============================================================================
-- «Inactiva» se cuenta desde la última asistencia O desde que pagó.
--
-- ⚠️ No existe todavía el registro de asistencias, así que la última
-- asistencia de un cliente nuevo está vacía. Con la regla anterior, todo el
-- que acababa de pagar salía «Inactiva» el primer día. Ahora los 30 días sin
-- venir empiezan a contar desde lo más reciente de las dos fechas
-- (`greatest` ignora los NULL). Cambia el estado de un cliente de ejemplo,
-- que pagó después de su última visita.
--
-- `security_invoker = on` explícito, como en `20261001140100`: recrear la
-- vista sin él la abriría a la clave anónima.
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
    else estado_de_membresia(m.vencimiento, greatest(c.ultima_asistencia, m.inicio))
  end                                                   as estado
from clientes c
left join lateral (
  select *
  from membresias
  where cliente_id = c.id
  order by vencimiento desc
  limit 1
) m on true
left join planes p on p.id = m.plan_id;
