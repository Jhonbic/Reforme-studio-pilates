-- Campaña de apertura con descuento por tramos (7 nov 2026)
--
-- Pedido del estudio: «Preinscripciones de apertura», siete días, y el
-- descuento baja a medida que se venden membresías:
--   primeras 20 → 15 % · siguientes 25 → 10 % · siguientes 35 → 5 % (meta 80).
--
-- Reglas (decisión del usuario):
--   · Solo cuenta la PRIMERA membresía de cada cliente (quien ya tuvo un plan,
--     o renueva, paga precio normal).
--   · El plan se paga SIEMPRE entero, con campaña o sin ella (decisión del
--     usuario, 7 nov 2026): `registrar_membresia` deja de aceptar abonos
--     (adiós a «Una parte» y «Nada todavía» del paso 6). Así toda membresía
--     de la campaña está pagada y el contador es un simple COUNT. Las deudas
--     que quedaran de antes se siguen cobrando (`membresias_pendientes`).
--   · Los descuentos NO se suman: si entra en la campaña, se aplica el tramo
--     sobre el precio de lista y se ignora el descuento propio del plan.
--   · Opcional: `inicio_membresias`, por si se decide que los 30 días cuentan
--     desde el día de apertura. NULL = desde el día del pago, como siempre.
--   · La meta de la campaña (la suma de cupos) va aparte de
--     `ajustes.meta_clientes`.


-- 1. Tablas --------------------------------------------------------------------

create table campanas (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (length(trim(nombre)) between 3 and 80),
  desde              date not null,
  hasta              date not null,
  inicio_membresias  date,
  -- «Terminar ahora»: deja de aplicarse y de ocupar sus fechas. Es una
  -- marca y no un cambio de fechas: una campaña que empezó HOY no tiene un
  -- «ayer» al que llevar su último día sin pisar a la anterior.
  cerrada            boolean not null default false,
  creada_en          timestamptz not null default now(),
  constraint campanas_fechas check (hasta >= desde),
  constraint campanas_inicio check (inicio_membresias is null or inicio_membresias >= desde),
  -- Dos campañas VIVAS a la vez no tienen sentido: ¿qué tramo se aplicaría?
  -- Las cerradas no cuentan: se puede terminar una y abrir otra el mismo día.
  constraint campanas_sin_solapes
    exclude using gist (daterange(desde, hasta, '[]') with &&) where (not cerrada)
);

comment on table campanas is
  'Promociones con descuento por tramos de ventas (p. ej. la apertura). La aplica registrar_membresia.';
comment on column campanas.inicio_membresias is
  'Si se rellena, las membresías de la campaña empiezan ese día (no antes de hoy). NULL = el día del pago.';

create table campana_tramos (
  campana_id     uuid not null references campanas (id) on delete cascade,
  orden          integer not null check (orden between 1 and 20),
  cupos          integer not null check (cupos between 1 and 10000),
  descuento_pct  integer not null check (descuento_pct between 1 and 90),
  primary key (campana_id, orden)
);

comment on table campana_tramos is
  'Tramos de una campaña, en orden: los `cupos` primeros llevan `descuento_pct`, luego el siguiente tramo.';

alter table membresias
  add column campana_id    uuid references campanas (id) on delete restrict,
  add column campana_pct   integer check (campana_pct between 1 and 90),
  add constraint membresias_campana_con_pct
    check ((campana_id is null) = (campana_pct is null));

comment on column membresias.campana_id is
  'Campaña con la que se vendió (NULL = precio normal). Es lo que cuenta los cupos.';
comment on column membresias.campana_pct is
  'Descuento del tramo que se le aplicó. Se guarda aparte: cambiar la campaña luego no reescribe la historia.';

-- Un cliente ocupa como mucho un cupo por campaña.
create unique index membresias_un_cupo_por_cliente
  on membresias (campana_id, cliente_id) where campana_id is not null;


-- 2. Permisos ------------------------------------------------------------------
-- La campaña no tiene nada privado: el personal la lee y Administración la
-- monta. El público solo ve cifras, a través de `estado_campana()`.

alter table campanas enable row level security;
alter table campana_tramos enable row level security;

