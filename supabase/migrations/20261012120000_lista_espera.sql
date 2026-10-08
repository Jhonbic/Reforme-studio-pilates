-- =============================================================================
-- Lista de espera y reprogramar (oct 2026, paso 5 de la lista del estudio)
--
-- LISTA DE ESPERA
--   · Una clase llena admite lista de espera (no las privadas: van por
--     recepción). Se apunta el cliente desde su cuenta o recepción desde la
--     clase. Para apuntarse hace falta un plan que cubra el día.
--   · ⚠️ Cuando se libera un cupo (alguien cancela, lo quitan o sube el aforo)
--     el PRIMERO de la lista entra solo: se le reserva y se le descuenta del
--     plan. Si no le quedan clases de esa modalidad, se salta y se le saca.
--   · ⚠️ Solo si falta más que el plazo de cancelación (`ajustes`): todavía no
--     hay notificaciones (paso 7), y un cupo a última hora es un cupo que
--     nadie ve a tiempo: le costaría la clase sin enterarse.
--
-- REPROGRAMAR
--   · El cliente cambia una reserva por otra clase en UNA transacción:
--     `reprogramar_mi_reserva`. Con el mismo plazo que cancelar. Si la nueva no
--     entra (llena, sin saldo…), la original se queda como estaba.
--   · Recepción mueve a alguien de una clase a otra: `mover_reserva`.
-- =============================================================================

create table lista_espera (
  id          uuid primary key default gen_random_uuid(),
  clase_id    uuid not null references clases (id) on delete cascade,
  cliente_id  uuid not null references clientes (id) on delete cascade,
  creado_en   timestamptz not null default now(),
  unique (clase_id, cliente_id)
);

create index lista_espera_clase_idx on lista_espera (clase_id, creado_en);

comment on table lista_espera is
  'Quién espera cupo en una clase llena, por orden de llegada. Al liberarse un cupo entra el primero (promover_lista_espera).';

alter table lista_espera enable row level security;
create policy "lista de espera: lectura" on lista_espera
  for select using (coalesce(tiene_perfil(), false) or cliente_id = mi_cliente_id());
create policy "lista de espera: el mostrador apunta" on lista_espera
  for insert with check (es_mostrador());
create policy "lista de espera: el mostrador quita" on lista_espera
  for delete using (es_mostrador());

/**
 * Da los cupos libres de una clase a la lista de espera, por orden.
 * Interna: la llaman los triggers. `security definer` porque inserta la
 * reserva de OTRA persona (quien cancela no tiene permiso para eso).
 */
create or replace function promover_lista_espera(p_clase uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clase   clases%rowtype;
  v_horas   integer;
  v_espera  lista_espera%rowtype;
  v_entran  integer := 0;
begin
  select * into v_clase from clases where id = p_clase for update;
  if not found or v_clase.cancelada then
    return 0;
  end if;
  select horas_para_cancelar into v_horas from ajustes where id;
  if (v_clase.fecha + v_clase.hora_inicio) - make_interval(hours => coalesce(v_horas, 2)) <= localtimestamp then
    return 0; -- Demasiado tarde para que se entere: el cupo queda libre.
  end if;

  loop
    exit when (select count(*) from reservas where clase_id = p_clase) >= v_clase.cupos;
    select * into v_espera from lista_espera where clase_id = p_clase order by creado_en, id limit 1;
    exit when not found;
    delete from lista_espera where id = v_espera.id;
    begin
      insert into reservas (clase_id, cliente_id) values (p_clase, v_espera.cliente_id);
      v_entran := v_entran + 1;
    exception when others then
      null; -- Sin clases en su plan para ese día (o ya estaba): pasa el siguiente.
    end;
  end loop;
  return v_entran;
end $$;

revoke execute on function promover_lista_espera(uuid) from public, anon, authenticated;

create or replace function reservas_liberan_cupo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform promover_lista_espera(old.clase_id);
  return old;
end $$;

create trigger reservas_liberan_cupo
  after delete on reservas
  for each row execute function reservas_liberan_cupo();

-- Quien consigue plaza deja de esperar (entre por la lista o reservando él).
create or replace function reservas_salen_de_la_espera()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from lista_espera where clase_id = new.clase_id and cliente_id = new.cliente_id;
  return new;
end $$;

create trigger reservas_salen_de_la_espera
  after insert on reservas
  for each row execute function reservas_salen_de_la_espera();

create or replace function clases_aforo_libera_cupo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cupos > old.cupos then
    perform promover_lista_espera(new.id);
  end if;
  return new;
end $$;

create trigger clases_aforo_libera_cupo
  after update of cupos on clases
  for each row execute function clases_aforo_libera_cupo();

-- El cliente se apunta y se sale -----------------------------------------------
create or replace function unirme_lista_espera(p_clase uuid)
returns integer
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
  if not found or v_clase.cancelada or (v_clase.fecha + v_clase.hora_inicio) <= localtimestamp then
    raise exception 'Esa clase ya no está disponible.' using errcode = 'P0001';
  end if;
  if v_clase.tipo = 'Privada' then
    raise exception 'Las clases privadas se reservan en recepción.' using errcode = 'P0001';
  end if;
  if exists (select 1 from reservas where clase_id = p_clase and cliente_id = v_cliente) then
    raise exception 'Ya tienes esa clase reservada.' using errcode = 'P0001';
  end if;
  if (select count(*) from reservas where clase_id = p_clase) < v_clase.cupos then
    raise exception 'Hay cupo libre: puedes reservarla directamente.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from membresias m
    where m.cliente_id = v_cliente and v_clase.fecha between m.inicio and m.vencimiento
  ) then
    raise exception 'No tienes un plan que cubra ese día.' using errcode = 'P0001';
  end if;

  insert into lista_espera (clase_id, cliente_id) values (p_clase, v_cliente)
    on conflict (clase_id, cliente_id) do nothing;
  -- Su puesto en la fila.
  return (
    select count(*) from lista_espera
    where clase_id = p_clase
      and creado_en <= (select creado_en from lista_espera where clase_id = p_clase and cliente_id = v_cliente)
  );
