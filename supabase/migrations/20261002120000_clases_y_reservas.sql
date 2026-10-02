-- =============================================================================
-- Agenda de clases y reservas (paso 9).
--
-- Hasta aquí la agenda vivía en `mock.ts`: 200 clases generadas en el código,
-- con reservas inventadas y un equipo de ejemplo distinto del real. Con esto
-- la agenda guarda, usa el equipo de verdad y las reservas son filas.
-- =============================================================================

-- `btree_gist` permite mezclar `=` sobre un uuid con `&&` sobre un rango en la
-- misma restricción de exclusión (la de abajo). Va en el esquema `extensions`,
-- como las demás de Supabase.
create extension if not exists btree_gist with schema extensions;

-- Lista cerrada y PROVISIONAL: la tiene que confirmar el estudio (CONTEXTO §8).
-- Cerrada por lo mismo que la EPS del alta: en texto libre la base acabaría con
-- «Reformer», «reformer» y «Reformer grupal» y no se podría contar nunca.
create type tipo_clase as enum ('Reformer', 'Mat', 'Privada');


-- Clases ---------------------------------------------------------------------

create table clases (
  id              uuid primary key default gen_random_uuid(),
  tipo            tipo_clase not null,
  fecha           date not null,
  hora_inicio     time not null,
  -- La hora de FIN no se guarda: se calcula. Guardada, inicio, duración y fin
  -- podrían contradecirse entre sí.
  duracion_min    integer not null check (duracion_min between 15 and 240),
  -- `restrict`: una instructora con clases no se borra del equipo; se marca
  -- inactiva y sus clases pasadas siguen diciendo quién las dio.
  instructora_id  uuid not null references equipo (id) on delete restrict,
  cupos           integer not null check (cupos > 0),
  -- Cancelar NO es borrar: una clase con reservas se cancela y se queda, porque
  -- hay personas a las que avisar. El estado («Finalizada», «Llena»…) no se
  -- guarda: se deriva. `cancelada` sí, porque es un hecho.
  cancelada       boolean not null default false,
  creado_en       timestamptz not null default now(),

  -- ⚠️ UNA INSTRUCTORA NO PUEDE ESTAR EN DOS CLASES A LA VEZ, y lo impide la
  -- BASE, no solo el formulario: el formulario evita el error de quien lo usa,
  -- no el de quien llama a la API directamente.
  --   · `[)` (cerrado-abierto): 07:00–07:50 y 07:50–08:40 NO se pisan. Con un
  --     rango cerrado nadie podría encadenar dos clases seguidas, que es lo
  --     que se hace todo el día. Es la misma regla estricta que `seSolapan()`.
  --   · `where (not cancelada)`: una clase anulada deja libre su hueco.
  constraint clases_instructora_sin_solapes exclude using gist (
    instructora_id extensions.gist_uuid_ops with =,
    tsrange(
      fecha + hora_inicio,
      fecha + hora_inicio + make_interval(mins => duracion_min),
      '[)'
    ) with &&
  ) where (not cancelada)
);

create index clases_fecha_idx on clases (fecha);

comment on table clases is
  'La agenda. El estado (Programada, Llena, Finalizada) se deriva; solo cancelada se guarda. Los solapes de instructora los impide clases_instructora_sin_solapes.';


-- Reservas -------------------------------------------------------------------

create table reservas (
  id          uuid primary key default gen_random_uuid(),
  -- `restrict`: una clase con reservas NO se borra, se cancela (ver arriba).
  clase_id    uuid not null references clases (id) on delete restrict,
  cliente_id  uuid not null references clientes (id) on delete cascade,
  creado_en   timestamptz not null default now(),
  -- La misma persona no ocupa dos cupos de la misma clase.
  unique (clase_id, cliente_id)
);

create index reservas_clase_idx on reservas (clase_id);
create index reservas_cliente_idx on reservas (cliente_id);


-- Aforo: nunca más reservas que cupos ----------------------------------------
-- ⚠️ No es un CHECK porque depende de OTRAS filas (cuántas reservas tiene ya la
-- clase). El `for update` bloquea la clase mientras se cuenta: sin él, dos
-- reservas simultáneas al último cupo contarían las dos «queda 1» y entrarían
-- las dos.
-- `security definer` para que cuente TODAS las reservas aunque quien reserva
-- no pudiera verlas (en el paso 10 reservarán los propios clientes).

create or replace function reserva_con_cupo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupos   integer;
  v_ocupado integer;
begin
  select cupos into v_cupos from clases where id = new.clase_id for update;
  select count(*) into v_ocupado from reservas where clase_id = new.clase_id;
  if v_ocupado >= v_cupos then
    raise exception 'La clase está llena: no quedan cupos.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger reservas_respetan_aforo
  before insert on reservas
  for each row execute function reserva_con_cupo();

-- Y al revés: el aforo no puede bajar por debajo de las reservas ya hechas.
-- Esas personas tienen su sitio confirmado; dejarlas fuera es una decisión que
-- tiene que tomar alguien, no un efecto secundario de editar un número.
create or replace function cupos_no_bajan_de_reservas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ocupado integer;
begin
  if new.cupos < old.cupos then
    select count(*) into v_ocupado from reservas where clase_id = new.id;
    if new.cupos < v_ocupado then
      raise exception 'Ya hay % reservas: el aforo no puede bajar de ahí.', v_ocupado using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger clases_aforo_no_baja
  before update of cupos on clases
  for each row execute function cupos_no_bajan_de_reservas();

-- Funciones de trigger: nadie las llama a mano. Fuera de PUBLIC y de `anon`
-- por nombre (Supabase se lo concede a `anon` directamente).
revoke execute on function reserva_con_cupo() from public, anon, authenticated;
revoke execute on function cupos_no_bajan_de_reservas() from public, anon, authenticated;


-- RLS ------------------------------------------------------------------------
-- Ver la agenda: todo el equipo. Programarla y apuntar gente: el mostrador
-- (Administración y Recepción). Las instructoras la consultan.
-- Las políticas para que los CLIENTES reserven llegan con el paso 10.

alter table clases   enable row level security;
alter table reservas enable row level security;

create policy "clases: lectura del personal"
  on clases for select using (tiene_perfil());
create policy "clases: el mostrador programa"
  on clases for insert with check (es_mostrador());
create policy "clases: el mostrador edita y cancela"
  on clases for update using (es_mostrador()) with check (es_mostrador());
create policy "clases: el mostrador elimina"
  on clases for delete using (es_mostrador());

create policy "reservas: lectura del personal"
  on reservas for select using (tiene_perfil());
create policy "reservas: el mostrador apunta"
  on reservas for insert with check (es_mostrador());
create policy "reservas: el mostrador quita"
  on reservas for delete using (es_mostrador());
