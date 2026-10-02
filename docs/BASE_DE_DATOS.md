# Base de datos — Supabase

> ✅ **Aplicado y verificado** contra el proyecto `gdmxiqvmtegusevkqtgt`
> (Postgres 17, región `ca-central-1`). Las cuatro migraciones pasan, la semilla
> carga los clientes de ejemplo (20 desde oct 2026; eran 118) y `supabase db advisors --type security` sale con **0
> errores**.

## Qué hay aquí

```
supabase/
  migrations/
    20260727120000_esquema.sql                     Tablas, enums, vista, triggers
    20260727120100_rls.sql                         RLS + Storage + roles
    20260727130000_seguridad_vista_y_funciones.sql Cierra el fallo de la vista
    20260727130100_revocar_execute_public.sql      Quita EXECUTE a PUBLIC
    20261001120000_perfil_no_automatico.sql        Registrarse ya no da acceso
    20261001130000_zona_horaria_bogota.sql         current_date en hora de Bogotá
    20261001140000_estado_sin_plan.sql             Nuevo estado «Sin plan»
    20261001140100_vista_sin_plan.sql              La vista lo usa (security_invoker)
    20261001150000_registrar_membresia.sql         Membresía + pago atómicos; «Inactiva» desde el pago
    20261001160000_equipo_y_cuentas.sql            equipo.cuenta_id + cambiar_rol_equipo
  seed.sql                                         20 clientes, determinista
```

## Dos fallos que salieron al ejecutarlo

Los dos se encontraron **verificando**, no leyendo. Quedan documentados porque
son fáciles de repetir.

### 1. La vista se saltaba RLS (grave)

En Postgres una vista se ejecuta con los permisos de **quien la creó**, no de
quien la consulta. `clientes_vigentes` la creó la migración (superusuario), así
que devolvía las 118 filas a cualquiera — incluido el rol `anon`, que es el de
la clave pública **que viaja en el navegador**. Nombre, cédula, teléfono y
correo de todos los clientes, legibles sin autenticarse.

```
antes:  select count(*) from clientes           con anon →   0  ✅
        select count(*) from clientes_vigentes  con anon → 118  ❌
después: las dos → 0
```

Lo arregla `alter view ... set (security_invoker = on)`. **Cualquier vista nueva
sobre tablas con RLS necesita esa opción**, o abre el mismo agujero.

### 2. Revocar permisos a `anon` no sirve de nada

Postgres concede `EXECUTE` a **`PUBLIC`** al crear una función. Revocárselo a
`anon` y `authenticated` no quita nada: heredaban el de `PUBLIC`. Hay que
revocar a `PUBLIC` y volver a conceder solo a quien deba tenerlo.

Y todo lo que vive en `public` queda publicado como endpoint REST en
`/rest/v1/rpc/<nombre>`, funciones de trigger incluidas.

> Revocar `EXECUTE` **no rompe los triggers**: Postgres no comprueba ese permiso
> cuando un trigger se dispara. Verificado intentando insertar un pago con fecha
> futura después de revocar — lo sigue rechazando.

## Puesta en marcha

```bash
# 1. Crear el proyecto en supabase.com (región: East US, la más cercana a Colombia)

# 2. Enlazar este repo con él
npx supabase init          # crea supabase/config.toml
npx supabase link --project-ref <ref-del-proyecto>

# 3. Aplicar el esquema
npx supabase db push

# 4. Cargar los datos de ejemplo (SOLO en desarrollo)
npx supabase db reset      # ⚠️ borra y recrea: nunca contra producción
```

Luego, en `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clave anónima>
```

⚠️ **La clave `service_role` no se pone aquí ni en ningún `NEXT_PUBLIC_`.** Esa
clave se salta RLS entera; si acaba en el navegador, la base queda abierta.

### Acceso del equipo

Desde oct 2026 el acceso se da **desde el panel** (Usuarios → Equipo → la
persona → «Dar acceso al panel»), no con SQL. Requiere la variable
`SUPABASE_SERVICE_ROLE_KEY` en el servidor (Vercel → Settings → Environment
Variables; el valor está en Supabase → Project Settings → API → `service_role`).
**Nunca** con prefijo `NEXT_PUBLIC_`.

### El primer usuario

**Crear una cuenta no da acceso al panel** (desde la migración
`20261001120000_perfil_no_automatico.sql`). El acceso es la fila en `perfiles`,
y la da Administración. El primer administrador se crea en dos pasos:

1. Supabase → Authentication → Users → **Add user** (marca «Auto Confirm User»).
2. En el SQL Editor:

```sql
insert into perfiles (id, nombre, rol)
select id, 'Tu nombre', 'Administración' from auth.users
where email = 'tu@correo.com';
```

Antes, un trigger (`al_crear_usuario`) daba perfil de `Recepción` a toda cuenta
nueva. Se quitó porque Supabase deja registrarse con la clave anónima, que es
pública: cualquiera podía crearse una cuenta por la API y leer los clientes.
**Verificado** en local, antes y después: un registro por la API ve 0 filas en
`clientes` y en `clientes_vigentes`.

## Decisiones que se apartan del mock

