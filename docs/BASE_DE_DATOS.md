# Base de datos — Supabase

> ✅ **Proyecto: `ngjybazethrflxtuyhhx`**, con las seis migraciones aplicadas
> (sep 2026) y **sin la semilla**: arranca sin datos de ejemplo. El esquema se
> verificó antes en `gdmxiqvmtegusevkqtgt` (Postgres 17, `ca-central-1`), que
> ya no es el que usa la app: allí la semilla cargó 118 clientes y
> `supabase db advisors --type security` salió con **0 errores**.

## Qué hay aquí

```
supabase/
  migrations/
    20260727120000_esquema.sql                     Tablas, enums, vista, triggers
    20260727120100_rls.sql                         RLS + Storage + roles
    20260727130000_seguridad_vista_y_funciones.sql Cierra el fallo de la vista
    20260727130100_revocar_execute_public.sql      Quita EXECUTE a PUBLIC
    20260728120000_planes_destacado.sql            Plan destacado único
    20260930120000_personal_ficha_unica.sql        Personal: una ficha, un rol
    20260930130000_destacar_plan_arreglo.sql       destacar_plan() no funcionaba
    20260930140000_clientes_correo_telefono_obligatorios.sql
                                                   Correo y teléfono obligatorios; correo único
  seed.sql                                         118 clientes, determinista
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

## Desarrollo en local (sep 2026)

**Se desarrolla contra una base en Docker, no contra la real.** Mismas
migraciones, más la semilla (118 clientes, pagos, gastos y la plantilla del
equipo), y se puede tirar y rehacer en segundos.

Requisitos: **Docker Desktop abierto** («Engine running»).

```bash
npx supabase start      # la primera vez descarga ~2-3 GB de imágenes
npm run db:reset        # base desde cero + admin de desarrollo
npm run dev             # ya va contra la base local
```

- **Entrar:** `admin@reforme.local` / `reforme-local`. Lo crea `db:reset`
  (`scripts/db-reset.ts`), **no la semilla**: `seed.sql` se puede subir a la base
  real con `--include-seed`, y ahí una contraseña escrita en el repo sería una
  puerta trasera. El script se niega a correr si la API no está en `127.0.0.1`,
  y sus claves las pide a `supabase status`, no a ningún `.env`.
- **Studio local:** http://127.0.0.1:54323 — las tablas, el SQL Editor y Auth,
  como en supabase.com.
- **Correos:** http://127.0.0.1:54324 (Mailpit). Auth no envía nada fuera: los
  correos de recuperación de contraseña aparecen aquí, así que ese flujo se puede
  probar en local sin SMTP.
- **`npm run dev` usa la local sin tocar nada** porque las claves están en
  `.env.development.local`, que Next antepone a `.env.local` **solo en
  desarrollo**: el build sigue usando la real. Para desarrollar contra la real,
  se renombra ese archivo.
- `npm run alta-personal:local` — el alta de personal, contra la local.
- `npm run db:tipos` — regenera `src/lib/supabase/database.types.ts` desde la
  base local. **Después de cada migración**: los clientes de Supabase están
  tipados con él, y una columna mal escrita la detecta el typecheck.
- `npx supabase stop` apaga los contenedores y **conserva** los datos.

Servicios apagados en `config.toml` para ahorrar RAM: `realtime`, `analytics`
(en Windows exige además exponer el daemon de Docker por TCP), `edge_runtime`,
`storage.vector` y `storage.s3_protocol`. Storage sí está encendido: los
comprobantes de gasto viven ahí.

### Lo primero que encontró la base local

Al tipar los clientes con `database.types.ts`, el typecheck señaló la llamada a
`destacar_plan`. Probándola contra la local salieron **dos fallos que también
están en producción**: la función **nunca había funcionado** (`safeupdate`
rechaza todo `UPDATE` sin `WHERE`, también dentro de una función), y aun con
`WHERE` el índice único se habría saltado según el orden de las filas. Lo cuenta
`20260930130000_destacar_plan_arreglo.sql`. Nadie lo vio porque el catálogo real
arranca vacío y ningún plan se había marcado nunca.

⚠️ **Toda función que haga `UPDATE` o `DELETE` necesita `WHERE`**, aunque sea
para tocar todas las filas.

### El ciclo de un cambio de esquema

1. `npx supabase migration new <nombre>` y escribirla.
2. `npm run db:reset` — si la migración falla, falla aquí, con datos de sobra.
3. `npm run db:tipos` y desarrollar la pantalla contra la local.
4. **Al publicar**, `npx supabase db push` la lleva a la real. Nunca se prueba
   una migración primero en la real.

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

⚠️ **La clave `service_role` no se pone aquí ni en ningún `NEXT_PUBLIC_`.** Esa
clave se salta RLS entera; si acaba en el navegador, la base queda abierta.

### Alta de personal (y el primer administrador)

```bash
npm run alta-personal
```

Pregunta nombre, correo, móvil, rol y, si va a entrar a la app, una
contraseña. Crea la ficha en `equipo` y la cuenta en Supabase Auth **ya
confirmada**, sin esperar a un correo que sin SMTP no llegaría. Qué datos se
piden y cómo se validan vive en `src/lib/personal.ts`: es lo que tendrá que
usar el «Nuevo miembro» del panel el día que exista.

Necesita la clave **secreta** en `.env.admin` (copiar `.env.admin.example`).
⚠️ Es la única excepción a la regla de abajo, y por eso es un script y no una
pantalla: esa clave solo existe en el PC de quien desarrolla y nunca va a
Netlify ni al navegador.

⚠️ **Registrarse no da acceso a nada.** Hasta sep 2026 un trigger creaba un
perfil con rol `Recepción` a toda cuenta nueva. Recepción lee los clientes, así
que el día que `/registro` se conectase, cada clienta habría podido leer los
datos de todas las demás. Se quitó con la ficha única (abajo).

### Personal: una ficha, un rol

Antes había **dos** tablas con rol y nada que las uniera: `perfiles` (quién
entra y con qué permisos) y `equipo` (la plantilla que pinta la pestaña
Equipo). Una persona podía ser Administración en una y Recepción en la otra, y
marcarla inactiva al irse **no le quitaba el acceso**.

Ahora `equipo` es la ficha y la cuenta cuelga de ella con `cuenta_id`, que es
**opcional**: una instructora que solo da clases está en la plantilla y no
entra. `mi_rol()` lee `equipo where cuenta_id = auth.uid() and activo`, así que
dar de baja a alguien le quita el acceso en el mismo gesto. `perfiles` ya no
existe.

⚠️ **La semilla ya no vacía `equipo` con `truncate`**: borra solo las fichas
sin cuenta. Si no, lanzarla dejaría fuera del panel a quien la lanzó.

## Decisiones que se apartan del mock

**0. Correo y teléfono del cliente son obligatorios, y el correo es único**
(sep 2026, `20260930140000`). El correo es el usuario con el que la clienta
inicia sesión; el teléfono, por donde se la avisa. Único sobre
`lower(correo)`: «Ana@Correo.com» y «ana@correo.com» son el mismo buzón.
⚠️ **El seed generaba solo 20 correos distintos para 118 clientes** (nombre y
apellido se repiten), así que ahora lleva el índice en el correo
(`laura.gutierrez0@correo.com`). ⚠️ **Antes de aplicarla en la nube**, la base
remota tiene que estar sin correos repetidos ni nulos: la migración falla en
vez de borrar nada. Si allí se cargó el seed viejo, hay que recargarlo.

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

**7. El plan destacado se marca a mano** (`planes.destacado`, jul 2026). La
pantalla lo derivaba del plan con más clientes, que en una herramienta interna
es lo útil: enseña cuál se vende de verdad y no cuál querríamos destacar. Dejó
de funcionar al decidir que **el catálogo arranca vacío** — con todos los planes
a cero clientes, el cálculo marcaba a uno cualquiera con el cartel «El más
contratado» sin tener ni uno.

⚠️ **Solo puede haber uno, y lo garantiza la base**: `solo_un_plan_destacado` es
un índice único parcial sobre las filas marcadas, que al compartir todas el
valor `true` solo admite una.

⚠️ **Marcar uno desmarca el anterior EN UNA SOLA SENTENCIA**, dentro de la
función `destacar_plan()`:

```sql
update planes set destacado = (id is not distinct from plan_id);
```

Dos updates seguidos desde el navegador no serían atómicos: si el segundo
fallara, el catálogo se quedaría sin ninguno; y entre uno y otro se violaría el
índice. Es `is not distinct from` y no `=` porque con `plan_id` a NULL —quitar
el destacado sin poner otro— `id = NULL` daría NULL sobre una columna `not null`.

## RLS: dónde está la seguridad de verdad

**Un middleware de Next evita que se pinte una página; RLS evita que la base
devuelva una fila.** Si alguien saca la clave publishable del navegador y llama a la
API directamente, lo único que le para es esto.

| Rol | Clientes | Pagos | Planes | Gastos |
|---|---|---|---|---|
| Administración | todo | leer, registrar | todo | todo |
| Recepción | leer, crear, editar | leer, registrar | leer | — |
| Instructora | leer | — | leer | — |

Sin ficha **activa** en `equipo` con su `cuenta_id`, una cuenta autenticada
**no ve nada**. Estar en
`auth.users` no da acceso por sí solo.

Una instructora no ve gastos a propósito: no tiene por qué conocer la nómina.

## Lo que ya está conectado (jul 2026)

**Autenticación y el catálogo de Planes.** El resto de pantallas sigue leyendo
`mock.ts`.

- `@supabase/supabase-js` y `@supabase/ssr` instalados.
- `src/lib/supabase/servidor.ts` y `navegador.ts` — los dos clientes.
- **`src/proxy.ts`** refresca la sesión y manda a `/login` a quien no la tenga.
- `/login` entra de verdad con `signInWithPassword`, y el rol sale de `mi_rol()`
  en vez de deducirse del dominio del correo.
- `getUsuarioActual()` y `getPlanes()` son `async` y consultan.
- `src/app/admin/planes/acciones.ts` — crear, editar y eliminar planes.

⚠️ **`middleware.ts` NO existe en Next 16: el convenio es `proxy.ts`**, y la
función se exporta como `proxy`. Toda la documentación de Supabase que circula
usa todavía el nombre viejo; copiarla tal cual deja el archivo sin ejecutarse
nunca y el panel abierto sin que nada avise. El build lo confirma en su tabla:
`ƒ Proxy (Middleware)`.

⚠️ **La puerta del panel son DOS comprobaciones, no una.** `proxy.ts` mira si
hay cookie —comprobación optimista, que es lo que Next recomienda para algo que
corre en cada navegación— y `src/app/admin/layout.tsx` comprueba contra la base
que además haya **perfil de personal**. Sin lo segundo, una clienta registrada
que escriba `/admin` pasaría el proxy. Y sin ninguna de las dos seguiría sin ver
datos, porque quien lo impide de verdad es RLS.

### Lo que queda

1. Migrar el resto de `queries.ts`: clientes, membresías, pagos, clases,
   finanzas. **Las pantallas apenas se tocan** — toda la UI pasa por ahí, esa
   disciplina se mantuvo justo para este día.
2. Mutaciones para el alta de cliente, el registro de gasto y la agenda.
3. Tablas de **clases** y **reservas**, que el esquema todavía no tiene.

⚠️ Al conectar, **las rutas de `/admin` dejan de prerenderizarse**, y eso ya
pasó: las nueve salen `ƒ (Dynamic)` en el build, incluida
`/admin/usuarios/[id]`, que era `● SSG` con 118 fichas. Es el precio de tener
datos reales, no algo de Supabase. Corolario: su `generateStaticParams` ya no
prerenderiza nada: se decide qué hacer con él cuando clientes se migre.

⚠️ `getHoy()` devuelve la constante congelada `HOY = "2026-07-25"`. Ese es el
único sitio a cambiar para que pase a ser la fecha real.

## Recuperar contraseña y correos de autenticación

El código está hecho (sep 2026): `/recuperar` pide el enlace,
`src/app/auth/confirmar/route.ts` lo canjea por una sesión y
`/nueva-contrasena` guarda la nueva y **cierra la sesión en todos los
dispositivos**. Pero **no funciona hasta configurar tres cosas en el panel de
Supabase**, y ninguna está en el repo:

1. **SMTP propio** (*Authentication → Emails → SMTP Settings*). ⚠️ **Es
   bloqueante y no depende del plan:** el correo que trae Supabase —en Free y
   en Pro— es de pruebas, envía unos 2 por hora y **solo a los miembros del
   equipo del proyecto**. Probándolo ustedes funcionaría; a una clienta no le
   llegaría nada. Resend gratis (3.000/mes) sobra. Pide verificar el dominio
   con 3-4 registros DNS → hace falta acceso al panel del dominio.
2. **URLs** (*Authentication → URL Configuration*):
   - *Site URL*: el dominio de producción.
   - *Redirect URLs*: `http://localhost:3000/**`, el dominio de producción con
     `/**` y el patrón de vistas previas de Netlify
     (`https://*--<sitio>.netlify.app/**`).
   - ⚠️ Si la URL desde la que se pide no está en la lista, Supabase la
     cambia **en silencio** por la Site URL, que no lleva `/auth/confirmar`: el
     enlace llega roto y nadie lo avisa.
