# Copias de seguridad

El plan Free de Supabase **no guarda copias que se puedan restaurar**. La copia
la hace `scripts/respaldar.ps1` y la guarda **cifrada en Google Drive**
(carpeta «Respaldos Reforme»), conservando las últimas 30.

> Pendiente (decisión del usuario, 24 oct 2026): una copia nocturna automática
> con GitHub Actions. Se escribió y se retiró antes de subirla; está en el
> historial de git (commit «Copias de seguridad: nocturna en GitHub
> Actions…», archivo `.github/workflows/respaldo.yml`) para retomarla.

Con Supabase Pro (25 USD/mes) se suman sus copias diarias, que se restauran con
un clic (Database → Backups). Estas siguen valiendo como segunda copia.

## Qué contiene una copia

Un `.7z` cifrado (AES-256, con los nombres de archivo también cifrados):

| Archivo | Qué es |
|---|---|
| `esquema.sql` | Tablas, funciones, triggers y reglas de seguridad (RLS) del esquema `public` |
| `datos.sql` | Todas las filas, **incluidas las cuentas de usuario** (`auth`, con las contraseñas cifradas) y la configuración del bucket |
| `roles.sql` | Ajustes de los roles. Hoy solo trae los que Supabase ya pone por defecto: **no hace falta para restaurar** |
| `comprobantes/` | Los archivos del bucket (fotos y PDF de gastos). El SQL solo guarda la ruta |

## Preparar el PC (una sola vez)

1. **Google Drive para escritorio** abierto con la cuenta de Google del
   estudio. Tiene que aparecer la unidad `G:\Mi unidad`.
2. **7-Zip**: `winget install 7zip.7zip` (o desde 7-zip.org).
3. **La clave de cifrado**, como variable de usuario de Windows (PowerShell):
   ```powershell
   [Environment]::SetEnvironmentVariable("RESPALDO_CLAVE", "una-clave-larga-de-verdad", "User")
   ```
   ≥ 12 caracteres. ⚠️ **Guardadla también en otro sitio** (un gestor de
   contraseñas): sin ella ninguna copia se puede abrir, y no hay forma de
   recuperarla.
4. **Para incluir los comprobantes**, la clave `service_role` de producción
   (Supabase → Project Settings → API Keys), igual:
   ```powershell
   [Environment]::SetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY_PROD", "...", "User")
   ```
   Opcional: sin ella la copia sale sin comprobantes y lo avisa.
5. **Docker Desktop** y la CLI de Supabase con sesión en una cuenta de la
   organización del estudio: `npx supabase login`. No pide la contraseña de la
   base.

Cerrar y abrir la terminal después de crear las variables.

## Hacer una copia

```powershell
powershell -ExecutionPolicy Bypass -File scripts\respaldar.ps1
```

Tarda 1–2 minutos. Lo que hace, en orden:
1. Comprueba que hay Drive, 7-Zip y clave **antes** de volcar nada.
2. Vuelca la base en una carpeta temporal del PC (3 intentos por volcado: a
   veces falla la red un instante).
3. Descarga los comprobantes.
4. Cifra en `G:\Mi unidad\Respaldos Reforme\reforme-AAAA-MM-DD_HHMM.7z` y
   **comprueba que el .7z se abre** con la clave.
5. Borra los temporales: a Drive solo sube el `.7z`, nunca los SQL en claro.
6. Borra las copias más antiguas que las últimas 30 (`-Retener` lo cambia).

Otras opciones: `-Destino "D:\Respaldos"` (otro sitio) y `-SinCifrar` (solo
para un disco local; en Drive no se permite).

**Cada cuánto**: al menos una vez por semana, y **siempre antes de algo
delicado** (una migración, borrar datos, cambios en planes). Para hacerlo solo
cada noche hay que dejar el PC encendido con Docker abierto y una tarea en el
Programador de tareas de Windows.

## Abrir una copia

Con **7-Zip** y la clave `RESPALDO_CLAVE` (el explorador de Windows no abre
`.7z` cifrados).

## Recuperar algo puntual

Por ejemplo, un cliente o un pago borrado por error:

- `datos.sql` es texto: buscar la fila y volver a insertarla desde el **SQL
  Editor** de Supabase.
- Si es mucho, restaurar la copia entera en la base local (abajo) y copiar
  desde ahí solo lo que haga falta.

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
   `SUPABASE_SERVICE_ROLE_KEY`, y volver a desplegar. Cambiar también la URL en
   `scripts/respaldar.ps1` y enlazar la CLI al proyecto nuevo
   (`npx supabase link`).
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

Con Docker y Supabase local encendidos (`npx supabase start`). ⚠️ **Borra la
base local**; después `npx supabase db reset` la devuelve a la semilla (y hay
que volver a crear las cuentas de prueba locales).

```sh
C=supabase_db_gdmxiqvmtegusevkqtgt   # docker ps para ver el nombre
docker cp esquema.sql $C:/tmp/esquema.sql
docker cp datos.sql   $C:/tmp/datos.sql
# Dejarla como un proyecto recién creado: public vacío, sin cuentas ni cron.
docker exec -i $C psql -U postgres -d postgres -c "select cron.unschedule(jobid) from cron.job"
docker exec -i $C psql -U postgres -d postgres -c "drop schema public cascade; create schema public; alter schema public owner to pg_database_owner"
# Vaciar auth y storage (las tablas que postgres pueda; las demás ya están vacías).
docker exec -i $C psql -U postgres -d postgres -c "do \$\$ declare t record; begin for t in select schemaname, tablename from pg_tables where schemaname in ('auth','storage') and tablename not in ('schema_migrations','migrations') loop begin execute format('truncate %I.%I cascade', t.schemaname, t.tablename); exception when insufficient_privilege then null; end; end loop; end \$\$"
docker exec -i $C psql -U postgres -d postgres --single-transaction -v ON_ERROR_STOP=1 \
  -f /tmp/esquema.sql -c "SET session_replication_role = replica" -f /tmp/datos.sql
docker cp supabase/restaurar/despues-de-restaurar.sql $C:/tmp/despues.sql
docker exec -i $C psql -U postgres -d postgres -f /tmp/despues.sql
```

En Git Bash, anteponer `MSYS_NO_PATHCONV=1` o convertirá `/tmp/...` en una
ruta de Windows.
