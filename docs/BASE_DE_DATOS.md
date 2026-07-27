# Base de datos — Supabase

> ✅ **Aplicado y verificado** contra el proyecto `gdmxiqvmtegusevkqtgt`
> (Postgres 17, región `ca-central-1`). Las cuatro migraciones pasan, la semilla
> carga 118 clientes y `supabase db advisors --type security` sale con **0
> errores**.

## Qué hay aquí

```
supabase/
  migrations/
    20260727120000_esquema.sql                     Tablas, enums, vista, triggers
    20260727120100_rls.sql                         RLS + Storage + roles
    20260727130000_seguridad_vista_y_funciones.sql Cierra el fallo de la vista
    20260727130100_revocar_execute_public.sql      Quita EXECUTE a PUBLIC
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

### El primer usuario

El trigger `al_crear_usuario` da a toda cuenta nueva el rol **`Recepción`**, no
`Administración`. Es deliberado: registrarse nunca debe conceder el rol máximo.
Para el primer administrador, tras registrarte, en el SQL Editor de Supabase:

```sql
update perfiles set rol = 'Administración' where id = (
  select id from auth.users where email = 'tu@correo.com'
);
```

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

Esto es el esquema. **La aplicación sigue leyendo `mock.ts`.** Lo que queda:

1. `npm i @supabase/supabase-js @supabase/ssr`
2. Un cliente de servidor y otro de navegador.
3. Reescribir las ~17 funciones de `src/lib/admin/queries.ts` para que sean
   `async` y consulten. **Las pantallas apenas se tocan**: toda la UI pasa por
   ahí, esa disciplina se mantuvo justo para este día.
4. `middleware.ts` que refresque la sesión y proteja `/admin`.
5. `/login` de verdad — hoy es una regex sobre el correo que ni lee la
   contraseña.
6. Mutaciones (server actions) para los tres formularios que hoy no guardan.

⚠️ Al conectar, **las rutas de `/admin` dejan de prerenderizarse**. Hoy son 129
páginas estáticas; pasarán a renderizarse por petición. Es el precio de tener
datos reales, no algo de Supabase.

⚠️ `getHoy()` devuelve la constante congelada `HOY = "2026-07-25"`. Ese es el
único sitio a cambiar para que pase a ser la fecha real.

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
