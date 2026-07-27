# Base de datos — Supabase

> ⚠️ **Este SQL no se ha ejecutado todavía.** Se escribió sin Docker ni proyecto
> de Supabase disponibles, así que está revisado a mano pero **no probado**.
> Espera encontrar algún error la primera vez que lo corras; la sección
> «Verificar» de abajo dice cómo.

## Qué hay aquí

```
supabase/
  migrations/
    20260727120000_esquema.sql   Tablas, enums, vistas, triggers
    20260727120100_rls.sql       Row Level Security + Storage + roles
  seed.sql                       118 clientes de ejemplo, deterministas
```

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

Sin Docker no se puede probar en local. Dos caminos:

**Con Docker** (lo mejor):
```bash
npx supabase start      # levanta Postgres + Auth + Storage en local
npx supabase db reset   # aplica migraciones y seed, y FALLA si hay error de SQL
```

**Sin Docker**: pega el contenido de cada migración en el SQL Editor de un
proyecto de Supabase gratuito, en orden. Los errores salen ahí con su línea.

Después, comprobaciones que valen la pena:

```sql
-- ¿Cuadran los estados con lo que espera el dashboard?
select estado, count(*) from clientes_vigentes group by estado order by 2 desc;

-- ¿Algún pago en el futuro? Debe dar 0.
select count(*) from pagos where fecha > current_date;

-- ¿Alguna membresía que venza antes de empezar? Debe dar 0.
select count(*) from membresias where vencimiento < inicio;

-- RLS: sin perfil no se ve nada. Debe dar 0 filas.
set role authenticated;
select count(*) from clientes;
```
