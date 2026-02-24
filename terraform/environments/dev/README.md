# Development Environment - Terraform Configuration

This directory contains the Terraform configuration for the development environment of the Ignite project.

## Quick Start

This setup uses an existing PostgreSQL database with password authentication. Network connectivity is via VNet peering.

**IMPORTANT:** Standard Supabase Docker images require password authentication. Azure AD Managed Identity is NOT supported.

1. **Configure environment variables:**
   ```powershell
   # Use the private DNS name with username:password format
   .\setup-external-postgres.ps1 -PostgresConnectionString "postgresql://supabase_app:YourPassword@pgsql-crossborderx-test-msd-chn.private.postgres.database.azure.com:5432/ignite_dev?sslmode=require"
   ```

2. **Deploy:**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

3. **Setup database user and schemas:**
   ```bash
   # Run the SQL script on your PostgreSQL database
   # See setup-database.sql for details
   psql -h pgsql-crossborderx-test-msd-chn.private.postgres.database.azure.com \
        -U your-admin-user -d postgres -f setup-database.sql
   ```

## Files in This Directory

- `main.tf` - Main infrastructure configuration
- `variables.tf` - Variable definitions
- `outputs.tf` - Output definitions
- `backend.tf` - Backend configuration
- `terraform.tfvars.example` - Example variable values
- `setup-external-postgres.ps1` - Helper script for external PostgreSQL setup
- `grant-db-access.sql` - SQL script to grant database access to managed identity
PostgreSQL setup
- `setup-database.sql` - SQL script to create user and grant permissions
- `grant-db-access.sql` - Alternative SQL script template

When fully deployed, this configuration creates:

- **Static Web App** - Frontend hosting
- **Container Registry** - Docker image s (uses existing VNET)
- **Container Apps Environment** - Supabase runtime
  - Kong (API Gateway)
  - Auth Service
  - Realtime Service
  - Storage Service
- **Managed Identity** - For PostgreSQL authentication
- **Application Insights** - Monitoring and logging

**Note:** PostgreSQL is external and not managed by this Terraform configuration.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TF_VAR_postgres_connection_string` | PostgreSQL connection string (with password) |
| `TF_VAR_supabase_jwt_secret` | JWT secret for Supabase |
| `TF_VAR_supabase_anon_key` | Anonymous key for Supabase |
| `TF_VAR_supabase_service_key` | Service role key for Supabase |

## Outputs

After deployment, you can view outputs:

```bash
terraform output
```

Key outputs:
- `supabase_api_url` - Supabase API endpoint
- `managed_identity_principal_id` - Use this to grant database access
- `managed_identity_client_id` - Use this as the password in grant-db-access.sql
- `static_web_app_url` - Frontend URL

## Common Commands

```bash
# Initialize Terraform
terraform init

# V
# Plan changes
terraform plan

# Apply changes
terraform apply

# Show current state
terraform show

# List outputs
terraform output

# Destroy infrastructure
terraform destroy
```

## Troubleshooting

### Connection String Issues

Ensure your connection string follows this format:
```
postgresql://username@hostname:5432/database?sslmode=require
```

For Azure PostgreSQL:
```
postgresql://myuser@myserver.postgres.database.azure.com:5432/mydb?sslmode=require
```

### Terraform Init Fails

If `terraform init` fails: with password:
```
postgresql://username:password@hostname:5432/database?sslmode=require
```

For Azure PostgreSQL with private endpoint:
```
postgresql://supabase_app:YourPassword@myserver.private
- **Resource already exists**: Check if resources were manually created
- **Permission denied**: Verify your Azure role assignments
- **Network issues**: Check VNet configuration and firewall rules

### Database Connection Issues

If Supabase can't connect to PostgreSQL:
1. Verify the connection string is correct
2. Check firewall rules on PostgreSQL
3. Ensure SSL is enabled (`sslmode=require`)
4. Verify managed identity has been granted access (run grant-db-access.sql)
5. Check container app logs: `az containerapp logs show --name ca-supabase-auth --resource-group IGNITE-DEV`

## Security Best Practices

1. **Never commit secrets**: Use environment variables or Azure Key Vault
2. **Use terraform.tfvars.example**: Copy to `terraform.tfvars` (which is .gitignored)
3. **Managed Identity**: Always enabled for PostgreSQL authentication
4. **Rotate secrets regularly**: Update JW with password included
2. Check firewall rules on PostgreSQL server
3. Ensure SSL is enabled (`sslmode=require`)
4. Verify the database user exists and has proper permissions
5. Test connection manually with psql using the same credentials

- [External PostgreSQL Setup Guide](../../../docs/EXTERNAL_POSTGRESQL_SETUP.md)
- [Terraform Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)

## Support

For issues or questions:
1. Check the [EXTERNAL_POSTGRESQL_SETUP.md](../../../docs/EXTERNAL_POSTGRESQL_SETUP.md) documentation
2. Review Terraform logs: `terraform apply -debug`
3. Check Azure Portal for resource status
4. Review container app logs in Azure Portal or CLI
