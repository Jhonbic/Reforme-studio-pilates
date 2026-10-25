# Copia de seguridad de UN proyecto de Supabase, cifrada.
#
# Lo normal es no llamarlo a mano: lo lanza `respaldar-todo.ps1` (el acceso
# directo «Copia de seguridad» del escritorio) para Reforme y JainSportBox.
# Cómo se restaura: docs/RESPALDOS.md.
#
# Uso:
#   respaldar-proyecto.ps1 -Ref ngjybazethrflxtuyhhx -Nombre reforme -Destino "G:\Mi unidad\Respaldos\Reforme"
#   respaldar-proyecto.ps1 -Ref vnqwxvlbckgekskbibny -Nombre jsb -Destino "G:\Mi unidad\Respaldos\JainSportBox" -SoloPublic
#
# Qué guarda, dentro de <nombre>-AAAA-MM-DD_HHMM.7z:
#   · esquema.sql  — tablas, funciones, triggers y RLS del esquema public
#   · datos.sql    — las filas (con -SoloPublic, solo public; sin él, también
#                    las cuentas de auth y la configuración de Storage)
#   · roles.sql    — ajustes de roles (no hace falta para restaurar)
#   · storage/     — los archivos de TODOS los buckets
#
# Requiere: Docker encendido, la CLI de Supabase con sesión (`npx supabase
# login`) en una cuenta con acceso al proyecto, 7-Zip y la variable de usuario
# RESPALDO_CLAVE (≥ 12 caracteres). NO pide la contraseña de la base ni guarda
# claves: la CLI enlaza el proyecto con su propio rol temporal y pide la clave
# de Storage a Supabase en cada copia.
#
# ⚠️ Guardado en UTF-8 CON BOM: Windows PowerShell 5.1 lee sin BOM como ANSI
# y las tildes de los mensajes salían «FallÃ³».

param(
    [Parameter(Mandatory)] [string]$Ref,
    [Parameter(Mandatory)] [string]$Nombre,
    [Parameter(Mandatory)] [string]$Destino,
    # Solo el esquema public en los datos: JainSportBox no usa las cuentas de
    # Supabase (su backend tiene las suyas), así que auth no aporta nada.
    [switch]$SoloPublic,
    # Copias que se conservan; las más viejas se borran.
    [int]$Retener = 30,
    # Solo para un disco local: en Google Drive siempre se cifra.
    [switch]$SinCifrar
)

$ErrorActionPreference = "Stop"

# --- Cifrado: se comprueba ANTES de volcar nada ------------------------------
$Destino = [System.IO.Path]::GetFullPath($Destino)
$enLaNube = $Destino -like "G:\*"
$siete = @((Get-Command 7z -ErrorAction SilentlyContinue).Source, "C:\Program Files\7-Zip\7z.exe") |
    Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$clave = [Environment]::GetEnvironmentVariable("RESPALDO_CLAVE", "User")
if (-not $clave) { $clave = $env:RESPALDO_CLAVE }
$cifrar = $siete -and $clave -and $clave.Length -ge 12
if (-not $cifrar -and ($enLaNube -or -not $SinCifrar)) {
    throw "Falta 7-Zip o la variable RESPALDO_CLAVE (≥ 12 caracteres). En Google Drive la copia va siempre cifrada."
}
New-Item -ItemType Directory -Path $Destino -Force | Out-Null

# --- Enlazar el proyecto en una carpeta propia --------------------------------
# Fuera de los repos a propósito: así no depende de a qué base esté enlazado
# cada repo (el de Reforme suele estar en la local).
$workdir = Join-Path $env:LOCALAPPDATA "RespaldosSupabase\$Nombre"
New-Item -ItemType Directory -Path $workdir -Force | Out-Null
$refActual = Get-Content (Join-Path $workdir "supabase\.temp\project-ref") -ErrorAction SilentlyContinue
if ($refActual -ne $Ref) {
    & npx supabase link --project-ref $Ref --workdir $workdir | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No se pudo enlazar el proyecto $Ref. ¿Sesión iniciada con npx supabase login?" }
}

# --- Volcado en una carpeta temporal: a Drive solo sube el .7z ---------------
$fecha = Get-Date -Format "yyyy-MM-dd_HHmm"
$trabajo = Join-Path $env:TEMP "$Nombre-$fecha"
New-Item -ItemType Directory -Path $trabajo -Force | Out-Null

