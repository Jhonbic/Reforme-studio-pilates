-- =============================================================================
-- Correo y teléfono del cliente pasan a ser OBLIGATORIOS, y el correo, ÚNICO.
--
-- El correo es con lo que la clienta inicia sesión (Supabase Auth): sin él no
-- hay cuenta, y dos fichas con el mismo correo no sabrían a qué cuenta atarse.
-- El teléfono es por donde se la avisa (una clase cancelada, un vencimiento).
-- El formulario de alta ya los exige, pero un formulario evita el error de
-- quien lo usa, no el de quien llama a la API: la garantía es la base.
--
-- ⚠️ Único sobre `lower(correo)`, no sobre `correo`: «Ana@Correo.com» y
-- «ana@correo.com» son el mismo buzón, y Auth los trata igual.
--
-- ⚠️ Falla si ya hay clientes sin correo/teléfono o con correos repetidos. En
-- ese caso NO se borran datos desde aquí: se corrigen a mano y se reintenta.
-- Los `check (… is null or …)` del esquema original se quedan: con NOT NULL
-- la rama `is null` ya no se da nunca, y reescribirlos no aporta nada.
-- =============================================================================

alter table clientes
  alter column correo   set not null,
  alter column telefono set not null;

create unique index clientes_correo_unico on clientes (lower(correo));
