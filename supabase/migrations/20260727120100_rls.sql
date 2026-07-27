-- =============================================================================
-- Row Level Security
--
-- ⚠️ **Esto es la protección de verdad, no el middleware de Next.**
-- Un middleware evita que se pinte una página; RLS evita que la base devuelva
-- una fila. Si mañana alguien añade una consulta y se olvida de filtrar, o si
-- alguien saca la clave anónima del navegador y llama a la API directamente,
-- lo único que le para es esto.
--
-- Modelo de roles (`rol_equipo` en `perfiles`):
--   · Administración — lee y escribe todo, incluidos dinero y catálogo.
--   · Recepción      — atiende el mostrador: da de alta clientes y cobra.
--                      NO toca precios, gastos ni presupuesto.
--   · Instructora    — solo lee clientes y equipo. Ni dinero ni catálogo.
--
-- Sin fila en `perfiles`, una cuenta autenticada no ve NADA. Crear el usuario
-- en `auth.users` no da acceso por sí solo: hay que darle perfil.
-- =============================================================================

alter table perfiles     enable row level security;
alter table planes       enable row level security;
alter table clientes     enable row level security;
alter table membresias   enable row level security;
alter table pagos        enable row level security;
alter table equipo       enable row level security;
alter table gastos       enable row level security;
alter table presupuestos enable row level security;


-- Ayudante: el rol de quien está llamando ------------------------------------
-- `security definer` para que pueda leer `perfiles` sin quedar atrapada en la
-- propia política de `perfiles` (recursión infinita).
-- `search_path` fijado: sin esto, `security definer` es una vía de escalada de
-- privilegios si alguien crea un esquema que sombree a `public`.

create or replace function mi_rol()
returns rol_equipo
language sql
stable
security definer
set search_path = public
as $$
  select rol from perfiles where id = auth.uid()
$$;

create or replace function es_admin()
returns boolean
language sql
stable
as $$
  select mi_rol() = 'Administración'
$$;

create or replace function es_mostrador()
returns boolean
language sql
stable
as $$
  select mi_rol() in ('Administración', 'Recepción')
$$;

-- `tiene_perfil()` y no `auth.uid() is not null`: estar autenticado no basta,
-- hay que estar dado de alta como personal del estudio.
create or replace function tiene_perfil()
returns boolean
language sql
stable
as $$
  select mi_rol() is not null
$$;


-- perfiles -------------------------------------------------------------------
-- Cada cual ve el suyo; Administración ve y gestiona todos.
-- ⚠️ Nadie puede cambiarse el rol a sí mismo: el UPDATE propio no está
-- permitido, solo el de Administración.

create policy "perfiles: veo el mío"
  on perfiles for select
  using (id = auth.uid() or es_admin());

create policy "perfiles: solo Administración gestiona"
  on perfiles for all
  using (es_admin())
  with check (es_admin());


-- planes ---------------------------------------------------------------------
-- Los lee cualquiera del estudio (recepción necesita el precio para cobrar);
-- solo Administración los toca.

create policy "planes: lectura del personal"
  on planes for select
  using (tiene_perfil());

create policy "planes: escritura de Administración"
  on planes for all
  using (es_admin())
  with check (es_admin());


-- clientes -------------------------------------------------------------------
-- Aquí viven cédulas, teléfonos y correos de personas reales. Lectura para
-- todo el personal (una instructora necesita saber a quién tiene en clase),
-- escritura para el mostrador.
-- ⚠️ Borrar es solo de Administración: dar de baja a alguien por error se
-- lleva por delante sus membresías (`on delete cascade`).

create policy "clientes: lectura del personal"
  on clientes for select
  using (tiene_perfil());

create policy "clientes: alta y edición del mostrador"
  on clientes for insert
  with check (es_mostrador());

create policy "clientes: edición del mostrador"
  on clientes for update
  using (es_mostrador())
  with check (es_mostrador());

create policy "clientes: borrado solo de Administración"
  on clientes for delete
  using (es_admin());


-- membresias -----------------------------------------------------------------

create policy "membresias: lectura del personal"
  on membresias for select
  using (tiene_perfil());

create policy "membresias: alta del mostrador"
  on membresias for insert
  with check (es_mostrador());

create policy "membresias: edición y borrado de Administración"
  on membresias for update
  using (es_admin())
  with check (es_admin());

create policy "membresias: borrado de Administración"
  on membresias for delete
  using (es_admin());


-- pagos ----------------------------------------------------------------------
-- ⚠️ Un pago se registra pero NO se edita ni se borra, ni siquiera por
-- Administración. Es un asiento contable: si se cobró de más, se registra una
-- devolución; no se reescribe la historia. Corregir un error real exige
-- entrar por el panel de Supabase, que queda en el registro de auditoría.

create policy "pagos: lectura del mostrador"
  on pagos for select
  using (es_mostrador());

create policy "pagos: registro del mostrador"
  on pagos for insert
  with check (es_mostrador());


-- equipo ---------------------------------------------------------------------

create policy "equipo: lectura del personal"
  on equipo for select
  using (tiene_perfil());

create policy "equipo: gestión de Administración"
  on equipo for all
  using (es_admin())
  with check (es_admin());


-- gastos y presupuesto -------------------------------------------------------
-- Dinero que sale: solo Administración, ni siquiera lectura para el resto.
-- Una instructora no tiene por qué ver la nómina.

create policy "gastos: solo Administración"
  on gastos for all
  using (es_admin())
  with check (es_admin());

create policy "presupuestos: solo Administración"
  on presupuestos for all
  using (es_admin())
  with check (es_admin());


-- Storage: comprobantes de gasto ---------------------------------------------
-- Bucket privado. Las facturas llevan datos del proveedor y del estudio.

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

create policy "comprobantes: solo Administración lee"
  on storage.objects for select
  using (bucket_id = 'comprobantes' and es_admin());

create policy "comprobantes: solo Administración sube"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes' and es_admin());


-- Alta automática de perfil --------------------------------------------------
-- ⚠️ Se crea con rol 'Recepción', el MENOS privilegiado que sigue siendo útil,
-- no con 'Administración'. Quien monte el primer usuario tendrá que ascenderlo
-- a mano desde el panel de Supabase — es una molestia de una sola vez a cambio
-- de que registrarse nunca conceda el rol máximo por accidente.

create or replace function crear_perfil_al_registrarse()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'Recepción'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function crear_perfil_al_registrarse();
