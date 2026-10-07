-- =============================================================================
-- Salas (oct 2026)
--
-- El estudio tiene DOS salas: una de Reformer y una de Mat, y en cada una
-- caben como mucho 8 personas (decisión del estudio, 6 oct 2026).
--
--   · Tabla y no constante: el módulo de Configuración (paso 4) dejará editar
--     salas y aforos sin tocar código.
--   · Cada clase va en una sala. Reformer y Mat van en la suya, siempre; la
--     privada se puede dar en cualquiera de las dos (por defecto, Reformer).
--   · ⚠️ Dos clases no pueden ocupar la MISMA sala a la vez, y lo impide la
--     BASE (restricción de exclusión), igual que el solape de instructora.
--     Una de Reformer y una de Mat a la misma hora sí: son salas distintas.
--   · ⚠️ Los cupos de una clase no pasan del aforo de su sala.
-- =============================================================================

create table salas (
  id         text primary key,
  nombre     text not null,
  capacidad  integer not null check (capacidad between 1 and 50)
);

comment on table salas is
  'Las salas del estudio. La capacidad es el tope de cupos de cualquier clase que se dé en ella.';

insert into salas (id, nombre, capacidad) values
  ('Reformer', 'Sala de Reformer', 8),
  ('Mat',      'Sala de Mat',      8);

alter table salas enable row level security;
create policy "salas: lectura del personal" on salas for select using (tiene_perfil());
create policy "salas: administración edita" on salas for update using (es_admin()) with check (es_admin());

-- -----------------------------------------------------------------------------
-- La sala de cada clase
-- -----------------------------------------------------------------------------
alter table clases add column sala text references salas (id) on update cascade;

update clases set sala = case when tipo = 'Mat' then 'Mat' else 'Reformer' end;

-- Los datos de ejemplo traían Mat con 12 cupos. Se bajan a 8, salvo donde ya
-- había más gente apuntada: esas personas tienen su sitio (y las pasadas son
-- historia). Va ANTES del trigger de aforo de sala, que lo impediría.
update clases c set cupos = greatest(8, (select count(*) from reservas r where r.clase_id = c.id))
  where cupos > 8;

alter table clases alter column sala set not null;

alter table clases add constraint clases_sala_sin_solapes exclude using gist (
  sala with =,
  tsrange(
    fecha + hora_inicio,
    fecha + hora_inicio + make_interval(mins => duracion_min),
    '[)'
  ) with &&
) where (not cancelada);

/**
 * Pone la sala que toca y comprueba que los cupos quepan en ella.
 *
 * · Reformer y Mat van SIEMPRE en su sala: se fuerza, no se pregunta, para que
 *   no exista una «clase de Mat en la sala de Reformer» por un descuido.
 * · Privada: la sala que se diga; si no se dice, Reformer.
 * · El aforo se comprueba al crear y al cambiar cupos, sala o tipo, no en
 *   cada `update`: una clase pasada con más gente (dato antiguo) se puede
 *   cancelar sin que salte.
 */
create or replace function clases_sala_y_aforo()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_capacidad integer;
begin
  if new.tipo = 'Privada' then
    new.sala := coalesce(new.sala, 'Reformer');
  else
    new.sala := new.tipo::text;
  end if;

  if tg_op = 'INSERT'
     or new.cupos is distinct from old.cupos
     or new.sala is distinct from old.sala
     or new.tipo is distinct from old.tipo then
    select capacidad into v_capacidad from salas where id = new.sala;
    if new.cupos > v_capacidad then
      raise exception 'En la sala de % caben % personas: no se pueden abrir % cupos.',
        new.sala, v_capacidad, new.cupos
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger clases_sala_y_aforo
  before insert or update on clases
  for each row execute function clases_sala_y_aforo();
