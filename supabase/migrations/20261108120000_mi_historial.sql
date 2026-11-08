-- =============================================================================
-- Historial del cliente (nov 2026): el calendario «Tus clases» del Inicio de
-- /mi-cuenta.
--
-- El cliente lee SUS reservas (RLS), pero no la tabla `clases`: sin esto no
-- sabe ni la fecha de las clases a las que fue. Mismo patrón que
-- `agenda_cliente`: `security definer` que solo devuelve lo del propio
-- cliente, sin exponer el equipo (solo el nombre de la instructora) ni a los
-- demás clientes.
--
-- Solo clases que YA EMPEZARON: las futuras ya llegan por `agenda_cliente`.
-- Incluye las que el estudio canceló (`cancelada`), para que el calendario no
-- las cuente como tomadas pero tampoco desaparezcan sin explicación.
-- =============================================================================

create function mi_historial(p_desde date, p_hasta date)
returns table (
  reserva_id    uuid,
  fecha         date,
  hora_inicio   time,
  duracion_min  integer,
  tipo          tipo_clase,
  instructora   text,
  asistencia    asistencia,
  cancelada     boolean
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
    select r.id, c.fecha, c.hora_inicio, c.duracion_min, c.tipo, e.nombre,
           r.asistencia, c.cancelada
    from reservas r
    join clases c on c.id = r.clase_id
    join equipo e on e.id = c.instructora_id
    where r.cliente_id = v_cliente
      -- Como mucho un año hacia atrás desde `p_hasta`: la pantalla pide seis meses.
      and c.fecha between greatest(p_desde, p_hasta - 366) and p_hasta
      and (c.fecha + c.hora_inicio) <= localtimestamp
    order by c.fecha, c.hora_inicio;
end $$;

-- Permisos: Supabase concede EXECUTE a `anon` por nombre; hay que quitárselo
-- también a él, no solo a PUBLIC.
revoke execute on function mi_historial(date, date) from public, anon;
grant execute on function mi_historial(date, date) to authenticated;
