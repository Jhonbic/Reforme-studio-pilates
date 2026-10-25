# Copia de seguridad de la base de producción, guardada en Google Drive.
#
# El plan Free de Supabase no guarda copias que se puedan restaurar: esta es
# LA copia. Cómo se restaura: docs/RESPALDOS.md.
#
# Uso (desde la raíz del repo):
#   powershell -ExecutionPolicy Bypass -File scripts\respaldar.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\respaldar.ps1 -Destino "D:\Respaldos"
#
# Destino por defecto: la carpeta «Respaldos Reforme» de Google Drive para
# escritorio (G:\Mi unidad o G:\My Drive). Drive la sube sola a la nube.
#
# Requiere (una sola vez; ver docs/RESPALDOS.md):
#   · Docker Desktop encendido y la CLI de Supabase con sesión iniciada en una
#     cuenta del proyecto (`npx supabase login`). No pide la contraseña de la
#     base: usa el proyecto enlazado (`supabase/.temp/project-ref`).
#   · 7-Zip instalado y la variable de usuario RESPALDO_CLAVE (≥ 12
#     caracteres). ⚠️ En Google Drive la copia se guarda SIEMPRE cifrada: tiene
#     datos personales y contraseñas cifradas. Sin 7-Zip o sin clave, el script
#     se niega (salvo -SinCifrar, solo para un disco local).
#   · Para los comprobantes, la variable SUPABASE_SERVICE_ROLE_KEY_PROD con la
#     clave service_role de PRODUCCIÓN (no la de .env.local, que es la local).
#     Sin ella, la copia sale sin comprobantes y lo avisa.
#
# ⚠️ Guardado en UTF-8 CON BOM: Windows PowerShell 5.1 lee sin BOM como ANSI
# y las tildes de los mensajes salían «FallÃ³».

param(
    [string]$Destino = "",
    # Copias que se conservan; las más viejas se borran.
    [int]$Retener = 30,
    [switch]$SinCifrar
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot -Parent
Set-Location $raiz

# --- Destino -----------------------------------------------------------------
if (-not $Destino) {
    $drive = @("G:\Mi unidad", "G:\My Drive") | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $drive) {
        throw "No encuentro Google Drive (G:\Mi unidad). Abre Google Drive para escritorio con la cuenta del estudio, o pasa -Destino."
    }
    $Destino = Join-Path $drive "Respaldos Reforme"
}
$Destino = [System.IO.Path]::GetFullPath($Destino)
$enLaNube = $Destino -like "G:\*"
New-Item -ItemType Directory -Path $Destino -Force | Out-Null

# --- Cifrado: se comprueba ANTES de volcar nada ------------------------------
$siete = @((Get-Command 7z -ErrorAction SilentlyContinue).Source, "C:\Program Files\7-Zip\7z.exe") |
    Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$clave = [Environment]::GetEnvironmentVariable("RESPALDO_CLAVE", "User")
if (-not $clave) { $clave = $env:RESPALDO_CLAVE }
$cifrar = $siete -and $clave -and $clave.Length -ge 12
if (-not $cifrar) {
    if ($enLaNube -or -not $SinCifrar) {
        throw "Falta 7-Zip o la variable RESPALDO_CLAVE (≥ 12 caracteres). En Google Drive la copia va siempre cifrada."
    }
    Write-Host "Copia SIN cifrar en $Destino (pedido con -SinCifrar)." -ForegroundColor Yellow
}

# --- Volcado -----------------------------------------------------------------
# Se trabaja en una carpeta temporal del PC: a Drive solo sube el .7z final,
# nunca los SQL en claro.
$fecha = Get-Date -Format "yyyy-MM-dd_HHmm"
$trabajo = Join-Path $env:TEMP "reforme-$fecha"
New-Item -ItemType Directory -Path $trabajo -Force | Out-Null
Write-Host "Volcando producción…" -ForegroundColor Cyan

# Hasta 3 intentos: el pg_dump corre dentro de Docker y a veces falla la
# resolución DNS del pooler de Supabase un instante («could not translate host
# name»). Un reintento lo arregla; tres fallos seguidos ya son un problema real.
function Volcar([string]$archivo, [string[]]$extra) {
    for ($intento = 1; $intento -le 3; $intento++) {
        & npx supabase db dump --linked -f (Join-Path $trabajo $archivo) @extra
        if ($LASTEXITCODE -eq 0) { return }
        Write-Host "Falló el volcado de $archivo (intento $intento de 3)." -ForegroundColor Yellow
        Start-Sleep -Seconds (5 * $intento)
    }
    throw "Falló el volcado de $archivo tres veces seguidas."
}

try {
    Volcar "roles.sql" @("--role-only")
    Volcar "esquema.sql" @()
    # Fuera dos tablas internas de Storage (vectores, que no usamos): el usuario
    # `postgres` no puede escribir en ellas y harían fallar toda la restauración.
    Volcar "datos.sql" @("--use-copy", "--data-only", "-x", "storage.buckets_vectors", "-x", "storage.vector_indexes")

    foreach ($f in "esquema.sql", "datos.sql") {
        if ((Get-Item (Join-Path $trabajo $f)).Length -lt 1024) { throw "$f salió casi vacío: la copia no sirve." }
    }

    if ($env:SUPABASE_SERVICE_ROLE_KEY_PROD) {
        $env:SUPABASE_URL = "https://ngjybazethrflxtuyhhx.supabase.co"
        $env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY_PROD
        & node scripts\descargar-comprobantes.mjs (Join-Path $trabajo "comprobantes")
        if ($LASTEXITCODE -ne 0) { throw "Falló la descarga de comprobantes." }
    } else {
        Write-Host "Sin SUPABASE_SERVICE_ROLE_KEY_PROD: copia sin comprobantes." -ForegroundColor Yellow
    }

    # --- Guardar -----------------------------------------------------------------
    if ($cifrar) {
        $final = Join-Path $Destino "reforme-$fecha.7z"
        # AES-256 y nombres cifrados (-mhe): sin la clave no se ve ni qué hay.
        & $siete a -t7z -mhe=on -mx=7 "-p$clave" $final "$trabajo\*" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Falló el cifrado." }
        # Comprobar que el .7z se abre con la clave antes de dar la copia por buena.
        & $siete t "-p$clave" $final | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "El .7z no pasó la prueba de integridad." }
    } else {
        $final = Join-Path $Destino "reforme-$fecha"
        Copy-Item $trabajo $final -Recurse
    }
} finally {
    Remove-Item $trabajo -Recurse -Force -ErrorAction SilentlyContinue
}

# --- Rotación: solo si la copia de hoy salió bien ------------------------------
$copias = Get-ChildItem $Destino -Filter "reforme-*" | Sort-Object Name -Descending
$copias | Select-Object -Skip $Retener | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force
    Write-Host "Borrada la copia antigua $($_.Name)" -ForegroundColor DarkGray
}

$bytes = (Get-Item $final).Length
$tamano = if ((Get-Item $final).PSIsContainer) { "" } elseif ($bytes -ge 1MB) { " ({0:N1} MB)" -f ($bytes / 1MB) } else { " ({0:N0} KB)" -f ($bytes / 1KB) }
Write-Host "Listo: $final$tamano · copias guardadas: $([Math]::Min($copias.Count, $Retener))" -ForegroundColor Green
