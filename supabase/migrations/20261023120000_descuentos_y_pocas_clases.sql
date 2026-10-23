-- Descuentos en los planes y aviso de «pocas clases» (23 oct 2026)
--
-- Pedido del estudio en la reunión del 22 oct:
--   1. Poder poner un descuento a un plan y que los clientes lo vean.
--   2. Saber a quién le quedan 1 o 2 clases para avisarle por WhatsApp.


-- 1. Descuentos ---------------------------------------------------------------
-- Un porcentaje y, si se quiere, hasta qué día dura. Sin fecha, dura hasta
-- que se quite. El precio del plan NO cambia: el descuento va aparte para
-- poder enseñar «antes $X» y quitarlo sin tener que recordar el precio.

alter table planes
  add column descuento_pct   integer check (descuento_pct between 1 and 90),
  add column descuento_hasta date,
  -- Una fecha de fin sin porcentaje no significa nada.
  add constraint planes_descuento_con_pct
    check (descuento_hasta is null or descuento_pct is not null);

comment on column planes.descuento_pct is
  'Descuento en % (1–90) sobre `precio`. NULL = sin descuento. Lo cobra registrar_membresia.';
comment on column planes.descuento_hasta is
  'Último día del descuento (incluido). NULL = sin fecha de fin.';

/** Lo que cuesta hoy el plan: el precio con el descuento, si está vigente.
    Redondeado al peso, igual que `precioConDescuento()` en la app. */
create or replace function precio_vigente(p planes)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when p.descuento_pct is not null
     and (p.descuento_hasta is null or p.descuento_hasta >= current_date)
    then round(p.precio * (100 - p.descuento_pct) / 100.0)::integer
    else p.precio
  end
$$;

-- `registrar_membresia` cobra el precio con descuento. La membresía ya copiaba
-- el precio (`importe`): así queda escrito lo que se cobró de verdad, y quitar
-- el descuento mañana no cambia lo que debe nadie. Igual que la versión del
-- paso 6 (`20261013120000_pagos_pendientes`) salvo `v_precio`.
create or replace function registrar_membresia(
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
  v_precio      integer;
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

  v_precio := precio_vigente(v_plan);
  v_abono := coalesce(p_abono, v_precio);
  if v_abono < 0 or v_abono > v_precio then
    raise exception 'Lo que paga hoy tiene que estar entre 0 y el precio del plan.'
      using errcode = 'P0001';
  end if;

  select max(vencimiento) into v_ultimo from membresias where cliente_id = p_cliente;
  v_inicio := greatest(current_date, coalesce(v_ultimo + 1, current_date));

  insert into membresias (cliente_id, plan_id, inicio, vencimiento, importe, clases_reformer, clases_mat)
  values (p_cliente, p_plan, v_inicio, v_inicio + v_plan.vigencia_dias, v_precio,
          v_plan.clases_reformer, v_plan.clases_mat)
  returning id into v_membresia;

  -- `pagos.importe` es > 0: si no paga nada hoy, no hay pago.
  if v_abono > 0 then
    insert into pagos (cliente_id, membresia_id, metodo, fecha, importe)
    values (p_cliente, v_membresia, p_metodo, current_date, v_abono);
  end if;

  return v_membresia;
end $$;


-- 2. Pocas clases -------------------------------------------------------------
-- Clientes con plan vigente HOY a los que les quedan entre 1 y `p_max` clases
-- por reservar (sumando Reformer y Mat). Para la lista del dashboard, con su
-- botón de WhatsApp.
--
-- · Fuera: los de baja, y quien ya tiene otra membresía que empieza después
--   (ya renovó: avisarle sería pedirle que pague dos veces).
-- · Con 0 no sale: eso ya no es «le quedan pocas», es que se acabó, y lo cubre
--   «Por vencer» / «Recuperables».
-- · `security definer` porque `clases_usadas` está cerrada a todos; el filtro
--   `tiene_perfil()` deja fuera a quien no es del equipo (devuelve vacío).

create or replace function clientes_pocas_clases(p_max integer default 2)
returns table (
  cliente_id       uuid,
  nombre           text,
  telefono         text,
  plan             text,
  vencimiento      date,
  quedan_reformer  integer,
  quedan_mat       integer
)
language sql
stable
security definer
set search_path = public
as $$
  with vigentes as (
    select m.cliente_id,
           p.nombre as plan,
           m.vencimiento,
           greatest(m.clases_reformer - clases_usadas(m.id, 'Reformer'), 0) as qr,
           greatest(m.clases_mat      - clases_usadas(m.id, 'Mat'), 0)      as qm
    from membresias m
    join planes p on p.id = m.plan_id
    where current_date between m.inicio and m.vencimiento
  )
  select c.id, c.nombre, c.telefono, v.plan, v.vencimiento, v.qr, v.qm
  from vigentes v
  join clientes c on c.id = v.cliente_id
  where coalesce(tiene_perfil(), false)
    and c.baja is null
    and v.qr + v.qm between 1 and p_max
    and not exists (
      select 1 from membresias f
      where f.cliente_id = c.id and f.inicio > current_date
    )
  order by v.qr + v.qm, c.nombre
$$;

revoke execute on function clientes_pocas_clases(integer) from public, anon;
grant execute on function clientes_pocas_clases(integer) to authenticated;