3. **Plantilla *Reset password*** (*Authentication → Emails → Templates*). ⚠️ El
   enlace por defecto usa `?code=` (PKCE), que **solo se canjea en el mismo
   navegador** que lo pidió: en móvil se pide desde Chrome, el correo se abre
   en la app de Gmail y el enlace dice «inválido» siendo correcto. Hay que
   cambiarlo por `token_hash`. Asunto: `Recupera tu contraseña · Reforme`.

```html
<h2>Recupera tu contraseña</h2>
<p>Hola, recibimos una solicitud para cambiar la contraseña de tu cuenta en Reforme Studio Pilates.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Elegir una contraseña nueva</a></p>
<p>El enlace caduca en una hora y solo sirve una vez. Si no lo pediste tú, ignora este correo: tu contraseña sigue siendo la misma.</p>
<p>Reforme Studio Pilates · Movimiento con Propósito</p>
```

`{{ .RedirectTo }}` es el `redirectTo` que manda `/recuperar`, ya con
`/auth/confirmar` al final: así el enlace vuelve al mismo sitio desde el que se
pidió (localhost, vista previa o producción) sin tocar la plantilla.

## Variables de entorno

Ver [`.env.example`](../.env.example). Son dos, las dos públicas.

⚠️ **La clave `service_role` no aparece en este proyecto.** Se salta RLS entera.
Todo el panel funciona con la clave publishable justamente porque la seguridad está
en las policies y no en qué clave se use.

## Verificar

Sin Docker no hay entorno local, pero el CLI consulta el proyecto remoto:

```bash
npx supabase db query --linked "<sql>"     # una consulta
npx supabase db query --linked -f fichero.sql
npx supabase db advisors --linked --type security
```

⚠️ **`db push --include-seed` no vuelve a ejecutar la semilla si ya corrió
antes**: detecta que el hash cambió, lo actualiza y no hace nada más. Para
recargarla de verdad, `db query -f supabase/seed.sql`. La semilla empieza con un
`truncate`, así que es idempotente.

Estado verificado hoy:

```sql
-- Reparto de estados → 87 Activa · 12 Inactiva · 12 Vencida · 7 Por vencer = 118
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
