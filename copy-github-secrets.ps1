# GitHub Secrets Setup Helper
# This script helps you copy secret values to add to GitHub

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "GitHub Actions Secrets - Copy Helper" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if terraform outputs are available
Push-Location "$PSScriptRoot\terraform\environments\dev"
$terraformOutputs = terraform output -json 2>$null | ConvertFrom-Json
Pop-Location

if (-not $terraformOutputs) {
    Write-Host "⚠️  Terraform outputs not available. Run 'terraform apply' first." -ForegroundColor Yellow
    Write-Host ""
}

# Read terraform.tfvars
$tfvarsPath = "$PSScriptRoot\terraform\environments\dev\terraform.tfvars"
$tfvarsContent = Get-Content $tfvarsPath -Raw

function Extract-TfVar {
    param($content, $varName)
    $pattern = "$varName\s*=\s*`"([^`"]+)`""
    if ($content -match $pattern) {
        return $matches[1]
    }
    return $null
}

# Get values
$postgresConnString = Extract-TfVar $tfvarsContent "postgres_connection_string"
$jwtSecret = Extract-TfVar $tfvarsContent "supabase_jwt_secret"
$anonKey = Extract-TfVar $tfvarsContent "supabase_anon_key"
$serviceKey = Extract-TfVar $tfvarsContent "supabase_service_key"

$staticWebAppUrl = $terraformOutputs.static_web_app_url.value
$staticWebAppToken = $terraformOutputs.static_web_app_api_key.value
$supabaseApiUrl = $terraformOutputs.supabase_api_url.value

$secrets = @(
    @{
        Section = "Azure Authentication (from Admin)"
        Name = "AZURE_CLIENT_ID"
        Value = "<Paste from admin response>"
        Note = "Wait for admin to create service principal"
    },
    @{
        Section = "Azure Authentication (from Admin)"
        Name = "AZURE_TENANT_ID"
        Value = "d544595f-a238-4e1b-90e7-fa046d4f8cbd"
        Note = "Your tenant ID"
    },
    @{
        Section = "Azure Authentication (from Admin)"
        Name = "AZURE_SUBSCRIPTION_ID"
        Value = "c321b95e-e568-42f0-b5fc-3ef2867b7e74"
        Note = "Your subscription ID"
    },
    @{
        Section = "Database & Supabase"
        Name = "POSTGRES_CONNECTION_STRING"
        Value = $postgresConnString
        Note = "From terraform.tfvars"
    },
    @{
        Section = "Database & Supabase"
        Name = "SUPABASE_JWT_SECRET"
        Value = $jwtSecret
        Note = "From terraform.tfvars"
    },
    @{
        Section = "Database & Supabase"
        Name = "SUPABASE_ANON_KEY"
        Value = $anonKey
        Note = "From terraform.tfvars"
    },
    @{
        Section = "Database & Supabase"
        Name = "SUPABASE_SERVICE_KEY"
        Value = $serviceKey
        Note = "From terraform.tfvars"
    },
    @{
        Section = "Application Build Variables"
        Name = "AZURE_STATIC_WEB_APPS_API_TOKEN"
        Value = $staticWebAppToken
        Note = "From terraform output"
    },
    @{
        Section = "Application Build Variables"
        Name = "VITE_SUPABASE_URL"
        Value = $supabaseApiUrl
        Note = "From terraform output"
    },
    @{
        Section = "Application Build Variables"
        Name = "VITE_SUPABASE_PUBLISHABLE_KEY"
        Value = $anonKey
        Note = "Same as SUPABASE_ANON_KEY"
    },
    @{
        Section = "Application Build Variables"
        Name = "VITE_SUPABASE_PROJECT_ID"
        Value = "ignite-dev"
        Note = "Environment name"
    },
    @{
        Section = "Optional"
        Name = "VITE_SENTRY_DSN"
        Value = "<Get from sentry.io>"
        Note = "Optional: For error tracking"
    }
)

Write-Host "Instructions:" -ForegroundColor Green
Write-Host "1. Go to GitHub → Settings → Environments → dev" -ForegroundColor White
Write-Host "2. Click 'Add secret' for each value below" -ForegroundColor White
Write-Host "3. Press [Enter] to copy each value to clipboard" -ForegroundColor White
Write-Host "4. Paste into GitHub and click 'Add secret'" -ForegroundColor White
Write-Host ""

$currentSection = $null

foreach ($secret in $secrets) {
    # Print section header if changed
    if ($secret.Section -ne $currentSection) {
        $currentSection = $secret.Section
        Write-Host ""
        Write-Host "═══ $currentSection ═══" -ForegroundColor Cyan
        Write-Host ""
    }

    Write-Host "Secret Name: " -NoNewline -ForegroundColor Yellow
    Write-Host $secret.Name -ForegroundColor White
    
    if ($secret.Value -and $secret.Value -notlike "<*>") {
        Write-Host "Value: " -NoNewline -ForegroundColor Gray
        # Mask sensitive values
        if ($secret.Value.Length -gt 40) {
            Write-Host "$($secret.Value.Substring(0, 20))...$($secret.Value.Substring($secret.Value.Length - 10))" -ForegroundColor DarkGray
        } else {
            Write-Host $secret.Value -ForegroundColor DarkGray
        }
        Write-Host "Note: $($secret.Note)" -ForegroundColor DarkGray
        
        Write-Host "Press [Enter] to copy to clipboard, or [S] to skip: " -NoNewline -ForegroundColor Green
        $input = Read-Host
        
        if ($input -ne 'S' -and $input -ne 's') {
            Set-Clipboard -Value $secret.Value
            Write-Host "✓ Copied to clipboard!" -ForegroundColor Green
        } else {
            Write-Host "⊗ Skipped" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Value: $($secret.Value)" -ForegroundColor Yellow
        Write-Host "Note: $($secret.Note)" -ForegroundColor DarkGray
        Write-Host "⊗ Not available yet - $($secret.Note)" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ All secrets listed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Request admin to create service principal (see GITHUB_SECRETS_SETUP.md)" -ForegroundColor White
Write-Host "2. Add all secrets to GitHub → Settings → Environments → dev" -ForegroundColor White
Write-Host "3. Run workflow: Actions → Deploy Infrastructure (Terraform)" -ForegroundColor White
Write-Host ""
Write-Host "Full guide: GITHUB_SECRETS_SETUP.md" -ForegroundColor Cyan
