# PowerShell script to generate WORK_DISPLAY/manifest.json by scanning WORK_DISPLAY folders.
# Usage (from project root or via the provided .bat): powershell -NoProfile -ExecutionPolicy Bypass -File scripts\generate-work-manifest.ps1
#
# This script finds the first image or 3D model file under each top-level WORK_DISPLAY subfolder
# (prefers DISPLAY_IMAGE, then RENDER_IMAGES, then CAD_MODEL with .gltf/.glb/.fbx) and writes a manifest JSON at WORK_DISPLAY\manifest.json.

$projectRoot = Split-Path -Parent $PSScriptRoot
$workDisplayDir = Join-Path $projectRoot 'WORK_DISPLAY'
$manifestPath = Join-Path $workDisplayDir 'manifest.json'

function To-WebPath([string]$p) {
    return ($p -replace '\\','/').TrimStart('/')
}

if (-not (Test-Path $workDisplayDir -PathType Container)) {
    Write-Error "WORK_DISPLAY directory not found at: $workDisplayDir"
    exit 2
}

$items = @()

Get-ChildItem -Path $workDisplayDir -Directory | ForEach-Object {
    $folder = $_
    $name = $folder.Name
    $model = $null

    # Prefer DISPLAY_IMAGE first
    $displayImagePath = Join-Path $folder.FullName 'DISPLAY_IMAGE'
    if (Test-Path $displayImagePath -PathType Container) {
        $imageFile = Get-ChildItem -Path $displayImagePath -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '\.(jpg|jpeg|png|gif|webp)$' } | Select-Object -First 1
        if ($imageFile) { $model = $imageFile.FullName }
    }

    # Fallback to RENDER_IMAGES
    if (-not $model) {
        $renderImagePath = Join-Path $folder.FullName 'RENDER_IMAGES'
        if (Test-Path $renderImagePath -PathType Container) {
            $imageFile = Get-ChildItem -Path $renderImagePath -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -match '\.(jpg|jpeg|png|gif|webp)$' } | Select-Object -First 1
            if ($imageFile) { $model = $imageFile.FullName }
        }
    }

    # Fallback to CAD_MODEL model files (.gltf/.glb/.fbx)
    if (-not $model) {
        $cadModelPath = Join-Path $folder.FullName 'CAD_MODEL'
        if (Test-Path $cadModelPath) {
            $modelFile = Get-ChildItem -Path $cadModelPath -Recurse -Include *.gltf,*.glb,*.fbx -File -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($modelFile) { $model = $modelFile.FullName }
        }
    }

    # Fallback: search the whole folder for model files
    if (-not $model) {
        $modelFile = Get-ChildItem -Path $folder.FullName -Recurse -Include *.gltf,*.glb,*.fbx -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($modelFile) { $model = $modelFile.FullName }
    }

    if ($model) {
        # Make a path relative to project root
        $relative = $model
        if ($relative.StartsWith($projectRoot)) {
            $relative = $relative.Substring($projectRoot.Length)
            if ($relative.StartsWith([IO.Path]::DirectorySeparatorChar) -or $relative.StartsWith('/')) {
                $relative = $relative.Substring(1)
            }
        }
        $webpath = To-WebPath($relative)
        $items += [PSCustomObject]@{ name = $name; model = $webpath }
        Write-Output "Found file for $name -> $webpath"
    } else {
        Write-Warning "No image or model file found under $name - skipping"
    }
}

$manifest = @{ items = $items }

# ConvertTo-Json in PS core/powershell returns arrays/objects nicely; increase depth to be safe.
$manifestJson = $manifest | ConvertTo-Json -Depth 6

# Ensure WORK_DISPLAY exists and write manifest
if (-not (Test-Path $workDisplayDir)) {
    New-Item -ItemType Directory -Path $workDisplayDir | Out-Null
}

$manifestJson | Out-File -FilePath $manifestPath -Encoding utf8

Write-Output "Wrote manifest to $manifestPath"
Write-Output "Items: $($items.Count)"
