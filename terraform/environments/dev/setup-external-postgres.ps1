#!/usr/bin/env pwsh
# Setup script for PostgreSQL Configuration
# This script helps configure Terraform variables for external PostgreSQL

param(
    [Parameter(Mandatory=$true)]
    [string]$PostgresConnectionString,
    
    [Parameter(Mandatory=$false)]
    [string]$JwtSecret,
    
    [Parameter(Mandatory=$false)]
    [string]$AnonKey,
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceKey
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Configuration Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Connection string must include password" -ForegroundColor Yellow
Write-Host "Standard Supabase images require password authentication." -ForegroundColor Yellow
Write-Host "Azure AD Managed Identity is NOT supported." -ForegroundColor Yellow
Write-Host ""

# Validate connection string format
if ($PostgresConnectionString -notmatch '^postgresql://') {
    Write-Host "ERROR: Connection string must start with 'postgresql://'" -ForegroundColor Red
    Write-Host "Example: postgresql://user:password@host:5432/db?sslmode=require" -ForegroundColor Yellow
    exit 1
}

# Check if password is included
if ($PostgresConnectionString -notmatch ':.*@') {
    Write-Host "WARNING: Connection string appears to be missing a password!" -ForegroundColor Yellow
    Write-Host "Format should be: postgresql://username:password@hostname:port/database?sslmode=require" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y') {
        exit 1
    }
}

# Set PostgreSQL connection string
$env:TF_VAR_postgres_connection_string = $PostgresConnectionString
Write-Host "✓ PostgreSQL connection string configured" -ForegroundColor Green

# Generate or set Supabase secrets
if (-not $JwtSecret) {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $JwtSecret = [Convert]::ToBase64String($bytes)
    Write-Host "✓ Generated JWT secret" -ForegroundColor Green
} else {
    Write-Host "✓ Using provided JWT secret" -ForegroundColor Green
}
$env:TF_VAR_supabase_jwt_secret = $JwtSecret

if (-not $AnonKey) {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $AnonKey = [Convert]::ToBase64String($bytes)
    Write-Host "✓ Generated anonymous key" -ForegroundColor Green
} else {
    Write-Host "✓ Using provided anonymous key" -ForegroundColor Green
}
$env:TF_VAR_supabase_anon_key = $AnonKey

if (-not $ServiceKey) {
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $ServiceKey = [Convert]::ToBase64String($bytes)
    Write-Host "✓ Generated service key" -ForegroundColor Green
} else {
    Write-Host "✓ Using provided service key" -ForegroundColor Green
}
$env:TF_VAR_supabase_service_key = $ServiceKey

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Configuration Complete" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment variables set for current session:" -ForegroundColor Yellow
Write-Host "- TF_VAR_postgres_connection_string" -ForegroundColor White
Write-Host "- TF_VAR_supabase_jwt_secret" -ForegroundColor White
Write-Host "- TF_VAR_supabase_anon_key" -ForegroundColor White
Write-Host "- TF_VAR_supabase_service_key" -ForegroundColor White
Write-Host ""

# Save to terraform.tfvars file for persistence
$tfvarsFile = Join-Path $PSScriptRoot "terraform.tfvars"
@"
# Terraform Variables - Auto-loaded
# Generated $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# WARNING: Contains sensitive data - DO NOT commit to version control!

postgres_connection_string = "$PostgresConnectionString"
supabase_jwt_secret        = "$JwtSecret"
supabase_anon_key          = "$AnonKey"
supabase_service_key       = "$ServiceKey"
"@ | Out-File -FilePath $tfvarsFile -Encoding UTF8

Write-Host "Configuration saved to: $tfvarsFile" -ForegroundColor Green
Write-Host "This file is automatically loaded by Terraform." -ForegroundColor Green
Write-Host ""

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Deploy infrastructure:" -ForegroundColor Yellow
Write-Host "   cd terraform/environments/dev" -ForegroundColor White
Write-Host "   terraform init" -ForegroundColor White
Write-Host "   terraform apply" -ForegroundColor White
Write-Host ""
Write-Host "2. Setup database user and schemas:" -ForegroundColor Yellow
Write-Host "   See setup-database.sql for required SQL commands" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "  docs/EXTERNAL_POSTGRESQL_SETUP.md" -ForegroundColor White
Write-Host ""
