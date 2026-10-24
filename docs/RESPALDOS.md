# Copias de seguridad

El plan Free de Supabase **no guarda copias que se puedan restaurar**. Por eso
hay dos caminos propios, que hacen la misma copia:

| | Cuándo | Dónde queda |
|---|---|---|
| **GitHub Actions** (`.github/workflows/respaldo.yml`) | Cada noche a las 02:00 de Colombia, solo | En GitHub, cifrada, 30 días |
| **Script** (`scripts/respaldar.ps1`) | A mano, antes de algo delicado | En `../respaldos-reforme/`, fuera del repo |

Con Supabase Pro (25 USD/mes) se suman sus copias diarias, que se restauran con
un clic (Database → Backups). Estas siguen valiendo como segunda copia, fuera
de Supabase.

## Qué contiene una copia

| Archivo | Qué es |
|---|---|
| `esquema.sql` | Tablas, funciones, triggers y reglas de seguridad (RLS) del esquema `public` |
| `datos.sql` | Todas las filas, **incluidas las cuentas de usuario** (`auth`, con las contraseñas cifradas) y la configuración del bucket |
| `roles.sql` | Ajustes de los roles. Hoy solo trae los que Supabase ya pone por defecto: **no hace falta para restaurar** |
| `comprobantes/` | Los archivos del bucket (fotos y PDF de gastos). El SQL solo guarda la ruta |

⚠️ **Tiene datos personales.** Nunca dentro del repo ni en un sitio público.

## Configurar la copia nocturna (una sola vez)

En GitHub: repositorio → **Settings → Secrets and variables → Actions → New
repository secret**. No pasar estos valores por chat ni correo:

| Secreto | Valor |
|---|---|
| `RESPALDO_DB_URL` | Supabase → botón **Connect** → «Session pooler» → la URI, con la contraseña de la base en lugar de `[YOUR-PASSWORD]` |
| `RESPALDO_CLAVE` | Una contraseña larga (≥ 12 caracteres) para cifrar el `.7z`. **Guardarla también fuera de GitHub**: sin ella las copias no se abren |
| `SUPABASE_SERVICE_ROLE_KEY` | La misma que tiene Vercel. Sin ella, la copia sale sin comprobantes |

Para probarla: **Actions → Copia de seguridad → Run workflow**. Si falla una
noche, GitHub manda un correo.

## Descargar y abrir una copia

1. GitHub → **Actions → Copia de seguridad** → la ejecución del día →
   **Artifacts** → `reforme-AAAA-MM-DD`.
2. Descomprimir el `.zip` que baja GitHub; dentro está el `.7z`.
3. Abrirlo con **7-Zip** (el explorador de Windows no abre `.7z` cifrados) y
   la contraseña `RESPALDO_CLAVE`.

## Recuperar algo puntual

Por ejemplo, un cliente o un pago borrado por error:

- `datos.sql` es texto: buscar la fila y volver a insertarla desde el **SQL
  Editor** de Supabase.
- Si es mucho, restaurar la copia entera en la base local (abajo, sobre
  Docker) y copiar desde ahí solo lo que haga falta.

## Restaurar la copia entera

Para un desastre o para mudarse a un proyecto nuevo. **Probado el 24 oct 2026**
restaurando una copia real de producción en un proyecto vacío: salió idéntica
(cuentas, planes, horario, 41 reglas de seguridad, 50 funciones, 20 triggers,
la tarea diaria y las reglas del bucket) y pasaron los 106 tests de la base.

1. **Crear un proyecto nuevo** en Supabase (vacío, sin aplicar migraciones).
2. **Cargar esquema y datos** en UNA transacción, con los triggers en pausa
   mientras entran los datos (`session_replication_role = replica`; si no,
   saltarían las reglas de aforo, saldo, etc. con datos que ya las cumplían):

   ```
   psql "<URI del proyecto nuevo>" --single-transaction -v ON_ERROR_STOP=1 ^
     -f esquema.sql -c "SET session_replication_role = replica" -f datos.sql
   ```

   Si algo falla, no se carga nada: se arregla y se repite.
3. **Lo que el volcado no trae**: ejecutar
   `supabase/restaurar/despues-de-restaurar.sql` en el SQL Editor (crea la
   tarea diaria de la agenda y las reglas del bucket de comprobantes). Se puede
   ejecutar más de una vez.
4. **Subir los comprobantes** a un bucket `comprobantes` respetando las
   carpetas (Storage → comprobantes → Upload).
5. **Apuntar la web al proyecto nuevo**: en Vercel, cambiar
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY`, y volver a desplegar. Actualizar también la
   URL en `.github/workflows/respaldo.yml` y en `scripts/respaldar.ps1`.
6. **Authentication → URL Configuration**: Site URL
   `https://www.reformestudiopilates.com`.

Las cuentas conservan sus contraseñas: nadie tiene que cambiar la suya.

### Gotchas encontrados al probarlo

- **`roles.sql` NO se carga**: concede un permiso interno de Supabase que el
  usuario `postgres` no puede dar («permission denied for parameter
  log_min_messages»), y el proyecto nuevo ya lo trae.
- **El volcado de datos excluye `storage.buckets_vectors` y
  `storage.vector_indexes`**: son internas de Supabase, no se usan y
  `postgres` no puede escribir en ellas; incluirlas hacía fallar toda la carga.
- **Ni el cron ni las reglas de `storage.objects` van en el volcado** (solo se
  vuelca `public`): de ahí el paso 3.

## Probar una copia en local (recomendado una vez al mes)

Con Docker y Supabase local encendidos (`npx supabase start`), sobre una base
de pruebas. ⚠️ **Borra la base local**; después `npx supabase db reset` la
devuelve a la semilla.

```sh
C=supabase_db_gdmxiqvmtegusevkqtgt   # docker ps para ver el nombre
docker cp esquema.sql $C:/tmp/esquema.sql
docker cp datos.sql   $C:/tmp/datos.sql
# Dejarla como un proyecto recién creado: public vacío, sin cuentas ni cron.
docker exec -i $C psql -U postgres -d postgres -c "select cron.unschedule(jobid) from cron.job"
docker exec -i $C psql -U postgres -d postgres -c "drop schema public cascade; create schema public; alter schema public owner to pg_database_owner"
# (vaciar también las tablas de auth y storage: ver el historial del 24 oct 2026)
docker exec -i $C psql -U postgres -d postgres --single-transaction -v ON_ERROR_STOP=1 \
  -f /tmp/esquema.sql -c "SET session_replication_role = replica" -f /tmp/datos.sql
```

En Git Bash, anteponer `MSYS_NO_PATHCONV=1` o convertirá `/tmp/...` en una
ruta de Windows.
