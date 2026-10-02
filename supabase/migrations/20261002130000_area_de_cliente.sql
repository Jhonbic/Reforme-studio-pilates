-- =============================================================================
-- Área de cliente (paso 10): cuentas de cliente, ver la agenda y reservar.
--
-- Decisiones del usuario (2 oct 2026):
--   · Registro libre en /registro; a los clientes que ya existen les da acceso
--     recepción. Una cédula que ya existe NO se enlaza sola a una cuenta nueva:
--     sin verificar el correo, cualquiera podría quedarse con la ficha de otro.
--   · Para reservar hace falta un plan vigente EL DÍA DE LA CLASE.
--   · Se cancela hasta 2 horas antes de que empiece.
--
-- ⚠️ Las reglas de reservar y cancelar viven AQUÍ, en funciones, y no en la
-- página: un cliente con su sesión puede llamar a la API directamente, y la
-- regla tiene que valer igual. Por eso el cliente NO tiene permiso de escribir
-- en `reservas`: solo puede hacerlo a través de estas funciones.
-- =============================================================================

alter table clientes
  add column cuenta_id uuid unique references auth.users (id) on delete set null;

comment on column clientes.cuenta_id is
  'Cuenta con la que el cliente entra a /mi-cuenta. NULL = no tiene acceso a la web.';


-- El cliente de quien llama ---------------------------------------------------
-- `security definer` para leer `clientes` sin depender de sus políticas (las
-- políticas de abajo la usan, y leer la tabla desde su propia política sería
-- recursivo). Devuelve NULL para el personal y para quien no ha entrado.
create or replace function mi_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from clientes where cuenta_id = auth.uid() and auth.uid() is not null
$$;


-- Lo que un cliente puede LEER de sí mismo -----------------------------------
-- Se SUMAN a las del personal (las políticas de un mismo comando se combinan
-- con OR). Ningún cliente ve a otro.

create policy "clientes: el cliente ve su ficha"
  on clientes for select using (cuenta_id = auth.uid());

create policy "membresias: el cliente ve las suyas"
  on membresias for select using (cliente_id = mi_cliente_id());

create policy "reservas: el cliente ve las suyas"
  on reservas for select using (cliente_id = mi_cliente_id());

-- El catálogo de planes es información pública del estudio, y sin él la vista
-- `clientes_vigentes` (security invoker) le enseñaría al cliente su plan vacío.
create policy "planes: el cliente los ve"
  on planes for select using (mi_cliente_id() is not null);


-- La agenda que ve un cliente --------------------------------------------------
-- ⚠️ Función y no permiso sobre `clases`: el cliente necesita el NOMBRE de la
-- instructora y cuántos cupos quedan, pero no puede leer `equipo` (correos y
-- teléfonos del personal) ni las reservas de los demás. La función devuelve
-- justo eso y nada más. Solo clases futuras y no canceladas, hasta 4 semanas.

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
  reservada     boolean
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
           exists (select 1 from reservas r where r.clase_id = c.id and r.cliente_id = v_cliente)
    from clases c
    join equipo e on e.id = c.instructora_id
    where not c.cancelada
      and c.fecha between greatest(p_desde, current_date) and least(p_hasta, current_date + 28)
      and (c.fecha + c.hora_inicio) > localtimestamp
    order by c.fecha, c.hora_inicio;
end $$;


-- Reservar --------------------------------------------------------------------
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

  -- ⚠️ Plan vigente EL DÍA DE LA CLASE, no hoy: quien renovó y su plan nuevo
  -- empieza la semana que viene puede reservar para la semana que viene, y a
  -- quien le vence el viernes no se le deja reservar el sábado.
  if not exists (
    select 1 from membresias m
    where m.cliente_id = v_cliente
      and v_clase.fecha between m.inicio and m.vencimiento
  ) then
    raise exception 'Tu plan no cubre esa fecha. Actívalo o renuévalo en recepción para reservar.' using errcode = 'P0001';
  end if;

  -- El aforo lo vigila el trigger `reservas_respetan_aforo`; la reserva
  -- repetida, la clave única (clase, cliente).
  insert into reservas (clase_id, cliente_id) values (p_clase, v_cliente);
exception
  when unique_violation then
    raise exception 'Ya tienes esa clase reservada.' using errcode = 'P0001';
end $$;


-- Cancelar --------------------------------------------------------------------
-- Hasta 2 horas antes: da tiempo a que otra persona ocupe el cupo. Pasado ese
-- plazo, se habla con recepción (que sí puede quitar la reserva desde el panel).
create or replace function cancelar_mi_reserva(p_clase uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := mi_cliente_id();
  v_inicio  timestamp;
begin
  if v_cliente is null then
    raise exception 'Esta cuenta no es de un cliente.' using errcode = 'P0001';
  end if;

  select c.fecha + c.hora_inicio into v_inicio
  from clases c
  join reservas r on r.clase_id = c.id and r.cliente_id = v_cliente
  where c.id = p_clase;
  if v_inicio is null then
    raise exception 'No tienes esa clase reservada.' using errcode = 'P0001';
  end if;
  if v_inicio - interval '2 hours' <= localtimestamp then
    raise exception 'Faltan menos de 2 horas para la clase: para cancelarla, escribe a recepción.' using errcode = 'P0001';
  end if;

  delete from reservas where clase_id = p_clase and cliente_id = v_cliente;
end $$;


-- Permisos de las funciones ----------------------------------------------------
-- Fuera de PUBLIC y de `anon` POR NOMBRE (Supabase se lo concede a `anon`
-- directamente); solo quien ha iniciado sesión. Dentro, cada una comprueba que
-- quien llama sea un cliente.
revoke execute on function mi_cliente_id() from public, anon;
revoke execute on function agenda_cliente(date, date) from public, anon;
revoke execute on function reservar_mi_clase(uuid) from public, anon;
revoke execute on function cancelar_mi_reserva(uuid) from public, anon;
grant execute on function mi_cliente_id() to authenticated;
grant execute on function agenda_cliente(date, date) to authenticated;
grant execute on function reservar_mi_clase(uuid) to authenticated;
grant execute on function cancelar_mi_reserva(uuid) to authenticated;
