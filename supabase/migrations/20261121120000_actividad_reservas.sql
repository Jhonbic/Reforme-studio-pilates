-- =============================================================================
-- Actividad de reservas: saber cuándo alguien reserva, cancela o cambia (21 nov 2026)
-- =============================================================================
-- Pedido del usuario: enterarse en la web, sin servicios externos (los avisos
-- por WhatsApp o correo vendrán después), de cuándo una persona reserva o
-- cancela una clase.
--
-- Decisiones del usuario:
--   · Campana en la barra lateral con lo que no se ha visto + página
--     «Actividad» con el historial.
--   · TODOS los movimientos, diciendo quién los hizo: el cliente desde la web,
--     el equipo desde el panel o la lista de espera sola.
--   · Administración y Recepción ven todo; la instructora, solo lo de las
--     clases que da (ya ve esos nombres en la agenda).
--
-- ⚠️ **Lo escriben TRIGGERS sobre `reservas`, no la app.** Una reserva se crea
-- o se borra por siete caminos (reservar y cancelar del cliente, reprogramar,
-- apuntar y quitar de recepción, mover, la lista de espera, dar de baja) y
-- varios son funciones de base. Un aviso escrito desde la app se perdería en
-- cuanto apareciera el octavo.
-- =============================================================================

create type movimiento_reserva as enum ('Reservó', 'Canceló', 'Cambió');
create type origen_movimiento  as enum ('Cliente', 'Equipo', 'Lista de espera');

create table actividad_reservas (
  id                 uuid primary key default gen_random_uuid(),
  -- `clock_timestamp()` y no `now()`: `now()` es el inicio de la transacción, y
  -- en un cambio (cancelar + reservar) los dos pasos saldrían a la vez.
  creado_en          timestamptz not null default clock_timestamp(),
  tipo               movimiento_reserva not null,
  origen             origen_movimiento  not null,
  -- Quién lo hizo: la cuenta y su nombre en ese momento (si luego cambia de
  -- nombre o deja el estudio, el aviso sigue diciendo quién fue).
  hecho_por          uuid,
  hecho_por_nombre   text,
  -- Se borra con el cliente: si su ficha desaparece, su rastro también.
  cliente_id         uuid not null references clientes (id) on delete cascade,
  cliente_nombre     text not null,
  -- La clase (en un cambio, la NUEVA). Copia de fecha, hora y tipo: la clase
  -- se puede mover o borrar después, y el aviso tiene que seguir leyéndose.
  clase_id           uuid references clases (id) on delete set null,
  clase_fecha        date not null,
  clase_hora         time not null,
  clase_tipo         tipo_clase not null,
  -- Solo en «Cambió»: la clase de la que salió.
  anterior_clase_id  uuid references clases (id) on delete set null,
  anterior_fecha     date,
  anterior_hora      time,
  -- Matiz que no cabe en el tipo: «Dada de baja».
  detalle            text,
  -- Interna: une la cancelación y la reserva de un mismo cambio.
  transaccion        bigint not null default txid_current()
);

create index actividad_reservas_creado_idx on actividad_reservas (creado_en desc);
create index actividad_reservas_clase_idx  on actividad_reservas (clase_id);
create index actividad_reservas_tx_idx     on actividad_reservas (transaccion);

alter table actividad_reservas enable row level security;

-- Solo lectura, y nadie escribe por la API: lo hacen los triggers.
-- ⚠️ La instructora ve lo de SUS clases (primera o segunda instructora), la
-- de antes o la de después de un cambio.
-- ⚠️ `to authenticated`: `anon` no puede ejecutar `mi_equipo_id()`, y sin esto
-- leer la tabla sin sesión daba «permission denied» en vez de cero filas.
create policy "actividad: lectura del mostrador o de la instructora de la clase"
  on actividad_reservas for select to authenticated using (
    coalesce(es_mostrador(), false)
    or exists (
      select 1 from clases c
      where c.id in (actividad_reservas.clase_id, actividad_reservas.anterior_clase_id)
        and mi_equipo_id() in (c.instructora_id, c.instructora2_id)
    )
  );


-- Quién está haciendo esto -----------------------------------------------------
-- ⚠️ La lista de espera corre con la sesión de quien LIBERÓ el cupo (otro
-- cliente o recepción), así que la sesión no basta: `promover_lista_espera`
-- lo marca con `reforme.origen` mientras mete gente.
-- ⚠️ Sin sesión (la semilla, una migración, restaurar una copia) devuelve
-- NULL y NO se apunta nada: no es un movimiento de nadie, y la semilla local
-- llenaba la campana con cientos de avisos.
create or replace function origen_de_movimiento(p_cliente uuid, out origen origen_movimiento, out nombre text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('reforme.origen', true), '') = 'lista_espera' then
    origen := 'Lista de espera';
  elsif auth.uid() is null then
    origen := null;
  elsif mi_cliente_id() = p_cliente then
    origen := 'Cliente';
    select c.nombre into nombre from clientes c where c.id = p_cliente;
  elsif mi_rol() is not null then
    origen := 'Equipo';
    select coalesce(
      (select e.nombre from equipo e where e.cuenta_id = auth.uid() limit 1),
      (select p.nombre from perfiles p where p.id = auth.uid())
    ) into nombre;
  else
    origen := null;
  end if;
end $$;

revoke execute on function origen_de_movimiento(uuid) from public, anon, authenticated;


create or replace function reservas_dejan_actividad()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila     reservas%rowtype;
  v_clase    clases%rowtype;
  v_cliente  clientes%rowtype;
  v_quien    record;
  v_previo   uuid;
