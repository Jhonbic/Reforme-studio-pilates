-- =============================================================================
-- Un cliente que se registra en la web llega con la ficha COMPLETA (oct 2026).
--
-- El registro pide, todo obligatorio: correo, teléfono, fecha de nacimiento,
-- dirección, contacto de emergencia y, si es menor, su acudiente (decisión del
-- usuario). El formulario y la server action ya lo validan; esto es la red de
-- debajo, por si alguien inserta con la clave `service_role` sin pasar por ahí.
--
-- ⚠️ **Trigger BEFORE INSERT y no `check` en la tabla.** Un `check` (aunque
-- fuera `not valid`) se vuelve a evaluar en CADA `UPDATE` de la fila: marcar
-- asistencia (`ultima_asistencia`), dar de baja o cambiar un teléfono fallaría
-- en todos los clientes registrados antes de hoy, que no tienen dirección.
--
-- ⚠️ **Solo filas con `cuenta_id` al insertarse**, que es exactamente el
-- registro web. No afecta a:
--   · el alta de recepción (inserta sin cuenta: un adulto mayor sin correo o
--     un menor siguen pudiendo darse de alta en el mostrador);
--   · «Crear contraseña web» (pone `cuenta_id` con un UPDATE a una ficha que
--     ya existía, con los datos que tenga);
--   · la semilla (inserta sin cuenta).
-- =============================================================================

create function clientes_web_con_ficha_completa()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.cuenta_id is null then
    return new;
  end if;

  if new.correo is null
     or new.telefono is null
     or new.fecha_nacimiento is null
     or new.direccion is null
     or new.emergencia_nombre is null or length(trim(new.emergencia_nombre)) < 3
     or new.emergencia_telefono is null then
    raise exception 'Un cliente que se registra en la web necesita correo, teléfono, fecha de nacimiento, dirección y contacto de emergencia.'
      using errcode = '23514';
  end if;

  -- Menor = no ha cumplido 18 HOY (la base va en hora de Bogotá). Cumplirlos
  -- hoy ya es ser mayor: misma regla que `edad()` en la app.
  if new.fecha_nacimiento > (current_date - interval '18 years')::date
     and (new.acudiente_nombre is null
          or new.acudiente_identificacion is null
          or new.acudiente_telefono is null) then
    raise exception 'Un menor de edad necesita los datos de su acudiente.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function clientes_web_con_ficha_completa() is
  'Al insertar un cliente CON cuenta web (el registro), exige la ficha completa y, si es menor, su acudiente. No mira los UPDATE ni las altas sin cuenta.';

create trigger clientes_web_con_ficha_completa
  before insert on clientes
  for each row execute function clientes_web_con_ficha_completa();

-- Supabase concede EXECUTE a anon y authenticated por nombre en cada función
-- nueva: revocar a PUBLIC no basta. (Un trigger se dispara igual sin él.)
revoke execute on function clientes_web_con_ficha_completa() from public, anon, authenticated;
