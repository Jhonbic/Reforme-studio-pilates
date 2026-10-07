-- =============================================================================
-- Clases por plan (oct 2026, paso 1 de la lista del estudio)
--
-- Hasta ahora un plan daba acceso durante su vigencia y nada más: «12 clases»
-- era un texto. Desde aquí:
--
--   · El plan tiene MODALIDAD (Mat, Reformer o Fusión) y sus clases de cada
--     tipo: Fusión Esencial = 8 de Reformer + 4 de Mat.
--   · La membresía COPIA esas cantidades al venderse, como ya copiaba el
--     precio: cambiar el plan mañana no cambia lo que el cliente compró hoy.
--   · Cada reserva queda ligada a la membresía de la que DESCUENTA.
--
-- Reglas del estudio (6 oct 2026):
--   · La clase se descuenta AL RESERVAR.
--   · Cancelar con 2 h o más la devuelve (cancelar = borrar la reserva, así
--     que el saldo vuelve solo). Faltar no la devuelve.
--   · Lo que no se usa en los 30 días se pierde (una reserva solo puede
--     descontar de una membresía que cubra la fecha de la clase).
--   · Si el ESTUDIO cancela una clase, no cuenta.
--   · Las clases Privadas no descuentan de ningún plan.
--
-- ⚠️ Las reglas viven aquí, en la base, y no en la página: el cliente puede
-- llamar a la API con su sesión.
-- =============================================================================

create type modalidad_plan as enum ('Mat', 'Reformer', 'Fusión');

alter table planes
  add column modalidad       modalidad_plan not null default 'Reformer',
  add column clases_reformer integer not null default 0 check (clases_reformer >= 0),
  add column clases_mat      integer not null default 0 check (clases_mat >= 0);

-- Los planes que ya existen: la modalidad sale de su descripción («Plan Mat»,
-- «Plan Reformer», «Plan Fusión…»), que es como se cargaron los reales.
update planes set modalidad = case
  when descripcion ilike '%fusi%' or nombre ilike 'fusi%' then 'Fusión'::modalidad_plan
  when descripcion ilike '%mat%' then 'Mat'::modalidad_plan
  else 'Reformer'::modalidad_plan
end;

-- Fusión trae siempre 4 de Mat (Inicio 4+4, Esencial 8+4, Equilibrio 12+4):
-- el resto del total son de Reformer.
update planes set
  clases_reformer = case modalidad
    when 'Reformer' then coalesce(clases_incluidas, 0)
    when 'Fusión'   then greatest(coalesce(clases_incluidas, 0) - 4, 0)
    else 0 end,
  clases_mat = case modalidad
    when 'Mat'    then coalesce(clases_incluidas, 0)
    when 'Fusión' then least(coalesce(clases_incluidas, 0), 4)
    else 0 end;

-- `clases_incluidas` deja de escribirse: es la suma de las dos bolsas.
-- (Antes `null` significaba «ilimitadas»; los planes del estudio cuentan
-- siempre las clases, así que esa opción desaparece.)
alter table planes drop column clases_incluidas;
alter table planes add column clases_incluidas integer
  generated always as (clases_reformer + clases_mat) stored;

alter table planes add constraint planes_clases_segun_modalidad check (
  (modalidad = 'Mat'      and clases_reformer = 0 and clases_mat > 0) or
  (modalidad = 'Reformer' and clases_mat = 0 and clases_reformer > 0) or
  (modalidad = 'Fusión'   and clases_reformer > 0 and clases_mat > 0)
) not valid;
-- `not valid`: los planes de ejemplo antiguos (locales) pueden no cumplirla;
-- todo plan nuevo o editado sí.

comment on column planes.modalidad is 'Mat, Reformer o Fusión (Reformer + Mat).';
comment on column planes.clases_incluidas is 'Generada: clases_reformer + clases_mat.';


-- Membresías: copian las bolsas del plan --------------------------------------

alter table membresias
  add column clases_reformer integer check (clases_reformer >= 0),
  add column clases_mat      integer check (clases_mat >= 0);

update membresias m set
  clases_reformer = p.clases_reformer,
  clases_mat      = p.clases_mat
from planes p where p.id = m.plan_id;

-- Quien inserte una membresía sin decir las clases (la semilla, una carga a
-- mano) recibe las del plan. Así nunca queda una membresía con «0 clases» por
-- olvido.
create or replace function membresia_copia_clases()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.clases_reformer is null or new.clases_mat is null then
    select coalesce(new.clases_reformer, p.clases_reformer),
           coalesce(new.clases_mat, p.clases_mat)
      into new.clases_reformer, new.clases_mat
      from planes p where p.id = new.plan_id;
  end if;
  return new;
end $$;

create trigger membresias_copian_clases
  before insert on membresias
  for each row execute function membresia_copia_clases();

alter table membresias
  alter column clases_reformer set not null,
  alter column clases_mat set not null;

