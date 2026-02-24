# External PostgreSQL Configuration - Changes Summary

This document summarizes all changes made to support using an existing PostgreSQL database with Supabase.

## Overview

The infrastructure is configured to **only** support external PostgreSQL databases. There is no option to create a managed PostgreSQL instance through Terraform - this simplifies the configuration and reduces maintenance overhead.

## Changes Made

### 1. Terraform Configuration

#### [terraform/environments/dev/main.tf](../../terraform/environments/dev/main.tf)
- Removed PostgreSQL module entirely
- Removed all conditional logic for PostgreSQL deployment modes
- Simplified to use connection string directly from variable
- Managed Identity is always enabled for authentication

#### [terraform/environments/dev/variables.tf](../../terraform/environments/dev/variables.tf)
- Removed `use_external_postgres` variable (no longer needed)
- Renamed `external_postgres_connection_string` to `postgres_connection_string`
- Removed `use_managed_identity_for_postgres` (always enabled)
- Removed all managed PostgreSQL variables (admin credentials, SKU, storage, version)

#### [terraform/environments/dev/terraform.tfvars.example](../../terraform/environments/dev/terraform.tfvars.example)
- Updated with external PostgreSQL configuration options
- Added environment variable guidance
- Organized into sections for clarity

### 2. Container Apps Module

#### [terraform/modules/container-apps/main.tf](../../terraform/modules/container-apps/main.tf)
- Added User Assigned Managed Identity resource (always created)
- Updated Auth, Realtime, and Storage container apps with:
  - Identity block for managed identity authentication
  - `AZURE_CLIENT_ID` environment variable for Azure AD auth
  
#### [terraform/modules/container-apps/variables.tf](../../terraform/modules/container-apps/variables.tf)
- Added `use_managed_identity` variable (always true from environment config)

#### [terraform/modules/container-apps/outputs.tf](../../terraform/modules/container-apps/outputs.tf)
- Added managed identity outputs:
  - `managed_identity_id`
  - `managed_identity_client_id`
  - `managed_identity_principal_id`

### 3. Supabase Configuration

#### [supabase/config.toml](../../supabase/config.toml)
- Added `[db]` section with documentation
- Connection string is read from environment variable

### 4. Documentation

#### [docs/EXTERNAL_POSTGRESQL_SETUP.md](../../docs/EXTERNAL_POSTGRESQL_SETUP.md)
Created comprehensive guide covering:
- Configuration steps
- Environment variable setup
- PostgreSQL connection string formats
- Azure AD authentication enablement
- Granting database access to managed identity
- Running Supabase migrations
- Troubleshooting common issues
- Architecture diagram
- Security best practices

#### [terraform/environments/dev/README.md](../../terraform/environments/dev/README.md)
Created quick start guide with:
- Both deployment modes (external and managed)
- File descriptions
- Infrastructure components list
- Environment variables reference
- Common Terraform commands
- Troubleshooting section

### 5. Helper Scripts

#### [terraform/environments/dev/setup-external-postgres.ps1](../../terraform/environments/dev/setup-external-postgres.ps1)
PowerShell script that:
- Validates PostgreSQL connection string
- Sets up environment variables for Terraform
- Generates Supabase secrets if not provided
- Saves configuration to terraform.tfvars file
- Displays next steps

#### [terraform/environments/dev/grant-db-access.sql](../../terraform/environments/dev/grant-db-access.sql)
SQL script that:
- Creates role for managed identity
- Creates required Supabase schemas (auth, storage, realtime)
- Grants necessary permissions
- Enables required PostgreSQL extensions
- Includes verification queries

## How It Works

### External PostgreSQL Only

The configuration:

1. Uses PostgreSQL connection string from environment variable `TF_VAR_postgres_connection_string`
2. Creates User Assigned Managed Identity for Container Apps (always enabled)
3. Configures Supabase services with:
   - Database connection string
   - Managed identity for authentication
   - Azure AD client ID

### Authentication Flow

```
Container App (Supabase Service)
    ↓
Uses Managed Identity (AZURE_CLIENT_ID)
    ↓
Azure AD authenticates the identity
    ↓
PostgreSQL verifies Azure AD token
    ↓
Access granted based on role permissions
```

### Connection String Priority

### Quick Setup

1. **Run setup script:**
   ```powershell
   cd terraform/environments/dev
   .\setup-external-postgres.ps1 -PostgresConnectionString "postgresql://user@host:5432/db?sslmode=require"
   ```

2. **Configure Terraform:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit and set: use_external_postgres = true
   ```

3. **Deploy:**
   ```bash
   terraform init
   terraform apply
   ```

3  # Then run the SQL script on your PostgreSQL database
   psql -h your-host -U your-admin -d your-db -f grant-db-access.sql
   ```

5. **Deploy Supabase migrations:**
   ```bash
   cd ../../../supabase
   supabase db push
   ```

## Environment Variables

### For External PostgreSQL:
```powershell
$env:TF_VAR_external_postgres_connection_string = "postgresql://..."
$env:TF_VAR_supabase_jwt_secret = "..."
$env:TF_VAR_supabase_anon_key = "..."
$env:TF_VAR_supabase_service_key = "..."
```

### For Managed PostgreSQL:
```powershell
$env:TF_VAR_postgres_admin_password = "..."
All configuration via environment variables:

```powershell
$env:TF_VAR_postgres_connection_string = "postgresql://ssary database permissions
5. **Azure AD Integration**: Enable on PostgreSQL for managed identity support

## Testing

After deployment, verify:

1. **Infrastructure:** `terraform output`
2. **Managed Identity:** `az identity show --name id-ignite-dev-ca --resource-group IGNITE-DEV`
3. **Database Access:** Connect to PostgreSQL and check role exists
4. **Container Apps:** Check logs in Azure Portal
5. **API Endpoint:** Test Supabase API URL from outputs

## Rollback

To switch back to managedAlways enabled for PostgreSQL authentication
2. **SSL Required**: Always use `sslmode=require` in connection strings
3. **No Secrets in Code**: All sensitive values via environment variables
4. **Least Privilege**: Grant only necessary database permissions
5. **Azure AD Integration**: Required
4. Migrate data if needed

## Files Modified

- ✅ terraform/environments/dev/main.tf
- ✅ terraform/environments/dev/variables.tf
- ✅ terraform/environments/dev/README.md
- ✅ terraform/environments/dev/setup-external-postgres.ps1
- ✅ terraform/environments/dev/grant-db-access.sql

## Next Steps

1. Review the changes in terraform configuration
2. Set up your environment variables using the setup script
3. Update terraform.tfvars with your configuration
4. Run terraform apply
5. Grant database access using the SQL script
6. Deploy Supabase migrations
7. Test the deployment

For detailed instructions, see:
- [EXTERNAL_POSTGRESQL_SETUP.md](../../docs/EXTERNAL_POSTGRESQL_SETUP.md)
- [terraform/environments/dev/README.md](../../terraform/environments/dev/README.md)
