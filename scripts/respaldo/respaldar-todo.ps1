# Copia de seguridad de TODOS los proyectos, en una misma carpeta de Drive:
#
#   G:\Mi unidad\Respaldos\
#      ├─ Reforme\        reforme-AAAA-MM-DD_HHMM.7z …
#      └─ JainSportBox\   jsb-AAAA-MM-DD_HHMM.7z …
#
# Es lo que abre el acceso directo «Copia de seguridad» del escritorio (lo crea
# `crear-acceso-directo.ps1`). Cada proyecto lo copia `respaldar-proyecto.ps1`;
# si uno falla, el otro se hace igual y el resumen lo dice. Cómo preparar el
# PC y cómo restaurar: docs/RESPALDOS.md.
#
# ⚠️ Guardado en UTF-8 CON BOM (Windows PowerShell 5.1 lee sin BOM como ANSI).

param(
    # Carpeta común. Por defecto, «Respaldos» en Google Drive para escritorio.
    [string]$Raiz = "",
    # Sin el «Pulsa Enter» final: para el Programador de tareas o pruebas.
    [switch]$SinPausa
)

$Host.UI.RawUI.WindowTitle = "Copia de seguridad"
$proyectos = @(
    @{ Nombre = "Reforme"; Ref = "ngjybazethrflxtuyhhx"; Prefijo = "reforme"; SoloPublic = $false },
    # JainSportBox: su backend tiene sus propias cuentas; de Supabase solo usa
    # la base (esquema public) y Storage (las fotos).
    @{ Nombre = "JainSportBox"; Ref = "vnqwxvlbckgekskbibny"; Prefijo = "jsb"; SoloPublic = $true }
)

function Terminar([int]$codigo) {
    if (-not $SinPausa) {
        Write-Host ""
        Read-Host "Pulsa Enter para cerrar" | Out-Null
    }
    exit $codigo
}

Write-Host ""
Write-Host "  COPIA DE SEGURIDAD · Reforme y JainSportBox" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'dddd d \de MMMM \de yyyy, HH:mm')" -ForegroundColor DarkGray
Write-Host ""

# --- Comprobaciones antes de empezar -------------------------------------------
if (-not $Raiz) {
    $drive = @("G:\Mi unidad", "G:\My Drive") | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $drive) {
        Write-Host "  No encuentro Google Drive (G:\Mi unidad)." -ForegroundColor Red
        Write-Host "  Abre Google Drive para escritorio con la cuenta del estudio y vuelve a intentarlo."
        Terminar 1
    }
    $Raiz = Join-Path $drive "Respaldos"
}

$siete = @((Get-Command 7z -ErrorAction SilentlyContinue).Source, "C:\Program Files\7-Zip\7z.exe") |
    Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$clave = [Environment]::GetEnvironmentVariable("RESPALDO_CLAVE", "User")
if (-not $clave) { $clave = $env:RESPALDO_CLAVE }
if (-not $siete) {
    Write-Host "  Falta 7-Zip. Instálalo con:  winget install 7zip.7zip" -ForegroundColor Red
    Terminar 1
}
if (-not $clave -or $clave.Length -lt 12) {
    Write-Host "  Falta la clave de cifrado (variable RESPALDO_CLAVE, mínimo 12 caracteres)." -ForegroundColor Red
    Write-Host "  Ver docs/RESPALDOS.md → «Preparar el PC»."
    Terminar 1
}

# Docker: si está cerrado, se abre y se espera a que responda (hasta 3 min).
function DockerResponde {
    $ErrorActionPreference = "Continue"
    docker info *> $null
    return $LASTEXITCODE -eq 0
}
if (-not (DockerResponde)) {
    $exe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path $exe)) {
        Write-Host "  No encuentro Docker Desktop: hace falta para volcar las bases." -ForegroundColor Red
        Terminar 1
    }
    Write-Host "  Abriendo Docker Desktop…" -ForegroundColor Yellow
    Start-Process $exe
    $limite = (Get-Date).AddMinutes(3)
    while (-not (DockerResponde)) {
        if ((Get-Date) -gt $limite) {
            Write-Host "  Docker no arrancó en 3 minutos. Ábrelo a mano y vuelve a intentarlo." -ForegroundColor Red
            Terminar 1
        }
        Start-Sleep -Seconds 5
    }
    Write-Host "  Docker listo." -ForegroundColor DarkGray
}

# --- Copias ----------------------------------------------------------------------
$resultados = @()
foreach ($p in $proyectos) {
    Write-Host ""
    Write-Host "  ▸ $($p.Nombre)" -ForegroundColor Cyan
    $inicio = Get-Date
    try {
        & (Join-Path $PSScriptRoot "respaldar-proyecto.ps1") -Ref $p.Ref -Nombre $p.Prefijo `
            -Destino (Join-Path $Raiz $p.Nombre) -SoloPublic:$p.SoloPublic
        $resultados += [pscustomobject]@{ Proyecto = $p.Nombre; Resultado = "OK"; Detalle = "{0:N0} s" -f ((Get-Date) - $inicio).TotalSeconds }
    } catch {
        Write-Host "  ✕ $($_.Exception.Message)" -ForegroundColor Red
        $resultados += [pscustomobject]@{ Proyecto = $p.Nombre; Resultado = "FALLÓ"; Detalle = $_.Exception.Message }
    }
}

# --- Resumen -----------------------------------------------------------------------
Write-Host ""
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
foreach ($r in $resultados) {
    $color = if ($r.Resultado -eq "OK") { "Green" } else { "Red" }
    Write-Host ("  {0,-14} {1,-6} {2}" -f $r.Proyecto, $r.Resultado, $r.Detalle) -ForegroundColor $color
}
Write-Host ""
Write-Host "  Carpeta: $Raiz" -ForegroundColor DarkGray

$fallos = @($resultados | Where-Object Resultado -ne "OK").Count
if ($fallos -eq 0) {
    Write-Host "  Todo guardado y cifrado. Google Drive lo subirá en unos minutos." -ForegroundColor Green
} else {
    Write-Host "  $fallos copia(s) fallaron: revisa el mensaje de arriba y vuelve a lanzarla." -ForegroundColor Red
}
Terminar ([int]($fallos -gt 0))