revoke execute on function membresia_copia_clases() from public, anon, authenticated;


-- Reservas: de qué membresía descuentan --------------------------------------

alter table reservas
  add column membresia_id uuid references membresias (id) on delete set null;

create index reservas_membresia_idx on reservas (membresia_id);

comment on column reservas.membresia_id is
  'Membresía de la que descuenta. NULL = no descuenta (clase Privada, o cargada por el sistema sin saldo).';

/** Clases de una modalidad ya usadas de una membresía. Las de clases que el
    estudio canceló no cuentan. */
create or replace function clases_usadas(p_membresia uuid, p_tipo tipo_clase)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from reservas r
  join clases c on c.id = r.clase_id
  where r.membresia_id = p_membresia
    and c.tipo = p_tipo
    and not c.cancelada
$$;

/** La membresía de la que debe descontar una reserva: la que cubre la fecha
    de la clase, tiene saldo en esa modalidad y vence ANTES (se gasta primero
    lo que caduca primero). NULL si ninguna. Bloquea las candidatas para que
    dos reservas simultáneas no gasten la misma última clase. */
create or replace function membresia_para(p_cliente uuid, p_fecha date, p_tipo tipo_clase)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m membresias%rowtype;
begin
  if p_tipo = 'Privada' then
    return null;
  end if;
  for v_m in
    select * from membresias
    where cliente_id = p_cliente
      and p_fecha between inicio and vencimiento
    order by vencimiento, inicio
    for update
  loop
    if (case p_tipo when 'Reformer' then v_m.clases_reformer else v_m.clases_mat end)
       > clases_usadas(v_m.id, p_tipo) then
      return v_m.id;
    end if;
  end loop;
  return null;
end $$;

create or replace function reserva_descuenta_clase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clase clases%rowtype;
begin
  select * into v_clase from clases where id = new.clase_id;
  if v_clase.tipo = 'Privada' then
    new.membresia_id := null;
    return new;
  end if;

  if new.membresia_id is null then
    new.membresia_id := membresia_para(new.cliente_id, v_clase.fecha, v_clase.tipo);
  end if;

  -- Sin saldo no se reserva, ni el cliente ni recepción: si no, el saldo
  -- dejaría de cuadrar. Las cargas del sistema (sin sesión: la semilla, una
  -- migración) sí pueden, para no romper datos ya existentes.
  if new.membresia_id is null and auth.uid() is not null then
    if not exists (
      select 1 from membresias
      where cliente_id = new.cliente_id and v_clase.fecha between inicio and vencimiento
    ) then
      raise exception 'No hay un plan que cubra la fecha de esa clase: hay que activarlo o renovarlo para reservar.'
        using errcode = 'P0001';
    end if;
    raise exception 'No quedan clases de % en el plan para ese día.', v_clase.tipo
      using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Se llama «reservas_descuentan_clase» para que corra ANTES que
-- «reservas_respetan_aforo» (los triggers van por orden alfabético): si no hay
-- saldo, da igual que haya cupo.
create trigger reservas_descuentan_clase
  before insert on reservas
  for each row execute function reserva_descuenta_clase();

revoke execute on function reserva_descuenta_clase() from public, anon, authenticated;
revoke execute on function membresia_para(uuid, date, tipo_clase) from public, anon, authenticated;
revoke execute on function clases_usadas(uuid, tipo_clase) from public, anon, authenticated;

-- Reservas que ya existían: se ligan a su membresía por orden de fecha, hasta
-- agotar el saldo. Las que sobran quedan sin ligar (no descuentan).
do $$
declare
  r record;
  v_m uuid;
begin
  for r in
    select rv.id, rv.cliente_id, c.fecha, c.tipo
    from reservas rv join clases c on c.id = rv.clase_id
    where rv.membresia_id is null and not c.cancelada and c.tipo <> 'Privada'
    order by c.fecha, c.hora_inicio, rv.creado_en
  loop
    v_m := membresia_para(r.cliente_id, r.fecha, r.tipo);
    if v_m is not null then
      update reservas set membresia_id = v_m where id = r.id;
    end if;
  end loop;
end $$;


-- Saldo de clases: una sola fuente para el panel y para el cliente -----------

/** El saldo de cada membresía de un cliente. Lo puede pedir el personal (de
    cualquiera) o el propio cliente (de sí mismo). Función y no vista: el
    cliente no puede leer `clases`, y una vista con los permisos del dueño
    saltaría RLS para todos. */
