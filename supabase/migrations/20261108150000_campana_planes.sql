-- =============================================================================
-- Campañas: qué planes entran en la promoción (nov 2026).
--
-- Pedido del estudio: que el plan de una clase (y los que se elijan) NO entre
-- en la campaña de apertura. Se elige al crear o editar la campaña, por
-- modalidad (Mat · Reformer · Fusión).
--
-- Se guardan las EXCLUSIONES, no las inclusiones: un plan creado después
-- entra solo, como hasta ahora.
--
-- ⚠️ Regla de derecho al descuento (decisión del usuario): comprar un plan
-- excluido NO gasta la «primera membresía». Tiene derecho quien no ha tenido
-- ninguna membresía de un plan que ENTRE en esta campaña: puede probar con la
-- clase suelta y luego inscribirse con el descuento.
-- =============================================================================

-- 1. Los planes que no entran en cada campaña ----------------------------------
create table campana_planes_excluidos (
  campana_id uuid not null references campanas (id) on delete cascade,
  plan_id    uuid not null references planes (id) on delete cascade,
  primary key (campana_id, plan_id)
);

alter table campana_planes_excluidos enable row level security;

create policy "excluidos: lectura del personal" on campana_planes_excluidos
  for select using (tiene_perfil());
create policy "excluidos: administración crea" on campana_planes_excluidos
  for insert with check (es_admin());
create policy "excluidos: administración borra" on campana_planes_excluidos
  for delete using (es_admin());


-- 2. El estado de la campaña, ahora con los planes que no entran ---------------
-- Solo ids: lo pide también la web pública (sin datos de nadie). Cambia la
-- tabla de salida, así que hay que borrarla y crearla de nuevo.
drop function estado_campana(date);

create function estado_campana(p_fecha date default current_date)
returns table (
  campana_id         uuid,
  nombre             text,
  desde              date,
  hasta              date,
  inicio_membresias  date,
  vendidas           integer,
  meta               integer,
  tramo_orden        integer,
  tramo_pct          integer,
  quedan_en_tramo    integer,
  planes_excluidos   uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select * from campanas where p_fecha between desde and hasta and not cerrada
  ),
  v as (
    select count(*)::integer as n from membresias m, c where m.campana_id = c.id
  ),
  t as (
    select tr.orden, tr.descuento_pct,
           (sum(tr.cupos) over (order by tr.orden))::integer as acumulado
    from campana_tramos tr, c
    where tr.campana_id = c.id
  ),
  actual as (
    select t.* from t, v where t.acumulado > v.n order by t.orden limit 1
  )
  select c.id, c.nombre, c.desde, c.hasta, c.inicio_membresias,
         v.n,
         coalesce((select max(acumulado) from t), 0),
         a.orden, a.descuento_pct, a.acumulado - v.n,
         coalesce(
           (select array_agg(e.plan_id order by e.plan_id)
              from campana_planes_excluidos e where e.campana_id = c.id),
           '{}'::uuid[])
  from c
  cross join v
  left join actual a on true
$$;

revoke execute on function estado_campana(date) from public, anon, authenticated;
grant execute on function estado_campana(date) to anon, authenticated;


