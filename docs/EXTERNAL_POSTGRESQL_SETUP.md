# Using External PostgreSQL with Supabase and Terraform

This guide explains how to configure your infrastructure to use an existing PostgreSQL database with Supabase.

## Overview

The infrastructure is configured to use your existing PostgreSQL database via a connection string with password authentication. 

**IMPORTANT:** Standard Supabase Docker images do NOT support Azure AD Managed Identity authentication. You must use password-based authentication.

## Configuration Steps

### 1. Set Environment Variables

Set the following environment variables for Terraform:

#### PowerShell
```powershell
# Required: PostgreSQL connection string (with password)
$env:TF_VAR_postgres_connection_string = "postgresql://username:password@hostname:5432/database?sslmode=require"

# Required: Supabase secrets
$env:TF_VAR_supabase_jwt_secret = "your-jwt-secret-at-least-32-characters"
$env:TF_VAR_supabase_anon_key = "your-anon-key"
$env:TF_VAR_supabase_service_key = "your-service-key"
```

#### Bash
```bash
# Required: PostgreSQL connection string (with password)
export TF_VAR_postgres_connection_string="postgresql://username:password@hostname:5432/database?sslmode=require"

# Required: Supabase secrets
export TF_VAR_supabase_jwt_secret="your-jwt-secret-at-least-32-characters"
export TF_VAR_supabase_anon_key="your-anon-key"
export TF_VAR_supabase_service_key="your-service-key"
```

### 2. Use the Setup Script (Recommended)

The easiest way to configure your environment:

```bash
cd terraform/environments/dev
.\setup-external-postgres.ps1 -PostgresConnectionString "postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST:5432/YOUR_DB?sslmode=require"
```

This script will:
- Validate your connection string format
- Warn if password is missing
- Set up all required environment variables
- Generate Supabase secrets if not provided
- Save configuration to `terraform.tfvars` for future sessions

### 3. PostgreSQL Connection String Format

The connection string must include a password for authentication:

#### Standard Format (Username/Password)
```
postgresql://username:password@hostname:5432/database?sslmode=require
```

For Azure PostgreSQL Flexible Server:
```
postgresql://supabase_app:YourPassword@myserver.postgres.database.azure.com:5432/mydb?sslmode=require
```

#### For Cross-Subscription PostgreSQL (MS Direct Infrastructure)

Use the private DNS name for cross-subscription access:

```
postgresql://supabase_app:YourPassword@pgsql-crossborderx-test-msd-chn.private.postgres.database.azure.com:5432/ignite_dev?sslmode=require
```

**Important:** Network connectivity must exist between subscriptions (via VNet peering).

### 4. Create PostgreSQL User and Schemas

Connect to your PostgreSQL database as an admin and run the SQL script:

See [setup-database.sql](../terraform/environments/dev/setup-database.sql) for the complete script.

