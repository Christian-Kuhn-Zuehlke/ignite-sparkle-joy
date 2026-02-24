# Deployment Guide

Step-by-step guide to deploy Ignite to Azure.

## Prerequisites

✅ Azure CLI installed and authenticated  
✅ Terraform >= 1.5.0 installed  
✅ Docker installed (for Supabase images)  
✅ Azure subscription with appropriate permissions  

## Phase 1: Initial Setup

### 1.1 Create Backend Storage

```bash
cd terraform
./scripts/setup-backend.sh
```

This creates:
- Resource group: `rg-ignite-tfstate`
- Storage account: `igniteterraformstate`
- Blob container: `tfstate`

### 1.2 Update Backend Configuration

Edit `terraform/environments/dev/backend.tf` and update the storage account name if you changed it:

```hcl
storage_account_name = "your-unique-name"
```

### 1.3 Create terraform.tfvars

```bash
cd environments/dev
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
project_name = "ignite"
location     = "westeurope"

postgres_admin_username = "psqladmin"
postgres_admin_password = "YourSecurePassword123!"  # Change this!

# Generate these with: openssl rand -base64 32
supabase_jwt_secret   = "your-jwt-secret"
supabase_anon_key     = "your-anon-key"
supabase_service_key  = "your-service-key"
```

**IMPORTANT:** Add `terraform.tfvars` to `.gitignore`!

## Phase 2: Deploy Infrastructure

### 2.1 Initialize Terraform

```bash
cd terraform/environments/dev
terraform init
```

Expected output:
```
Terraform has been successfully initialized!
```

### 2.2 Validate Configuration

```bash
terraform validate
terraform fmt -recursive
```

### 2.3 Plan Deployment

```bash
terraform plan -out=tfplan
```

Review the plan carefully. You should see resources like:
- Resource Group
- Static Web App
- Container Registry
- Virtual Network & Subnets
- PostgreSQL Flexible Server
- Container Apps Environment
- Container Apps (Kong, Auth, Realtime, Storage)
- Application Insights

### 2.4 Apply Configuration

```bash
terraform apply tfplan
```

This will take 15-30 minutes. ☕

### 2.5 Capture Outputs

```bash
terraform output -json > outputs.json
```

Save important values:
```bash
# Static Web App URL
terraform output static_web_app_url

# Static Web App deployment token
terraform output -raw static_web_app_api_key

# Supabase API URL
terraform output supabase_api_url

# Application Insights key
terraform output -raw application_insights_instrumentation_key
```

## Phase 3: Setup Supabase

### 3.1 Push Images to ACR

Follow the [Supabase Setup Guide](./SUPABASE_SETUP.md):

```bash
cd terraform
./scripts/push-supabase-images.sh <your-acr-name>
```

### 3.2 Verify Containers

```bash
az containerapp list --resource-group ignite-dev --output table
```

All containers should show status "Running".

### 3.3 Run Database Migrations

Connect to your PostgreSQL and run Supabase migrations:

```bash
# Get connection details
terraform output postgres_fqdn

# Connect using psql
psql "postgresql://psqladmin@<fqdn>:5432/postgres?sslmode=require"

# Run migrations from your project
# Copy the SQL from supabase/migrations/
```

## Phase 4: Deploy Frontend

### 4.1 Update Frontend Configuration

Update your frontend environment variables:

```env
VITE_SUPABASE_URL=<supabase_api_url from terraform output>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_APP_INSIGHTS_CONNECTION_STRING=<app_insights_connection_string>
```

### 4.2 Build Frontend

```bash
bun install
bun run build
```

### 4.3 Deploy to Static Web App

Using Azure CLI:

```bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Get deployment token
DEPLOYMENT_TOKEN=$(terraform output -raw static_web_app_api_key)

# Deploy
swa deploy ./dist \
  --deployment-token $DEPLOYMENT_TOKEN \
  --app-location ./dist \
  --output-location ./dist
```

Or use Azure DevOps/GitHub Actions (see [AZURE_DEVOPS.md](./AZURE_DEVOPS.md))

### 4.4 Verify Deployment

Visit the Static Web App URL:
```bash
terraform output static_web_app_url
```

## Phase 5: Post-Deployment Configuration

### 5.1 Configure Custom Domain (Optional)

In Azure Portal:
1. Go to Static Web App
2. Settings → Custom domains
3. Add your domain
4. Update DNS records

### 5.2 Setup Monitoring

1. Configure Application Insights alerts
2. Setup Log Analytics queries
3. Create dashboards

### 5.3 Enable Authentication

Configure Static Web App authentication providers if needed.

## Phase 6: CI/CD Setup

Setup Azure DevOps pipelines (see [AZURE_DEVOPS.md](./AZURE_DEVOPS.md)):

1. Create service principal
2. Configure pipeline variables
3. Create pipeline YAML
4. Test deployment

## Verification Checklist

- [ ] Infrastructure deployed successfully
- [ ] PostgreSQL accessible from Container Apps
- [ ] All Container Apps running
- [ ] Supabase API responding
- [ ] Frontend deployed and accessible
- [ ] Application Insights receiving data
- [ ] Authentication working
- [ ] Database migrations applied

## Rollback

If something goes wrong:

```bash
# Destroy specific resources
terraform destroy -target=module.container_apps

# Or destroy everything
terraform destroy
```

## Common Issues

### Issue: PostgreSQL Connection Failed

**Solution:** Check NSG rules and Private DNS configuration:
```bash
az network nsg rule list --resource-group rg-ignite-dev --nsg-name nsg-postgresql
```

### Issue: Container Apps Not Starting

**Solution:** Check logs:
```bash
az containerapp logs show \
  --name ca-supabase-kong \
  --resource-group rg-ignite-dev \
  --follow
```

### Issue: Static Web App Build Failed

**Solution:** Verify build configuration in `staticwebapp.config.json`

### Issue: State Lock Error

**Solution:** Release the lock:
```bash
terraform force-unlock <LOCK_ID>
```

## Cost Estimation

Development environment (approximate monthly costs):
- Static Web App (Free): $0
- Container Registry (Basic): $5
- PostgreSQL (B1ms): $30
- Container Apps: $40-60
- Application Insights: $5-10
- Network: $5

**Total: ~$85-110/month**

## Next Steps

1. [ ] Configure backup and disaster recovery
2. [ ] Setup production environment
3. [ ] Implement monitoring alerts
4. [ ] Document runbooks
5. [ ] Setup cost alerts
6. [ ] Configure auto-scaling policies

## Support

For issues:
1. Check logs in Application Insights
2. Review Container App logs
3. Check Azure DevOps pipeline runs
4. Verify Terraform state

## Cleanup

To remove everything:

```bash
cd terraform/environments/dev
terraform destroy

# Remove backend storage (optional)
az group delete --name rg-ignite-tfstate
```
