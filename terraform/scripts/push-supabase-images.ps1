#!/usr/bin/env pwsh
# PowerShell script to push Supabase images to ACR

param(
    [Parameter(Mandatory=$true)]
    [string]$AcrName
)

Write-Host "🔐 Logging into ACR: $AcrName" -ForegroundColor Cyan
az acr login --name $AcrName

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to login to ACR" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Pulling Supabase images..." -ForegroundColor Cyan
$images = @(
    @{Source="kong:3.0"; Target="supabase/kong:latest"},
    @{Source="supabase/gotrue:v2.99.0"; Target="supabase/auth:latest"},
    @{Source="supabase/realtime:v2.25.0"; Target="supabase/realtime:latest"},
    @{Source="supabase/storage-api:v0.43.11"; Target="supabase/storage-api:latest"},
    @{Source="postgrest/postgrest:v11.2.0"; Target="supabase/postgrest:latest"}
)

foreach ($image in $images) {
    Write-Host "  Pulling $($image.Source)..." -ForegroundColor Gray
    docker pull $image.Source
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to pull $($image.Source)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "🏷️  Tagging images for ACR..." -ForegroundColor Cyan
foreach ($image in $images) {
    $acrImage = "$AcrName.azurecr.io/$($image.Target)"
    Write-Host "  Tagging $($image.Source) -> $acrImage" -ForegroundColor Gray
    docker tag $image.Source $acrImage
}

Write-Host "⬆️  Pushing images to ACR..." -ForegroundColor Cyan
foreach ($image in $images) {
    $acrImage = "$AcrName.azurecr.io/$($image.Target)"
    Write-Host "  Pushing $acrImage..." -ForegroundColor Gray
    docker push $acrImage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to push $acrImage" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ All images pushed successfully!" -ForegroundColor Green
Write-Host "📝 Update your Container Apps to use these images" -ForegroundColor Yellow
