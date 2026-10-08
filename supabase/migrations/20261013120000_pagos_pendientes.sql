-- Paso 6 de la lista del estudio: dashboard con meta de clientes, ingresos del
-- mes y PAGOS PENDIENTES.
--
-- Hasta aquí todo plan se cobraba entero al asignarlo, así que «pendiente» no
-- podía existir. Ahora una membresía puede quedar debiendo: lo que se debe es
-- su `importe` menos la suma de sus `pagos`. No se guarda en ninguna columna:
-- se deriva, igual que el estado de una membresía, y así no puede descuadrar.


-- Meta de clientes -----------------------------------------------------------

alter table ajustes
  add column meta_clientes integer not null default 60
    check (meta_clientes between 1 and 10000);

comment on column ajustes.meta_clientes is
  'Clientes activos (membresía vigente) a los que aspira el estudio. El dashboard enseña cuántos hay y cuántos faltan.';


-- Un pago no puede pasarse de lo que se debe ---------------------------------
-- Con abonos, dos cobros a la vez (dos recepcionistas) podrían cobrar dos veces
-- el resto. Se bloquea la membresía mientras se suma.
-- `security definer`: bloquear con `for update` pide permiso de UPDATE sobre
-- `membresias`, que Recepción no tiene (y no debe tener).

create or replace function pagos_no_superan_membresia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_importe integer;
  v_pagado  integer;
begin
  if new.membresia_id is null then
    return new;
  end if;
  select importe into v_importe from membresias where id = new.membresia_id for update;
  select coalesce(sum(importe), 0) into v_pagado
    from pagos
    where membresia_id = new.membresia_id
      and id is distinct from new.id;
  if v_pagado + new.importe > v_importe then
    raise exception 'El pago supera lo que falta por cobrar (%).', v_importe - v_pagado
      using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke execute on function pagos_no_superan_membresia() from public, anon, authenticated;

create trigger pagos_no_superan_membresia
  before insert or update of importe, membresia_id on pagos
  for each row execute function pagos_no_superan_membresia();


-- Asignar plan con abono -----------------------------------------------------
-- `p_abono`: lo que paga hoy. NULL = todo (lo de siempre); 0 = nada todavía.
-- Se borra la versión de 3 argumentos: con un 4º con valor por defecto, una
-- llamada con 3 sería ambigua entre las dos.

drop function registrar_membresia(uuid, uuid, metodo_pago);

create function registrar_membresia(
  p_cliente uuid,
  p_plan    uuid,
  p_metodo  metodo_pago,
  p_abono   integer default null
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
  v_abono       integer;
begin
  select * into v_plan from planes where id = p_plan;
  if not found then
    raise exception 'El plan no existe.' using errcode = 'P0002';
  end if;
  if not v_plan.se_vende then
    raise exception 'Ese plan ya no se vende.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from clientes where id = p_cliente) then
    raise exception 'El cliente no existe.' using errcode = 'P0002';
  end if;

  v_abono := coalesce(p_abono, v_plan.precio);
  if v_abono < 0 or v_abono > v_plan.precio then
    raise exception 'Lo que paga hoy tiene que estar entre 0 y el precio del plan.'
      using errcode = 'P0001';
  end if;

  select max(vencimiento) into v_ultimo from membresias where cliente_id = p_cliente;
  v_inicio := greatest(current_date, coalesce(v_ultimo + 1, current_date));

  insert into membresias (cliente_id, plan_id, inicio, vencimiento, importe, clases_reformer, clases_mat)
  values (p_cliente, p_plan, v_inicio, v_inicio + v_plan.vigencia_dias, v_plan.precio,
          v_plan.clases_reformer, v_plan.clases_mat)
  returning id into v_membresia;

  -- `pagos.importe` es > 0: si no paga nada hoy, no hay pago.
  if v_abono > 0 then
    insert into pagos (cliente_id, membresia_id, metodo, fecha, importe)
    values (p_cliente, v_membresia, p_metodo, current_date, v_abono);
  end if;

  return v_membresia;
end $$;

revoke execute on function registrar_membresia(uuid, uuid, metodo_pago, integer) from public;
revoke execute on function registrar_membresia(uuid, uuid, metodo_pago, integer) from anon;
grant execute on function registrar_membresia(uuid, uuid, metodo_pago, integer) to authenticated;


-- Lo que se debe ------------------------------------------------------------
-- Una fila por membresía con algo pendiente. `security_invoker`: quien no lee
-- `pagos` (Instructora) no ve nada en vez de verlo todo como deuda.

create view membresias_pendientes
with (security_invoker = on) as
select
  m.id           as membresia_id,
  m.cliente_id,
  c.nombre,
  c.telefono,
  p.nombre       as plan,
  m.inicio,
  m.vencimiento,
  m.importe,
  coalesce(sum(g.importe), 0)::integer                 as pagado,
  (m.importe - coalesce(sum(g.importe), 0))::integer   as pendiente
from membresias m
join clientes c on c.id = m.cliente_id
join planes p on p.id = m.plan_id
left join pagos g on g.membresia_id = m.id
group by m.id, c.id, p.id
having m.importe > coalesce(sum(g.importe), 0)
   -- Solo si quien mira puede leer los pagos: sin ellos, todo saldría a deber.
   and coalesce(es_mostrador(), false);

revoke all on membresias_pendientes from anon;
grant select on membresias_pendientes to authenticated;
