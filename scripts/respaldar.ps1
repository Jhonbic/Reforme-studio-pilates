# Copia de seguridad A MANO de la base de producción, en este PC.
#
# Para antes de algo delicado (una migración, borrar datos…). La rutina diaria
# la hace GitHub Actions (.github/workflows/respaldo.yml). Cómo se restaura:
# docs/RESPALDOS.md.
#
# Uso (desde la raíz del repo):
#   powershell -ExecutionPolicy Bypass -File scripts\respaldar.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\respaldar.ps1 -Destino D:\Respaldos
#
# Requiere:
#   · Docker Desktop encendido y la CLI de Supabase con sesión iniciada en una
#     cuenta del proyecto (`npx supabase login`). No pide la contraseña de la
#     base: usa el proyecto enlazado (`supabase/.temp/project-ref`).
#   · Para los comprobantes, la variable SUPABASE_SERVICE_ROLE_KEY_PROD con la
#     clave service_role de PRODUCCIÓN (no la de .env.local, que es la local).
#     Sin ella, la copia sale sin comprobantes y lo avisa.
#   · Para cifrarla, 7-Zip instalado y la variable RESPALDO_CLAVE. Sin ellos se
#     queda como carpeta sin cifrar: tiene datos personales, guardadla en un
#     sitio privado.
#
# ⚠️ Guardado en UTF-8 CON BOM: Windows PowerShell 5.1 lee sin BOM como ANSI
# y las tildes de los mensajes salían «FallÃ³».
#
# ⚠️ La carpeta de destino va FUERA del repo a propósito: la copia trae datos
# personales y contraseñas cifradas, y no puede acabar en git.

param(
    [string]$Destino = (Join-Path (Split-Path $PSScriptRoot -Parent) "..\respaldos-reforme")
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot -Parent
Set-Location $raiz

$fecha = Get-Date -Format "yyyy-MM-dd_HHmm"
$carpeta = Join-Path ([System.IO.Path]::GetFullPath($Destino)) "reforme-$fecha"
New-Item -ItemType Directory -Path $carpeta -Force | Out-Null
Write-Host "Copia en $carpeta" -ForegroundColor Cyan

# Hasta 3 intentos: el pg_dump corre dentro de Docker y a veces falla la
# resolución DNS del pooler de Supabase un instante («could not translate host
# name»). Un reintento lo arregla; tres fallos seguidos ya son un problema real.
function Volcar([string]$archivo, [string[]]$extra) {
    for ($intento = 1; $intento -le 3; $intento++) {
        & npx supabase db dump --linked -f (Join-Path $carpeta $archivo) @extra
        if ($LASTEXITCODE -eq 0) { return }
        Write-Host "Falló el volcado de $archivo (intento $intento de 3)." -ForegroundColor Yellow
        Start-Sleep -Seconds (5 * $intento)
    }
    throw "Falló el volcado de $archivo tres veces seguidas."
}

Volcar "roles.sql" @("--role-only")
Volcar "esquema.sql" @()
# Fuera dos tablas internas de Storage (vectores, que no usamos): el usuario
# `postgres` no puede escribir en ellas y harían fallar toda la restauración.
Volcar "datos.sql" @("--use-copy", "--data-only", "-x", "storage.buckets_vectors", "-x", "storage.vector_indexes")

foreach ($f in "esquema.sql", "datos.sql") {
    if ((Get-Item (Join-Path $carpeta $f)).Length -lt 1024) { throw "$f salió casi vacío: la copia no sirve." }
}

if ($env:SUPABASE_SERVICE_ROLE_KEY_PROD) {
    $env:SUPABASE_URL = "https://ngjybazethrflxtuyhhx.supabase.co"
    $env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY_PROD
    & node scripts\descargar-comprobantes.mjs (Join-Path $carpeta "comprobantes")
    if ($LASTEXITCODE -ne 0) { throw "Falló la descarga de comprobantes." }
} else {
    Write-Host "Sin SUPABASE_SERVICE_ROLE_KEY_PROD: copia sin comprobantes." -ForegroundColor Yellow
}

$siete = @((Get-Command 7z -ErrorAction SilentlyContinue).Source, "C:\Program Files\7-Zip\7z.exe") |
    Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if ($siete -and $env:RESPALDO_CLAVE) {
    $archivo = "$carpeta.7z"
    & $siete a -t7z -mhe=on -mx=7 "-p$($env:RESPALDO_CLAVE)" $archivo "$carpeta\*" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Falló el cifrado." }
    Remove-Item $carpeta -Recurse -Force
    Write-Host "Listo y cifrado: $archivo" -ForegroundColor Green
} else {
    Write-Host "Listo, SIN cifrar (falta 7-Zip o RESPALDO_CLAVE): $carpeta" -ForegroundColor Yellow
}