begin
  v_fila := case when tg_op = 'DELETE' then old else new end;

  -- Al borrar un cliente sus reservas se van en cascada: ya no hay a quién
  -- nombrar (ni fila a la que apuntar), y no es un movimiento de nadie.
  select * into v_cliente from clientes where id = v_fila.cliente_id;
  if not found then
    return null;
  end if;
  select * into v_clase from clases where id = v_fila.clase_id;
  if not found then
    return null;
  end if;

  if tg_op = 'INSERT' then
    -- ⚠️ Reprogramar (`reprogramar_mi_reserva`) y mover (`mover_reserva`) son
    -- borrar + crear en UNA transacción. Contados por separado serían dos
    -- avisos («canceló» y «reservó») de lo que para el estudio es uno.
    select id into v_previo
    from actividad_reservas
    where transaccion = txid_current()
      and cliente_id = v_fila.cliente_id
      and tipo = 'Canceló'
      and detalle is null
    order by creado_en desc
    limit 1;

    if v_previo is not null then
      update actividad_reservas
      set tipo              = 'Cambió',
          anterior_clase_id = clase_id,
          anterior_fecha    = clase_fecha,
          anterior_hora     = clase_hora,
          clase_id          = v_clase.id,
          clase_fecha       = v_clase.fecha,
          clase_hora        = v_clase.hora_inicio,
          clase_tipo        = v_clase.tipo
      where id = v_previo;
      return null;
    end if;
  end if;

  select * into v_quien from origen_de_movimiento(v_fila.cliente_id);
  if v_quien.origen is null then
    return null;
  end if;

  insert into actividad_reservas (
    tipo, origen, hecho_por, hecho_por_nombre,
    cliente_id, cliente_nombre,
    clase_id, clase_fecha, clase_hora, clase_tipo, detalle
  ) values (
    case when tg_op = 'INSERT' then 'Reservó' else 'Canceló' end::movimiento_reserva,
    v_quien.origen,
    case when v_quien.origen in ('Cliente', 'Equipo') then auth.uid() end,
    v_quien.nombre,
    v_cliente.id, v_cliente.nombre,
    v_clase.id, v_clase.fecha, v_clase.hora_inicio, v_clase.tipo,
    -- `dar_de_baja` marca la baja ANTES de quitarle las reservas.
    case when tg_op = 'DELETE' and v_cliente.baja is not null then 'Dada de baja' end
  );
  return null;
end $$;

revoke execute on function reservas_dejan_actividad() from public, anon, authenticated;

-- ⚠️ El nombre importa: los triggers AFTER corren por orden alfabético, y
-- `reservas_dejan_…` va antes que `reservas_liberan_cupo`. Así la cancelación
-- queda apuntada ANTES que la entrada de la lista de espera que provoca.
create trigger reservas_dejan_actividad
  after insert or delete on reservas
  for each row execute function reservas_dejan_actividad();


-- La lista de espera se identifica ------------------------------------------
-- Mismo cuerpo que en 20261012120000_lista_espera; solo se añade la marca
-- `reforme.origen` alrededor del bucle que mete gente.
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

  perform set_config('reforme.origen', 'lista_espera', true);
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
  -- ⚠️ Se apaga al salir: lo que venga después en la misma transacción (la
  -- reserva nueva de un «Cambiar») es de quien tiene la sesión.
  perform set_config('reforme.origen', '', true);
  return v_entran;
end $$;

revoke execute on function promover_lista_espera(uuid) from public, anon, authenticated;


-- Lo que cada cual ya ha visto ------------------------------------------------
-- Una marca por cuenta: «he visto hasta aquí». Lo posterior cuenta en la
-- campana.
create table actividad_vista (
  cuenta_id    uuid primary key references auth.users (id) on delete cascade,
  visto_hasta  timestamptz not null default clock_timestamp()
);

alter table actividad_vista enable row level security;

create policy "actividad vista: la mía"
  on actividad_vista for select to authenticated using (cuenta_id = auth.uid());

/** Mueve mi marca a ahora y devuelve la ANTERIOR (lo nuevo es lo posterior a ella). */
create or replace function marcar_actividad_vista()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes timestamptz;
begin
  if not coalesce(tiene_perfil(), false) then
    raise exception 'Solo el equipo del estudio.' using errcode = '42501';
  end if;
  select visto_hasta into v_antes from actividad_vista where cuenta_id = auth.uid();
  insert into actividad_vista (cuenta_id, visto_hasta)
  values (auth.uid(), clock_timestamp())
  on conflict (cuenta_id) do update set visto_hasta = excluded.visto_hasta;
  return coalesce(v_antes, clock_timestamp() - interval '7 days');
end $$;

revoke execute on function marcar_actividad_vista() from public, anon;
grant execute on function marcar_actividad_vista() to authenticated;

/**
 * Cuántos movimientos no he visto, sin contar los míos (quien apunta a alguien
 * no necesita que se lo avisen). `security invoker`: RLS decide qué cuenta,
 * así la instructora solo cuenta lo de sus clases. Sin marca todavía, la
 * última semana.
 */
create or replace function actividad_sin_ver()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from actividad_reservas a
  where coalesce(tiene_perfil(), false)
    and a.creado_en > coalesce(
      (select v.visto_hasta from actividad_vista v where v.cuenta_id = auth.uid()),
      clock_timestamp() - interval '7 days'
    )
    and a.hecho_por is distinct from auth.uid()
$$;

revoke execute on function actividad_sin_ver() from public, anon;
grant execute on function actividad_sin_ver() to authenticated;
