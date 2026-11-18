-- =============================================================================
-- Registros que nunca compraron: se borran solos a los 10 días.
--
-- Decisión del usuario (18 nov 2026): quien se registra (por la web o en
-- recepción) y en 10 días no ha comprado ningún plan ocupa espacio y ensucia
-- la lista «Sin plan». Cada noche se borran su ficha y su cuenta web. Sin
-- aviso previo.
--
-- Solo se borra quien NO tiene historia en el estudio:
--   · ninguna membresía (ni vigente, ni vencida, ni por empezar);
--   · ningún pago, ninguna reserva, nada en la lista de espera;
--   · no está de baja (dar de baja es una decisión de recepción y se respeta);
--   · su ficha se creó hace más de 10 días (`creado_en`, que nadie edita; no
--     `alta`, que es una fecha de negocio).
--
-- La cuenta web se borra también, SALVO que sea además del equipo (tiene
-- perfil o fila en `equipo`): un cliente que pasó a trabajar aquí conserva su
-- acceso al panel.
-- =============================================================================

create or replace function borrar_registros_sin_plan(p_dias integer default 10)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_cuentas uuid[];
  v_borrados integer;
begin
  if p_dias is null or p_dias < 1 then
    raise exception 'p_dias tiene que ser 1 o más';
  end if;

  with candidatos as (
    select c.id, c.cuenta_id
    from clientes c
    where c.creado_en < now() - make_interval(days => p_dias)
      and c.baja is null
      and not exists (select 1 from membresias m  where m.cliente_id = c.id)
      and not exists (select 1 from pagos p       where p.cliente_id = c.id)
      and not exists (select 1 from reservas r    where r.cliente_id = c.id)
      and not exists (select 1 from lista_espera l where l.cliente_id = c.id)
  ),
  borrados as (
    delete from clientes c
    using candidatos k
    where c.id = k.id
    returning k.cuenta_id
  )
  select array_agg(cuenta_id) filter (where cuenta_id is not null), count(*)
    into v_cuentas, v_borrados
  from borrados;

  -- ⚠️ `where` explícito siempre (pg_safeupdate).
  if v_cuentas is not null then
    delete from auth.users u
    where u.id = any (v_cuentas)
      and not exists (select 1 from perfiles pf where pf.id = u.id)
      and not exists (select 1 from equipo e   where e.cuenta_id = u.id);
  end if;

  return v_borrados;
end $$;

comment on function borrar_registros_sin_plan(integer) is
  'Borra fichas (y su cuenta web) sin membresías, pagos, reservas ni lista de espera, creadas hace más de p_dias días. La llama el cron cada noche.';

-- Interna: solo el cron (que corre como postgres). Nadie desde la API.
revoke execute on function borrar_registros_sin_plan(integer) from public, anon, authenticated;

-- Cada noche a las 03:30 de Bogotá (08:30 UTC), después de la agenda.
select cron.unschedule(jobid) from cron.job where jobname = 'borrar-registros-sin-plan';
select cron.schedule('borrar-registros-sin-plan', '30 8 * * *',
  $$select public.borrar_registros_sin_plan(10)$$);
