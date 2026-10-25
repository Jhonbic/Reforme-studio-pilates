# Crea en el escritorio el acceso directo «Copia de seguridad», que lanza
# `respaldar-todo.ps1` con doble clic. Se ejecuta una vez por PC:
#
#   powershell -ExecutionPolicy Bypass -File scripts\respaldo\crear-acceso-directo.ps1
#
# Si el repo se mueve de carpeta, volver a ejecutarlo.

$escritorio = [Environment]::GetFolderPath("Desktop")
$script = Join-Path $PSScriptRoot "respaldar-todo.ps1"

$atajo = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $escritorio "Copia de seguridad.lnk"))
$atajo.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$atajo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$atajo.WorkingDirectory = $PSScriptRoot
$atajo.Description = "Copia de seguridad cifrada de Reforme y JainSportBox en Google Drive"
# Icono de disco de copia (imageres.dll trae los iconos de sistema de Windows).
$atajo.IconLocation = "$env:SystemRoot\System32\imageres.dll,196"
$atajo.Save()

Write-Host "Acceso directo creado en: $escritorio\Copia de seguridad.lnk"
