-- =============================================================================
-- Dar de baja a un cliente (oct 2026)
--
-- Un cliente que se va NO se borra: sus pagos, membresías y asistencias son
-- historia del estudio (y `pagos.cliente_id` es `on delete restrict`). Se le
-- marca la fecha de baja y el motivo:
--   · En el listado sale «De baja» (gana a cualquier otro estado).
--   · No puede reservar ni apuntarse a la lista de espera, ni se le vende un
--     plan: hay que reactivarlo antes. Lo impide la BASE (triggers), no solo
--     la pantalla.
--   · Al darle de baja se le quitan las reservas de clases que no han empezado
--     (el cupo vuelve a la clase) y sale de las listas de espera.
--   · Reactivarlo lo deja como estaba, sin tocar nada más.
-- =============================================================================

alter table clientes
  add column baja date,
  add column baja_motivo text;

comment on column clientes.baja is 'Día en que se dio de baja. NULL = cliente del estudio.';

-- La vista: «De baja» gana a todo. La columna `baja` va al FINAL porque
-- `create or replace view` solo deja añadir columnas detrás.
-- `security_invoker = on` explícito: sin él, la vista se abriría a la clave anónima.
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
    when c.baja is not null then 'De baja'::estado_membresia
    when m.id is null then 'Sin plan'::estado_membresia
    else estado_de_membresia(m.vencimiento, greatest(c.ultima_asistencia, m.inicio))
  end                                                   as estado,
  c.baja
from clientes c
left join lateral (
  select *
  from membresias
  where cliente_id = c.id
  order by vencimiento desc
  limit 1
) m on true
left join planes p on p.id = m.plan_id;

-- Un cliente de baja no reserva, no espera cupo y no compra plan ----------------
create or replace function cliente_no_esta_de_baja()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from clientes where id = new.cliente_id and baja is not null) then
    raise exception 'Ese cliente está dado de baja: reactívalo antes.' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- `reservas_a_…` para correr ANTES que los demás triggers de reservas (orden
-- alfabético): no tiene sentido descontar una clase y luego rechazarla.
create trigger reservas_a_cliente_activo
  before insert on reservas
  for each row execute function cliente_no_esta_de_baja();
create trigger lista_espera_cliente_activo
  before insert on lista_espera
  for each row execute function cliente_no_esta_de_baja();
create trigger membresias_cliente_activo
  before insert on membresias
  for each row execute function cliente_no_esta_de_baja();

/**
 * Da de baja a un cliente: fecha de hoy y motivo, fuera sus reservas de clases
 * que no han empezado y fuera de las listas de espera.
 * Devuelve `{reservas_quitadas}`.
 */
create or replace function dar_de_baja(p_cliente uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservas integer;
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo Administración y Recepción dan de baja.' using errcode = '42501';
  end if;
  update clientes
    set baja = current_date, baja_motivo = nullif(trim(p_motivo), '')
    where id = p_cliente and baja is null;
  if not found then
    raise exception 'Ese cliente no existe o ya está de baja.' using errcode = 'P0002';
  end if;

  delete from reservas r using clases c
    where r.clase_id = c.id and r.cliente_id = p_cliente and not c.cancelada
      and (c.fecha > current_date or (c.fecha = current_date and c.hora_inicio > localtime));
  get diagnostics v_reservas = row_count;
  delete from lista_espera where cliente_id = p_cliente;

  return jsonb_build_object('reservas_quitadas', v_reservas);
end $$;

revoke execute on function dar_de_baja(uuid, text) from public, anon;
grant execute on function dar_de_baja(uuid, text) to authenticated;

/** Vuelve a ser cliente del estudio. */
create or replace function reactivar_cliente(p_cliente uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo Administración y Recepción reactivan clientes.' using errcode = '42501';
  end if;
  update clientes set baja = null, baja_motivo = null
    where id = p_cliente and baja is not null;
  if not found then
    raise exception 'Ese cliente no está de baja.' using errcode = 'P0002';
  end if;
end $$;

revoke execute on function reactivar_cliente(uuid) from public, anon;
grant execute on function reactivar_cliente(uuid) to authenticated;
