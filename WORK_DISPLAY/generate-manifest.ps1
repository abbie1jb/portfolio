# PowerShell script to generate projects.json from WORK_DISPLAY folder structure

$workDisplayPath = $PSScriptRoot
$projectsData = @{
    projects = @()
}

Write-Host "Scanning WORK_DISPLAY folder: $workDisplayPath"
Write-Host ""

# Get all directories in WORK_DISPLAY (excluding scripts and other non-project folders)
$projectDirs = Get-ChildItem -Path $workDisplayPath -Directory | Where-Object { 
    $_.Name -ne 'scripts' -and $_.Name -notmatch '^\.' 
}

foreach ($projectDir in $projectDirs) {
    Write-Host "Processing project: $($projectDir.Name)"
    
    $project = @{
        name = $projectDir.Name
        displayImage = ""
        chunks = @()
    }
    
    # Look for DISPLAY_IMAGE folder
    $displayImageDir = Join-Path $projectDir.FullName "DISPLAY_IMAGE"
    if (Test-Path $displayImageDir) {
        $displayImages = Get-ChildItem -Path $displayImageDir -File | Where-Object { 
            $_.Extension -match '\.(jpg|jpeg|png|gif|bmp)$' 
        }
        if ($displayImages.Count -gt 0) {
            $relativePath = "WORK_DISPLAY/$($projectDir.Name)/DISPLAY_IMAGE/$($displayImages[0].Name)"
            $project.displayImage = $relativePath
            Write-Host "  Found display image: $($displayImages[0].Name)"
        }
    }
    
    # Look for chunk directories
    $chunkDirs = Get-ChildItem -Path $projectDir.FullName -Directory | Where-Object { 
        $_.Name -match '^Chunk_\d+$' 
    } | Sort-Object Name
    
    foreach ($chunkDir in $chunkDirs) {
        Write-Host "  Processing chunk: $($chunkDir.Name)"
        
        $chunk = @{
            name = $chunkDir.Name
            images = @()
            description = ""
        }
        
        # Get all image files in chunk directory
        $imageFiles = Get-ChildItem -Path $chunkDir.FullName -File | Where-Object { 
            $_.Extension -match '\.(jpg|jpeg|png|gif|bmp)$' 
        } | Sort-Object Name
        
        foreach ($imageFile in $imageFiles) {
            $relativePath = "WORK_DISPLAY/$($projectDir.Name)/$($chunkDir.Name)/$($imageFile.Name)"
            $chunk.images += $relativePath
        }
        Write-Host "    Found $($imageFiles.Count) images"
        
        # Look for Description.txt
        $descriptionFile = Join-Path $chunkDir.FullName "Description.txt"
        if (Test-Path $descriptionFile) {
            $relativePath = "WORK_DISPLAY/$($projectDir.Name)/$($chunkDir.Name)/Description.txt"
            $chunk.description = $relativePath
            Write-Host "    Found description file"
        }
        
        $project.chunks += $chunk
    }
    
    $projectsData.projects += $project
}

# Convert to JSON and save
$jsonOutput = $projectsData | ConvertTo-Json -Depth 10
$outputPath = Join-Path $workDisplayPath "projects.json"
$jsonOutput | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host ""
Write-Host "Generated projects.json with $($projectsData.projects.Count) projects:"
foreach ($proj in $projectsData.projects) {
    Write-Host "  - $($proj.name): $($proj.chunks.Count) chunks"
    foreach ($chunk in $proj.chunks) {
        Write-Host "    - $($chunk.name): $($chunk.images.Count) images"
    }
}
Write-Host ""
Write-Host "projects.json has been updated successfully!"