**1. `planes` es una tabla, no un enum.** En `types.ts`, `TipoPlan` es una unión
cerrada de cuatro literales — por eso el formulario de alta de plan no puede
guardar hoy: un nombre libre no cabe ahí. Como tabla, crear un plan es un
`INSERT`. `BorradorPlan` deja de ser necesario.

**2. La membresía se separa del cliente.** El mock mete plan, vencimiento e
importe dentro de `Cliente`, así que solo cabe la última renovación. Con
`membresias` aparte hay histórico: se puede saber quién lleva tres años y quién
entró en marzo.

Además el importe se **copia** al contratar en vez de leerse del plan: si mañana
sube el precio, lo que esa persona pagó no puede cambiar solo.

**3. El estado no se guarda, se calcula** (`estado_de_membresia()`). Guardado,
un cliente «Activa» cuya membresía venció ayer sigue diciendo «Activa» hasta que
alguien lo corrija a mano — un dato que envejece solo.

⚠️ **El orden del `CASE` es la definición**, y hay un caso que se decide ahí:
alguien que vence en 10 días y lleva 60 sin venir sale **«Por vencer»**, no
«Inactiva». Se prioriza lo accionable (hay que llamarle) sobre el diagnóstico.
Cambiar ese orden cambia las cifras del dashboard.

**4. El pago es el hecho; el vencimiento se deriva de él.** En el mock era al
revés, y por eso salían cobros fechados en el futuro (una «Clase suelta» de un
día con vencimiento a cuatro meses). Aquí es imposible por construcción, y
además lo impide un trigger.

⚠️ Ese trigger existe porque **un `CHECK` no puede usar `current_date`**:
Postgres exige que las funciones de un `CHECK` sean `IMMUTABLE`, y la fecha de
hoy no lo es.

**5. `presupuestos` es su propia tabla.** En el mock era una columna dentro de
`GASTOS`, lo que obligaba a repetir el presupuesto en cada fila e impedía tener
presupuesto de un mes sin gastos.

**6. Los pagos no se editan ni se borran, ni siquiera por Administración.** Es
un asiento contable: si se cobró de más, se registra una devolución; no se
reescribe la historia.

## RLS: dónde está la seguridad de verdad

**Un middleware de Next evita que se pinte una página; RLS evita que la base
devuelva una fila.** Si alguien saca la clave anónima del navegador y llama a la
API directamente, lo único que le para es esto.

| Rol | Clientes | Pagos | Planes | Gastos |
|---|---|---|---|---|
| Administración | todo | leer, registrar | todo | todo |
| Recepción | leer, crear, editar | leer, registrar | leer | — |
| Instructora | leer | — | leer | — |

Sin fila en `perfiles`, una cuenta autenticada **no ve nada**. Estar en
`auth.users` no da acceso por sí solo.

Una instructora no ve gastos a propósito: no tiene por qué conocer la nómina.

## Lo que falta para que la app lo use

**La autenticación ya está conectada (oct 2026). Los datos del panel siguen
saliendo de `mock.ts`.**

Hecho:

1. ✅ `@supabase/supabase-js` + `@supabase/ssr`. Cliente de servidor en
   `src/lib/supabase/server.ts`. No hay cliente de navegador: hoy nada lo
   necesita.
2. ✅ **`src/proxy.ts`** (en Next 16 `middleware` pasó a llamarse `proxy`).
   Refresca la sesión y manda a `/login?siguiente=…` a quien entra a `/admin`
   sin sesión. Su matcher es solo `/admin/:path*`: la landing no paga el viaje
   a Supabase.
3. ✅ **`/login` de verdad**: server action `iniciarSesion` en
   `src/lib/auth/acciones.ts`, con `signInWithPassword`.
   - El error es **el mismo** para un correo desconocido y para una contraseña
     mala: distinguirlos le diría a quien prueba correos cuáles existen.
   - Una cuenta **sin fila en `perfiles`** no entra. Se le cierra la sesión y
     recibe un mensaje.
   - `?siguiente=` solo acepta rutas `/admin…`. `//otra-web.com` cae en
     `/admin`, para que el login no sirva de trampolín a otra web.
4. ✅ **Segunda puerta en el layout**: `getUsuarioActual()` (en `queries.ts`)
   lee la sesión con `getUser()` y el perfil. Sin las dos cosas, redirige a
   `/login`. La cabecera enseña la cuenta real, y «Cerrar sesión» es un
   `<form>` con server action, no un enlace.

Falta:

5. Reescribir las ~17 funciones de datos de `queries.ts` para que sean `async`
   y consulten. **Hechas: `getClientes`, `getCliente`, `getMovimientos`
   (pagos + gastos), `getPresupuestos`, `getPlanes`, `getDatosDashboard`,
   `getNotificaciones`**. Sigue en `mock.ts`: equipo, clases y los avisos de
   ejemplo de la campana. (y `getConteoEstados`,
   que ahora cuenta sobre la lista recibida). Tipos generados en
   `src/lib/supabase/tipos.ts`. **Las pantallas apenas se tocan**: toda la UI pasa por ahí, y
   esa disciplina se mantuvo justo para este día.
