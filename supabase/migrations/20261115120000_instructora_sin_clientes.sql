-- =============================================================================
-- La instructora no lee las fichas de los clientes (15 nov 2026)
-- =============================================================================
-- Hasta aquí `clientes` y `membresias` se leían con `tiene_perfil()`: cualquiera
-- del equipo. El panel ya no le enseña a la instructora ni el Dashboard ni
-- Usuarios, pero con su sesión y la clave pública podía pedir a la API TODAS
-- las fichas (documento, teléfono, EPS, dirección, emergencia, acudiente) y
-- todas las membresías. Esconder la pantalla no basta: se cierra aquí.
--
-- Decisión del usuario: la instructora ve SOLO EL NOMBRE de quien reservó o
-- espera en las clases que ella da (para pasar lista), con
-- `nombres_en_mis_clases()`. De las clases de otras, solo cuántos hay
-- (`reservas` y `lista_espera` siguen legibles: llevan ids, no datos).
-- =============================================================================

-- 1. Fichas y membresías: solo el mostrador (y el cliente, lo suyo) ------------
drop policy "clientes: lectura del personal" on clientes;
create policy "clientes: lectura del mostrador"
  on clientes for select using (es_mostrador());

drop policy "membresias: lectura del personal" on membresias;
create policy "membresias: lectura del mostrador"
  on membresias for select using (es_mostrador());

-- `clientes_vigentes` es `security_invoker`: hereda lo de arriba sin tocarla.


-- 2. Funciones que dejaban pasar a todo el equipo ------------------------------
-- Mismo cuerpo que su última versión; solo cambia quién pasa.

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
  if not coalesce(es_mostrador() or p_cliente = mi_cliente_id(), false) then
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


create or replace function disponibles_para(p_fecha date, p_tipo tipo_clase)
returns table (cliente_id uuid, disponibles integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo recepción y administración.' using errcode = '42501';
  end if;
  return query
    select m.cliente_id,
           sum(case p_tipo when 'Reformer' then m.clases_reformer when 'Mat' then m.clases_mat else 0 end
               - clases_usadas(m.id, p_tipo))::integer
    from membresias m
    where p_fecha between m.inicio and m.vencimiento
    group by m.cliente_id;
end $$;

revoke execute on function disponibles_para(date, tipo_clase) from public, anon;
grant execute on function disponibles_para(date, tipo_clase) to authenticated;


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
  where coalesce(es_mostrador(), false)
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


-- 3. Los nombres que la instructora sí necesita --------------------------------
-- Quién reservó o espera en las clases que ELLA da (primera o segunda
-- instructora), entre dos fechas: clase, cliente y nombre. Vacío para
-- cualquier otro.
-- ⚠️ Va POR CLASE: si fuera solo por cliente, la agenda pondría el nombre de
-- una alumna suya también en las clases de otra instructora a las que va.
create or replace function nombres_en_mis_clases(p_desde date, p_hasta date)
returns table (clase_id uuid, cliente_id uuid, nombre text)
language sql
stable
security definer
set search_path = public
as $$
  with mias as (
    select c.id
    from clases c
    where mi_equipo_id() is not null
      and mi_equipo_id() in (c.instructora_id, c.instructora2_id)
      and c.fecha between p_desde and p_hasta
  ),
  gente as (
    select r.clase_id, r.cliente_id from reservas r join mias on mias.id = r.clase_id
    union
    select e.clase_id, e.cliente_id from lista_espera e join mias on mias.id = e.clase_id
  )
  select g.clase_id, cl.id, cl.nombre
  from gente g
  join clientes cl on cl.id = g.cliente_id
$$;

revoke execute on function nombres_en_mis_clases(date, date) from public, anon;
grant execute on function nombres_en_mis_clases(date, date) to authenticated;