create policy "campanas: lectura del personal" on campanas for select using (tiene_perfil());
create policy "campanas: administración crea" on campanas for insert with check (es_admin());
create policy "campanas: administración edita" on campanas for update using (es_admin()) with check (es_admin());
create policy "campanas: administración borra" on campanas for delete using (es_admin());

create policy "tramos: lectura del personal" on campana_tramos for select using (tiene_perfil());
create policy "tramos: administración crea" on campana_tramos for insert with check (es_admin());
create policy "tramos: administración edita" on campana_tramos for update using (es_admin()) with check (es_admin());
create policy "tramos: administración borra" on campana_tramos for delete using (es_admin());


-- 3. Estado de la campaña ------------------------------------------------------
-- Una sola fuente para el cobro, el dashboard y la web: la campaña de una
-- fecha, cuántas van, el tramo en curso y cuántas quedan en él. Sin datos de
-- clientes, solo cifras: por eso lo puede pedir también la web pública.
-- `security definer` porque el COUNT tiene que ver todas las membresías.
-- Sin campaña ese día, o con los cupos agotados: sin tramo (orden NULL).

create or replace function estado_campana(p_fecha date default current_date)
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
  quedan_en_tramo    integer
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
         a.orden, a.descuento_pct, a.acumulado - v.n
  from c
  cross join v
  left join actual a on true
$$;

revoke execute on function estado_campana(date) from public, anon, authenticated;
grant execute on function estado_campana(date) to anon, authenticated;


-- 4. Cobrar: siempre el plan entero, con la campaña si toca --------------------
-- Igual que la versión de `20261023120000_descuentos_y_pocas_clases` más el
-- bloque de la campaña, y SIN abonos: se borra la versión de 4 argumentos
-- (`p_abono`) y queda una de 3. Una llamada con abono falla («la función no
-- existe»): mejor eso que cobrar a medias en silencio.
--
-- ⚠️ Concurrencia: dos recepcionistas cobrando a la vez la venta nº 20 se
-- llevarían las dos el 15 %. Se toma un candado de la transacción por campaña
-- (`pg_advisory_xact_lock`) ANTES de contar: la segunda espera a que la
-- primera termine y ya la ve contada. Candado consultivo y no `for update`
-- porque Recepción no tiene permiso de UPDATE sobre `campanas`.

drop function registrar_membresia(uuid, uuid, metodo_pago, integer);

create function registrar_membresia(
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

  -- Campaña: solo la primera membresía del cliente.
  select e.campana_id, e.inicio_membresias into v_campana, v_inicio_c
    from estado_campana(current_date) e;

  if v_campana is not null
     and not exists (select 1 from membresias where cliente_id = p_cliente) then
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

-- ⚠️ Supabase concede EXECUTE a `anon` por nombre en cada función nueva:
-- revocar a `public` no basta.
revoke execute on function registrar_membresia(uuid, uuid, metodo_pago) from public, anon;
grant execute on function registrar_membresia(uuid, uuid, metodo_pago) to authenticated;


-- 5. Guardar una campaña con sus tramos ----------------------------------------
-- Desde Configuración (fase 3). La campaña y sus tramos en UNA transacción:
-- con dos llamadas desde la app, un fallo a medias dejaría una campaña sin
-- tramos (que no descuenta nada) o con los de antes y los nuevos mezclados.
-- `security invoker`: RLS (solo Administración) sigue mandando; la
-- comprobación de rol de arriba es para dar un mensaje claro.
--
-- Editar con ventas hechas es seguro: cada membresía guardó su % y el
-- contador es por campaña, no por fecha. Los tramos nuevos valen para las
-- siguientes ventas.

create or replace function guardar_campana(
  p_id      uuid,
  p_nombre  text,
  p_desde   date,
  p_hasta   date,
  p_inicio  date,
  p_tramos  jsonb   -- [{"cupos": 20, "pct": 15}, …] en orden
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
  end if;

  insert into campana_tramos (campana_id, orden, cupos, descuento_pct)
  select v_id, t.orden::integer, (t.tramo ->> 'cupos')::integer, (t.tramo ->> 'pct')::integer
  from jsonb_array_elements(p_tramos) with ordinality as t (tramo, orden);

  return v_id;
end $$;

revoke execute on function guardar_campana(uuid, text, date, date, date, jsonb) from public, anon;
grant execute on function guardar_campana(uuid, text, date, date, date, jsonb) to authenticated;