6. Mutaciones (server actions) para los formularios que hoy no guardan.
   **Hechas**, en `src/lib/admin/acciones.ts`: `crearCliente`,
   `registrarGasto` (con subida del comprobante al bucket `comprobantes`),
   `guardarPlan`, `cambiarVentaPlan`, `eliminarPlan` y `asignarPlan` (que
   llama a la función `registrar_membresia`).
   ⚠️ Toda función nueva en `public`: revocar EXECUTE a `public` **y a
   `anon`** por nombre; Supabase se lo concede a `anon` directamente.

⚠️ **Las rutas de `/admin` ya no se prerenderizan** (salen `ƒ` en el build):
leer la sesión usa cookies. `/login` también es dinámica, porque lee
`?siguiente=` y `?error=`. La landing y `/registro` siguen `○ Static`.

⚠️ **Vercel necesita las dos variables** de `.env.example`
(`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`), con los
valores del proyecto remoto, **antes** de desplegar esto. Sin ellas `/admin`
da error 500: falla cerrado, no abierto.

✅ **Cerrado el agujero del registro abierto** (oct 2026): crear una cuenta ya
no da perfil. Ver «El primer usuario».

⚠️ `getHoy()` devuelve la constante congelada `HOY = "2026-07-25"`. Ese es el
único sitio a cambiar para que pase a ser la fecha real.

## Entorno local (Docker)

Instalado en el PC de desarrollo (oct 2026): **WSL2** (`wsl --install
--no-distribution`) + **Docker Desktop** (`winget install -e --id
Docker.DockerDesktop`). Hace falta reiniciar Windows una vez tras instalarlos y
abrir Docker Desktop antes de usar el CLI.

```bash
npx supabase start     # levanta Postgres, Auth, Studio… (la 1ª vez descarga imágenes)
npx supabase status    # URL local y claves anon/service_role
npx supabase db reset  # reaplica migraciones + seed.sql en LOCAL
npx supabase stop      # apaga los contenedores y libera la RAM
```

- API en `http://127.0.0.1:54321`, Studio en `http://127.0.0.1:54323`,
  correos de prueba (Auth) en `http://127.0.0.1:54324`.
- ⚠️ **Probar migraciones aquí antes del `db push`**: `db reset` local se puede
  repetir sin miedo; el proyecto remoto es el único que hay.
- **Cuentas de prueba (solo local).** No están en `seed.sql` a propósito:
  la semilla también se ejecuta contra el remoto, y una contraseña conocida
  ahí sería una puerta abierta. Se crean con la API de admin de Auth y la
  clave `service_role` local. Un `db reset` las borra.
  - `admin@reforme.local` / `reforme-local`: perfil `Administración`, entra
    al panel. Tras un `db reset` hay que volver a crearla e insertarle el
    perfil a mano: ya no hay trigger que lo haga.
  - `cliente@reforme.local` / `reforme-local`: **sin perfil**, sirve para
    probar el rechazo.
  - `instructora@reforme.local` / `reforme-local`: perfil `Instructora`, para
    comprobar lo que RLS le oculta (pagos, gastos).
- ⚠️ **El PC tiene ~8 GB de RAM.** La pila completa de Supabase más
  `next dev` y VS Code va justa: `supabase stop` al terminar, y si se queda
  corto, desactivar en `config.toml` lo que no se usa (hoy `realtime`,
  `storage`).

## Verificar

Sin `supabase start`, el CLI consulta igualmente el proyecto remoto:

```bash
npx supabase db query --linked "<sql>"     # una consulta
npx supabase db query --linked -f fichero.sql
npx supabase db advisors --linked --type security
```

⚠️ **`db push --include-seed` no vuelve a ejecutar la semilla si ya corrió
antes**: detecta que el hash cambió, lo actualiza y no hace nada más. Para
recargarla de verdad, `db query --linked -f supabase/seed.sql`. La semilla
empieza con un `truncate`, así que es idempotente. El `truncate` **no toca
`perfiles` ni `auth.users`**: recargarla no quita el acceso a nadie.

⚠️ **En LOCAL, `db query --local -f` falla** con «cannot insert multiple
commands into a prepared statement»: no acepta un archivo con varias
sentencias. Se carga con `psql` dentro del contenedor:

```bash
docker exec -i supabase_db_gdmxiqvmtegusevkqtgt psql -U postgres -v ON_ERROR_STOP=1 -q < supabase/seed.sql
```

Estado verificado hoy:

```sql
-- Reparto de estados → 11 Activa · 4 Vencida · 3 Por vencer · 2 Inactiva = 20
select estado, count(*) from clientes_vigentes group by estado order by 2 desc;

-- Pagos en el futuro → 0
select count(*) from pagos where fecha > current_date;

-- Membresías que vencen antes de empezar → 0
select count(*) from membresias where vencimiento < inicio;

-- RLS con la clave del navegador → 0 filas, tabla y vista
set local role anon; select count(*) from clientes;
set local role anon; select count(*) from clientes_vigentes;
```

El único aviso que deja el analizador es **deliberado**: `mi_rol()` se concede a
`authenticated` porque la UI necesita saber el rol de quien ha entrado.
