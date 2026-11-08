-- =============================================================================
-- Mi perfil (nov 2026): el cliente corrige él mismo sus datos de contacto
-- desde /mi-cuenta (formato de «Mi perfil» de DEMO adminGym, decisión del
-- usuario).
--
-- Solo los de CONTACTO: teléfono, dirección, EPS y contacto de emergencia.
-- Nombre, correo (es su usuario), documento, fecha de nacimiento y acudiente
-- siguen siendo cosa de recepción, que comprueba quién es: dejar cambiarlos
-- desde la web abriría la puerta a quedarse con la ficha de otro.
--
-- El cliente no tiene UPDATE sobre `clientes` (RLS) y no se le da: una
-- política de UPDATE no puede limitar QUÉ columnas cambia. Por eso es una
-- función `security definer` que solo toca esas cinco y solo en su ficha.
-- =============================================================================

create function actualizar_mis_datos(
  p_telefono            text,
  p_direccion           text,
  p_eps                 text,
  p_emergencia_nombre   text,
  p_emergencia_telefono text
)
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
  if p_telefono is null or p_telefono !~ '^3\d{9}$' then
    raise exception 'Un móvil colombiano son 10 dígitos y empieza por 3.' using errcode = 'P0001';
  end if;
  if p_emergencia_telefono is null or p_emergencia_telefono !~ '^3\d{9}$' then
    raise exception 'El teléfono de emergencia tiene que ser un móvil colombiano.' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_emergencia_nombre, ''))) < 3 then
    raise exception 'Escribe el nombre de tu contacto de emergencia.' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_direccion, ''))) not between 5 and 200 then
    raise exception 'Escribe la dirección completa.' using errcode = 'P0001';
  end if;

  update clientes set
    telefono            = p_telefono,
    direccion           = trim(p_direccion),
    eps                 = nullif(trim(coalesce(p_eps, '')), ''),
    emergencia_nombre   = trim(p_emergencia_nombre),
    emergencia_telefono = p_emergencia_telefono
  where id = v_cliente;
end $$;

-- Supabase concede EXECUTE a `anon` por nombre: hay que quitárselo también.
revoke execute on function actualizar_mis_datos(text, text, text, text, text) from public, anon;
grant execute on function actualizar_mis_datos(text, text, text, text, text) to authenticated;