# Hasta 4 intentos: el pg_dump corre dentro de Docker y a veces falla la
# resolución DNS del pooler un instante («could not translate host name»).
# ⚠️ `Continue` dentro de la función: en Windows PowerShell 5.1, con `Stop`,
# redirigir el stderr de un programa externo (`2>&1`) convierte cada línea en
# un error y corta el script aunque el programa acabe bien, y la CLI de
# Supabase escribe su progreso por stderr.
function Volcar([string]$archivo, [string[]]$extra) {
    $ErrorActionPreference = "Continue"
    for ($intento = 1; $intento -le 4; $intento++) {
        & npx supabase db dump --linked --workdir $workdir -f (Join-Path $trabajo $archivo) @extra 2>&1 |
            Where-Object { $_ -match "error" } | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
        if ($LASTEXITCODE -eq 0) { return }
        Write-Host "  Reintentando $archivo ($intento de 4)…" -ForegroundColor Yellow
        Start-Sleep -Seconds (5 * $intento)
    }
    throw "Falló el volcado de $archivo cuatro veces seguidas."
}

try {
    Write-Host "  Volcando la base…"
    Volcar "roles.sql" @("--role-only")
    Volcar "esquema.sql" @()
    if ($SoloPublic) {
        Volcar "datos.sql" @("--use-copy", "--data-only", "-s", "public")
    } else {
        # Fuera dos tablas internas de Storage (vectores, que no se usan): el
        # usuario `postgres` no puede escribir en ellas y harían fallar toda la
        # restauración.
        Volcar "datos.sql" @("--use-copy", "--data-only", "-x", "storage.buckets_vectors", "-x", "storage.vector_indexes")
    }
    foreach ($f in "esquema.sql", "datos.sql") {
        if ((Get-Item (Join-Path $trabajo $f)).Length -lt 1024) { throw "$f salió casi vacío: la copia no sirve." }
    }

    Write-Host "  Descargando los archivos de Storage…"
    # Mismo motivo que en Volcar: `Continue` solo para esta llamada.
    $claves = & { $ErrorActionPreference = "Continue"; npx supabase projects api-keys --project-ref $Ref -o json 2>$null } |
        Out-String | ConvertFrom-Json
    $env:SUPABASE_SERVICE_ROLE_KEY = ($claves | Where-Object { $_.name -eq "service_role" }).api_key
    if (-not $env:SUPABASE_SERVICE_ROLE_KEY) { throw "No se pudo obtener la clave de Storage del proyecto." }
    $env:SUPABASE_URL = "https://$Ref.supabase.co"
    & node (Join-Path $PSScriptRoot "descargar-storage.mjs") (Join-Path $trabajo "storage") |
        ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) { throw "Falló la descarga de Storage." }

    Write-Host "  Cifrando y guardando…"
    if ($cifrar) {
        $final = Join-Path $Destino "$Nombre-$fecha.7z"
        # AES-256 y nombres cifrados (-mhe): sin la clave no se ve ni qué hay.
        & $siete a -t7z -mhe=on -mx=7 "-p$clave" $final "$trabajo\*" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Falló el cifrado." }
        # Comprobar que se abre con la clave antes de dar la copia por buena.
        & $siete t "-p$clave" $final | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "El .7z no pasó la prueba de integridad." }
    } else {
        $final = Join-Path $Destino "$Nombre-$fecha"
        Copy-Item $trabajo $final -Recurse
    }
} finally {
    Remove-Item $trabajo -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
}

# --- Rotación: solo si la copia de hoy salió bien ------------------------------
$copias = @(Get-ChildItem $Destino -Filter "$Nombre-*" | Sort-Object Name -Descending)
$copias | Select-Object -Skip $Retener | ForEach-Object { Remove-Item $_.FullName -Recurse -Force }

$bytes = (Get-Item $final).Length
$tamano = if ((Get-Item $final).PSIsContainer) { "" } elseif ($bytes -ge 1MB) { "{0:N1} MB" -f ($bytes / 1MB) } else { "{0:N0} KB" -f ($bytes / 1KB) }
Write-Host "  Guardada: $(Split-Path $final -Leaf) $tamano · copias guardadas: $([Math]::Min($copias.Count, $Retener))" -ForegroundColor Green