end $$;

create or replace function salir_lista_espera(p_clase uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := mi_cliente_id();
begin
  if v_cliente is null then
    raise exception 'Esta cuenta no es de un cliente.' using errcode = 'P0001';
  end if;
  delete from lista_espera where clase_id = p_clase and cliente_id = v_cliente;
end $$;

-- Reprogramar ------------------------------------------------------------------
/**
 * Cambia una reserva del cliente por otra clase. Es cancelar + reservar en una
 * sola transacción: si la nueva no entra, la excepción deshace también la
 * cancelación y la reserva original sigue donde estaba.
 */
create or replace function reprogramar_mi_reserva(p_desde uuid, p_hacia uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_desde = p_hacia then
    raise exception 'Elige otra clase.' using errcode = 'P0001';
  end if;
  perform cancelar_mi_reserva(p_desde);   -- plazo y que sea suya
  perform reservar_mi_clase(p_hacia);     -- disponible, saldo y aforo
end $$;

/** Recepción mueve a alguien de una clase a otra (sin plazo: está delante). */
create or replace function mover_reserva(p_reserva uuid, p_clase uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva reservas%rowtype;
  v_origen  clases%rowtype;
  v_destino clases%rowtype;
begin
  if not coalesce(es_mostrador(), false) then
    raise exception 'Solo recepción o administración mueven reservas.' using errcode = '42501';
  end if;
  select * into v_reserva from reservas where id = p_reserva;
  if not found then
    raise exception 'Esa reserva ya no existe.' using errcode = 'P0001';
  end if;
  if v_reserva.clase_id = p_clase then
    raise exception 'Elige otra clase.' using errcode = 'P0001';
  end if;
  select * into v_origen from clases where id = v_reserva.clase_id;
  if (v_origen.fecha + v_origen.hora_inicio) <= localtimestamp then
    raise exception 'La clase de origen ya empezó: no se mueve.' using errcode = 'P0001';
  end if;
  select * into v_destino from clases where id = p_clase;
  if not found or v_destino.cancelada or (v_destino.fecha + v_destino.hora_inicio) <= localtimestamp then
    raise exception 'Esa clase ya no está disponible.' using errcode = 'P0001';
  end if;
  if exists (select 1 from reservas where clase_id = p_clase and cliente_id = v_reserva.cliente_id) then
    raise exception 'Ya está apuntada a esa clase.' using errcode = 'P0001';
  end if;

  delete from reservas where id = p_reserva;
  insert into reservas (clase_id, cliente_id) values (p_clase, v_reserva.cliente_id);
end $$;

-- La agenda del cliente dice además si espera y en qué puesto ------------------
drop function agenda_cliente(date, date);
create function agenda_cliente(p_desde date, p_hasta date)
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
  disponibles   integer,
  -- Su puesto en la lista de espera de esa clase (NULL si no espera).
  puesto_espera integer
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
           ) end,
           (select (count(*) filter (where l2.creado_en <= l.creado_en))::integer
              from lista_espera l
              join lista_espera l2 on l2.clase_id = l.clase_id
              where l.clase_id = c.id and l.cliente_id = v_cliente
              group by l.id)
    from clases c
    join equipo e on e.id = c.instructora_id
    where not c.cancelada
      and c.fecha between greatest(p_desde, current_date) and least(p_hasta, current_date + 84)
      and (c.fecha + c.hora_inicio) > localtimestamp
    order by c.fecha, c.hora_inicio;
end $$;

-- Permisos ----------------------------------------------------------------------
revoke execute on function agenda_cliente(date, date) from public, anon;
revoke execute on function unirme_lista_espera(uuid) from public, anon;
revoke execute on function salir_lista_espera(uuid) from public, anon;
revoke execute on function reprogramar_mi_reserva(uuid, uuid) from public, anon;
revoke execute on function mover_reserva(uuid, uuid) from public, anon;
grant execute on function agenda_cliente(date, date) to authenticated;
grant execute on function unirme_lista_espera(uuid) to authenticated;
grant execute on function salir_lista_espera(uuid) to authenticated;
grant execute on function reprogramar_mi_reserva(uuid, uuid) to authenticated;
grant execute on function mover_reserva(uuid, uuid) to authenticated;