Key steps:
1. Create database (if it doesn't exist)
2. Create user `supabase_app` with a secure password
3. Create required schemas (auth, storage, realtime, extensions)
4. Grant all necessary permissions

Example:
```sql
CREATE USER supabase_app WITH PASSWORD 'YourSecurePassword123!';
GRANT CONNECT ON DATABASE ignite_dev TO supabase_app;
GRANT ALL PRIVILEGES ON DATABASE ignite_dev TO supabase_app;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_app;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_app;
CREATE SCHEMA IF NOT EXISTS realtime AUTHORIZATION supabase_app;
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION supabase_app;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 5. Deploy Infrastructure with Terraform

```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

### 6. Run Supabase Migrations

```bash
cd supabase
supabase db push
```

Or if using migration files:
```bash
supabase migration up
```

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `TF_VAR_postgres_connection_string` | Yes | PostgreSQL connection string |
| `TF_VAR_supabase_jwt_secret` | Yes | JWT secret for Supabase (32+ chars) |
| `TF_VAR_supabase_anon_key` | Yes | Supabase anonymous key |
| `TF_VAR_supabase_service_key` | Yes | Supabase service role key |

## Troubleshooting

### Connection Issues

If Supabase services can't connect to PostgreSQL:

1. **Check connection string format**: Ensure password is included and format is correct
2. **Verify SSL requirement**: Azure PostgreSQL requires SSL (`sslmode=require`)
3. **Check VNet peering**: For cross-subscription access, verify VNet peering is active
4. **Verify user permissions**: Confirm database user has necessary grants
5. **Test private DNS resolution**: Ensure the private DNS zone is linked to your VNet
6. **Check NSG rules**: Verify network security groups allow traffic from Container Apps subnet
7. **Test connection**: Try connecting with psql using the same connection string

### Cross-Subscription Connectivity

For PostgreSQL in a different subscription:

1. **VNet Peering**: Must exist between the Container Apps VNet and PostgreSQL VNet
2. **Private DNS**: The private DNS zone must be resolvable from the Container Apps subnet
3. **Database User**: Must exist with password and proper permissions
4. **Firewall Rules**: PostgreSQL firewall should allow the Container Apps subnet CIDR

### Password Security

Best practices for password management:

1. Use strong, randomly generated passwords
2. Store connection strings as Terraform secrets (environment variables)
3. Never commit connection strings to version control
4. Consider using Azure Key Vault for secret storage
5. Rotate passwords regularly
6. Use separate users for different environments
4. **Firewall Rules**: PostgreSQL firewall should allow the Container Apps subnet CIDR

### Authentication Issues

If you see authentication errors:

1. **Verify password is correct** in the connection string
2. **Check the database user exists** and has proper permissions
3. **Test connection manually** using psql with the same credentials
4. **Check firewall rules** on PostgreSQL server

### Check Container App Logs

```bash
# Get container app environment logs
az containerapp logs show \
  --name ca-supabase-auth \
  --resource-group IGNITE-DEV \
  --follow
```

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│  Azure Subscription: MSDG-MSD-AI-INITIATIVES│
│  Resource Group: IGNITE-DEV                 │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Container Apps                         │ │
│  │  ├─ Kong (API Gateway)                 │ │
│  │  ├─ Auth (Password Auth)               │ │──┐
│  │  ├─ Realtime (Password Auth)           │ │  │
│  │  └─ Storage (Password Auth)            │ │  │
│  └────────────────────────────────────────┘ │  │
│                                              │  │
│  VNet: VNET-INFRA-MSD-IGNITE-CHN            │  │
│  Subnet: SUBNET-IGNITE-TEST (10.2.3.0/26)   │  │
└──────────────────────────────────────────────┘  │
                                                  │
            VNet Peering (Existing)               │
                    ↓                             │
┌─────────────────────────────────────────────┐  │
│  Azure Subscription: MS Direct Infrastructure│  │
│                                              │  │
│  VNet: vnet-CrossborderX-MSD-chn            │  │
│  Subnet: subnet-pgsql                        │  │
│                                              │  │
│  ┌────────────────────────────────────────┐ │  │
│  │ PostgreSQL Flexible Server             │ │◄─┘
│  │ pgsql-crossborderx-test-msd-chn        │ │
│  │                                         │ │
│  │ - Password authentication              │ │
│  │ - User: supabase_app                   │ │
│  │ - Private endpoint in subnet-pgsql     │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Security Best Practices

1. **Never commit connection strings**: Use environment variables or Azure Key Vault
2. **Enable SSL**: Always use `sslmode=require` for PostgreSQL connections
3. **Use strong passwords**: Generate secure, random passwords
4. **Limit permissions**: Grant only necessary database permissions
5. **Network isolation**: Use VNet peering and private endpoints
6. **Monitor access**: Enable PostgreSQL audit logging
7. **Rotate credentials**: Change passwords regularly
5. **Network isolation**: Use Azure Private Link or VNet integration when possible
6. **Monitor access**: Enable PostgreSQL audit loggingumentation](https://docs.microsoft.com/en-us/azure/postgresql/flexible-server/)
- [Azure Managed Identity Documentation](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/)
- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
