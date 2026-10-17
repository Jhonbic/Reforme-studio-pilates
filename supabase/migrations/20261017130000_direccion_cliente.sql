-- =============================================================================
-- Dirección de residencia del cliente (oct 2026).
--
-- El registro web la pide desde ahora, junto a la fecha de nacimiento, el
-- contacto de emergencia y, si es menor, su acudiente (decisión del usuario).
-- Todo lo demás ya tenía columna; esta era la única que faltaba.
--
-- ⚠️ Admite NULL: los clientes que ya existen y las altas de recepción no la
-- tienen. La obligatoriedad la pone el registro (navegador y servidor). El
-- `check` sí se aplica a todos: si viene, es texto de verdad y con tope, no
-- un espacio en blanco ni un volcado de 10 000 caracteres.
--
-- Texto libre y no campos separados (calle, número, barrio): en Florencia
-- conviven «Cra 1 #27-50», «Barrio Los Pinos, Mz 4 Casa 12» y veredas sin
-- nomenclatura; partirla obligaría a inventar datos para que encaje.
-- =============================================================================

alter table clientes
  add column direccion text
    check (direccion is null or length(trim(direccion)) between 5 and 200);

comment on column clientes.direccion is
  'Dirección de residencia, texto libre. Obligatoria en el registro web; NULL en clientes antiguos y altas de recepción que no la tomaron.';
