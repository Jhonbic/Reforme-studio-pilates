-- =============================================================================
-- Correo obligatorio y único en los clientes (oct 2026)
--
-- Decisión del usuario: «no tiene sentido tener un cliente sin correo». El
-- correo es su usuario para entrar a la web y reservar, y sin él recepción no
-- le puede crear contraseña.
--
-- ⚠️ CAMBIA lo que decía `20261017140000_registro_web_ficha_completa`: allí el
-- alta de recepción podía seguir sin correo («un adulto mayor sin correo o un
-- menor»). Desde aquí, tampoco: toda ficha nueva lleva correo. Ese trigger
-- sigue igual para el resto de la ficha web completa.
--
--   · Obligatorio con un TRIGGER al crear la ficha o al cambiar el correo, y
--     no con un `check … not valid`: ese también salta en CUALQUIER update de
--     una ficha antigua sin correo (marcar su asistencia, darla de baja…), y
--     esas acciones fallarían por un campo que no tocan. Las fichas viejas sin
--     correo se quedan como están; al editarlas, el formulario lo pide.
--   · Único sin distinguir mayúsculas: una cuenta de la web es un correo, y
--     dos fichas con el mismo correo no podrían tener las dos su contraseña.
-- =============================================================================

create or replace function clientes_exigen_correo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.correo is null or trim(new.correo) = '' then
    raise exception 'El correo del cliente es obligatorio.' using errcode = 'P0001';
  end if;
  new.correo := lower(trim(new.correo));
  return new;
end $$;

create trigger clientes_exigen_correo
  before insert or update of correo on clientes
  for each row execute function clientes_exigen_correo();

create unique index clientes_correo_unico on clientes (lower(correo)) where correo is not null;
