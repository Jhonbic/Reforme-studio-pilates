-- =============================================================================
-- Plan destacado (nov 2026): el que el cliente ve primero en /mi-cuenta/planes,
-- con la cinta «Plan destacado» (referencia: los planes de DEMO adminGym).
--
-- Lo marca Administración en el formulario del plan (decisión del usuario).
-- UNO SOLO en todo el estudio: marcar otro apaga el anterior, en la base y no
-- en la app, para que dos administradoras a la vez no dejen dos destacados.
--
-- No es lo mismo que «El más contratado» del panel: ese se calcula con los
-- clientes y solo lo ve el equipo.
-- =============================================================================

alter table planes add column destacado boolean not null default false;

-- Nunca dos a la vez, pase lo que pase.
create unique index planes_un_solo_destacado on planes (destacado) where destacado;

-- Marcar uno apaga el anterior. BEFORE: así el índice único no salta.
create function planes_apagan_otro_destacado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.destacado then
    -- Con WHERE: `pg_safeupdate` rechaza UPDATE sin él, también aquí dentro.
    update planes set destacado = false where destacado and id <> new.id;
  end if;
  return new;
end $$;

create trigger planes_un_destacado
  before insert or update of destacado on planes
  for each row execute function planes_apagan_otro_destacado();

revoke execute on function planes_apagan_otro_destacado() from public, anon, authenticated;