create or replace function saldo_clases(p_cliente uuid)
returns table (
  membresia_id     uuid,
  plan             text,
  modalidad        modalidad_plan,
  inicio           date,
  vencimiento      date,
  clases_reformer  integer,
  usadas_reformer  integer,
  clases_mat       integer,
  usadas_mat       integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (tiene_perfil() or p_cliente = mi_cliente_id()) then
    raise exception 'No puedes ver ese saldo.' using errcode = '42501';
  end if;
  return query
    select m.id, p.nombre, p.modalidad, m.inicio, m.vencimiento,
           m.clases_reformer, clases_usadas(m.id, 'Reformer'),
           m.clases_mat,      clases_usadas(m.id, 'Mat')
    from membresias m
    join planes p on p.id = m.plan_id
    where m.cliente_id = p_cliente
    order by m.vencimiento desc;
end $$;

revoke execute on function saldo_clases(uuid) from public, anon;
grant execute on function saldo_clases(uuid) to authenticated;


-- La venta copia las clases (además del precio) ------------------------------

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
  if not v_plan.se_vende then
    raise exception 'Ese plan ya no se vende.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from clientes where id = p_cliente) then
    raise exception 'El cliente no existe.' using errcode = 'P0002';
  end if;

  select max(vencimiento) into v_ultimo from membresias where cliente_id = p_cliente;
  v_inicio := greatest(current_date, coalesce(v_ultimo + 1, current_date));

  insert into membresias (cliente_id, plan_id, inicio, vencimiento, importe, clases_reformer, clases_mat)
  values (p_cliente, p_plan, v_inicio, v_inicio + v_plan.vigencia_dias, v_plan.precio,
          v_plan.clases_reformer, v_plan.clases_mat)
  returning id into v_membresia;

  insert into pagos (cliente_id, membresia_id, metodo, fecha, importe)
  values (p_cliente, v_membresia, p_metodo, current_date, v_plan.precio);

  return v_membresia;
end $$;

revoke execute on function registrar_membresia(uuid, uuid, metodo_pago) from public;
revoke execute on function registrar_membresia(uuid, uuid, metodo_pago) from anon;
grant execute on function registrar_membresia(uuid, uuid, metodo_pago) to authenticated;


-- Área de cliente: la agenda dice cuántas le quedan para cada clase ---------

drop function if exists agenda_cliente(date, date);

create or replace function agenda_cliente(p_desde date, p_hasta date)
returns table (
  id            uuid,
  tipo          tipo_clase,
  fecha         date,
  hora_inicio   time,
  duracion_min  integer,
  instructora   text,
  cupos         integer,
  reservas      integer,
  reservada     boolean,
  -- Clases de esa modalidad que le quedan para la fecha de la clase, sumando
  -- todas sus membresías que la cubren. NULL en las Privadas (no descuentan).
  disponibles   integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cliente uuid := mi_cliente_id();
begin
  if v_cliente is null then
    raise exception 'Esta cuenta no es de un cliente.' using errcode = 'P0001';
  end if;
  return query
    select c.id, c.tipo, c.fecha, c.hora_inicio, c.duracion_min,
           e.nombre,
           c.cupos,
           (select count(*)::integer from reservas r where r.clase_id = c.id),
           exists (select 1 from reservas r where r.clase_id = c.id and r.cliente_id = v_cliente),
           case when c.tipo = 'Privada' then null else (
             select coalesce(sum(
               (case c.tipo when 'Reformer' then m.clases_reformer else m.clases_mat end)
               - clases_usadas(m.id, c.tipo)), 0)::integer
             from membresias m
             where m.cliente_id = v_cliente and c.fecha between m.inicio and m.vencimiento
           ) end
    from clases c
    join equipo e on e.id = c.instructora_id
    where not c.cancelada
      and c.fecha between greatest(p_desde, current_date) and least(p_hasta, current_date + 28)
      and (c.fecha + c.hora_inicio) > localtimestamp
    order by c.fecha, c.hora_inicio;
end $$;

revoke execute on function agenda_cliente(date, date) from public, anon;
grant execute on function agenda_cliente(date, date) to authenticated;

-- El cliente reserva: la comprobación de saldo la hace el trigger; aquí solo
-- se añade que las Privadas se piden en recepción.
create or replace function reservar_mi_clase(p_clase uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := mi_cliente_id();
  v_clase   clases%rowtype;
begin
  if v_cliente is null then
    raise exception 'Esta cuenta no es de un cliente.' using errcode = 'P0001';
  end if;
  select * into v_clase from clases where id = p_clase;
  if not found or v_clase.cancelada then
    raise exception 'Esa clase ya no está disponible.' using errcode = 'P0001';
  end if;
  if (v_clase.fecha + v_clase.hora_inicio) <= localtimestamp then
    raise exception 'Esa clase ya empezó.' using errcode = 'P0001';
  end if;
  if v_clase.tipo = 'Privada' then
    raise exception 'Las clases privadas se reservan en recepción.' using errcode = 'P0001';
  end if;
  insert into reservas (clase_id, cliente_id) values (p_clase, v_cliente);
exception
  when unique_violation then
    raise exception 'Ya tienes esa clase reservada.' using errcode = 'P0001';
end $$;

revoke execute on function reservar_mi_clase(uuid) from public, anon;
grant execute on function reservar_mi_clase(uuid) to authenticated;