-- 3. Cobrar: la campaña solo en los planes que entran --------------------------
-- La misma función de `20261107120000_campana_apertura` con dos cambios:
--   · un plan excluido se cobra a su precio de siempre y no gasta cupo;
--   · el derecho es «ninguna membresía de un plan que entre», no «ninguna».
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
  v_precio      integer;
  v_ultimo      date;
  v_inicio      date;
  v_membresia   uuid;
  v_campana     uuid;
  v_inicio_c    date;
  v_excluidos   uuid[];
  v_pct         integer;
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

  select e.campana_id, e.inicio_membresias, e.planes_excluidos
    into v_campana, v_inicio_c, v_excluidos
    from estado_campana(current_date) e;

  if v_campana is not null
     -- El plan entra en la campaña…
     and not (p_plan = any (v_excluidos))
     -- …y el cliente no ha tenido nunca un plan que entre en ella.
     and not exists (
       select 1 from membresias m
        where m.cliente_id = p_cliente and not (m.plan_id = any (v_excluidos))
     ) then
    perform pg_advisory_xact_lock(hashtextextended(v_campana::text, 0));
    -- Se vuelve a leer DESPUÉS del candado: lo de antes pudo cambiar.
    select e.tramo_pct into v_pct from estado_campana(current_date) e;
    if v_pct is not null then
      -- Sobre el precio de lista: no se suma al descuento propio del plan.
      v_precio := round(v_plan.precio * (100 - v_pct) / 100.0)::integer;
    end if;
  end if;

  select max(vencimiento) into v_ultimo from membresias where cliente_id = p_cliente;
  v_inicio := greatest(current_date, coalesce(v_ultimo + 1, current_date));
  if v_pct is not null and v_inicio_c is not null then
    v_inicio := greatest(v_inicio, v_inicio_c);
  end if;

  insert into membresias (cliente_id, plan_id, inicio, vencimiento, importe,
                          clases_reformer, clases_mat, campana_id, campana_pct)
  values (p_cliente, p_plan, v_inicio, v_inicio + v_plan.vigencia_dias, v_precio,
          v_plan.clases_reformer, v_plan.clases_mat,
          case when v_pct is not null then v_campana end, v_pct)
  returning id into v_membresia;

  -- El plan entero, hoy. (`pagos.importe` es > 0: un plan gratis no lleva pago.)
  if v_precio > 0 then
    insert into pagos (cliente_id, membresia_id, metodo, fecha, importe)
    values (p_cliente, v_membresia, p_metodo, current_date, v_precio);
  end if;

  return v_membresia;
end $$;

revoke execute on function registrar_membresia(uuid, uuid, metodo_pago) from public, anon;
grant execute on function registrar_membresia(uuid, uuid, metodo_pago) to authenticated;


-- 4. Guardar una campaña con sus tramos y sus exclusiones ----------------------
-- Todo en UNA transacción, como antes. `p_excluidos` con default: una llamada
-- de 6 argumentos sigue valiendo (sin exclusiones).
drop function guardar_campana(uuid, text, date, date, date, jsonb);

create function guardar_campana(
  p_id        uuid,
  p_nombre    text,
  p_desde     date,
  p_hasta     date,
  p_inicio    date,
  p_tramos    jsonb,   -- [{"cupos": 20, "pct": 15}, …] en orden
  p_excluidos uuid[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id  uuid;
  v_n   integer;
begin
  if not coalesce(es_admin(), false) then
    raise exception 'Solo Administración gestiona las campañas.' using errcode = '42501';
  end if;
  v_n := jsonb_array_length(coalesce(p_tramos, '[]'::jsonb));
  if v_n < 1 or v_n > 10 then
    raise exception 'La campaña necesita de 1 a 10 tramos.' using errcode = 'P0001';
  end if;
  -- Al menos un plan a la venta tiene que entrar: si no, no descuenta nada.
  if not exists (
    select 1 from planes
     where se_vende and not (id = any (coalesce(p_excluidos, '{}'::uuid[])))
  ) then
    raise exception 'Marca al menos un plan que entre en la campaña.' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into campanas (nombre, desde, hasta, inicio_membresias)
    values (trim(p_nombre), p_desde, p_hasta, p_inicio)
    returning id into v_id;
  else
    update campanas
       set nombre = trim(p_nombre), desde = p_desde, hasta = p_hasta, inicio_membresias = p_inicio
     where id = p_id and not cerrada
    returning id into v_id;
    if v_id is null then
      raise exception 'Esa campaña ya no existe o ya terminó.' using errcode = 'P0002';
    end if;
    delete from campana_tramos where campana_id = v_id;
    delete from campana_planes_excluidos where campana_id = v_id;
  end if;

  insert into campana_tramos (campana_id, orden, cupos, descuento_pct)
  select v_id, t.orden::integer, (t.tramo ->> 'cupos')::integer, (t.tramo ->> 'pct')::integer
  from jsonb_array_elements(p_tramos) with ordinality as t (tramo, orden);

  -- Solo planes que existen (un id inventado no se guarda).
  insert into campana_planes_excluidos (campana_id, plan_id)
  select v_id, p.id from planes p where p.id = any (coalesce(p_excluidos, '{}'::uuid[]));

  return v_id;
end $$;

revoke execute on function guardar_campana(uuid, text, date, date, date, jsonb, uuid[]) from public, anon;
grant execute on function guardar_campana(uuid, text, date, date, date, jsonb, uuid[]) to authenticated;
