-- =============================================================================
-- Asistencia (oct 2026, paso 2 de la lista del estudio)
--
-- Hasta ahora se sabía quién RESERVÓ, no quién VINO. Desde aquí cada reserva
-- puede marcarse «Asistió» o «No vino» cuando la clase ya empezó.
--
--   · La clase ya se descontó al reservar (paso 1): marcar la asistencia NO
--     cambia el saldo. Faltar no la devuelve, que es la regla del estudio.
--   · Marcan Administración, Recepción y la INSTRUCTORA DE ESA CLASE. Las
--     demás instructoras no: no estaban.
--   · «Asistió» mueve `clientes.ultima_asistencia`, que hasta ahora era un dato
--     de ejemplo: la regla de «Inactiva» (30 días sin venir) pasa a funcionar
--     con asistencias de verdad.
--   · Se guarda quién marcó y cuándo: es lo que se mira si un cliente dice
--     «yo sí vine».
-- =============================================================================

create type asistencia as enum ('Asistió', 'No vino');

alter table reservas
  add column asistencia            asistencia,
  add column asistencia_marcada_en  timestamptz,
  add column asistencia_marcada_por uuid references auth.users (id) on delete set null;

comment on column reservas.asistencia is
  'Asistió / No vino. NULL = sin marcar. No cambia el saldo: la clase se descontó al reservar.';

/** Marca (o desmarca, con NULL) la asistencia de una reserva. */
create or replace function marcar_asistencia(p_reserva uuid, p_asistencia asistencia)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva reservas%rowtype;
  v_clase   clases%rowtype;
begin
  select * into v_reserva from reservas where id = p_reserva;
  if not found then
    raise exception 'Esa reserva ya no existe.' using errcode = 'P0002';
  end if;
  select * into v_clase from clases where id = v_reserva.clase_id;

  -- ⚠️ `coalesce`: `es_mostrador()` devuelve NULL (no false) a quien no es del
  -- equipo, y `if not (NULL)` NO entra en el `if`: sin esto, un cliente podía
  -- marcar su propia asistencia (lo cazó el test).
  if not coalesce(
    es_mostrador()
    or exists (
      select 1 from equipo e
      where e.id = v_clase.instructora_id and e.cuenta_id = auth.uid() and e.activo
    ), false
  ) then
    raise exception 'Solo recepción, administración o la instructora de la clase marcan la asistencia.'
      using errcode = '42501';
  end if;

  if v_clase.cancelada then
    raise exception 'La clase se canceló: no hay asistencia que marcar.' using errcode = 'P0001';
  end if;
  if (v_clase.fecha + v_clase.hora_inicio) > localtimestamp then
    raise exception 'La clase todavía no ha empezado.' using errcode = 'P0001';
  end if;

  update reservas set
    asistencia             = p_asistencia,
    asistencia_marcada_en  = case when p_asistencia is null then null else now() end,
    asistencia_marcada_por = case when p_asistencia is null then null else auth.uid() end
  where id = p_reserva;

  -- Solo hacia delante: desmarcar no borra una última asistencia que pudo
  -- venir de otra clase.
  if p_asistencia = 'Asistió' then
    update clientes
      set ultima_asistencia = greatest(coalesce(ultima_asistencia, v_clase.fecha), v_clase.fecha)
      where id = v_reserva.cliente_id;
  end if;
end $$;

revoke execute on function marcar_asistencia(uuid, asistencia) from public, anon;
grant execute on function marcar_asistencia(uuid, asistencia) to authenticated;

-- El id de equipo de quien tiene la sesión: la agenda lo necesita para saber
-- si la instructora que mira es la de la clase.
create or replace function mi_equipo_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from equipo where cuenta_id = auth.uid() and auth.uid() is not null and activo
$$;

revoke execute on function mi_equipo_id() from public, anon;
grant execute on function mi_equipo_id() to authenticated;


-- ⚠️ Arreglo de seguridad de `saldo_clases` (paso 1): `p_cliente =
-- mi_cliente_id()` es NULL para una cuenta que no es cliente, y `not (false or
-- NULL)` es NULL → el `if` no saltaba y una cuenta sin ficha ni perfil (alguien
-- registrado por la API) podía leer el saldo de cualquier cliente.
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
  if not coalesce(tiene_perfil() or p_cliente = mi_cliente_id(), false) then
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
