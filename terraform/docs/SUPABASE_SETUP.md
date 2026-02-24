# Supabase Container Setup Guide

This guide explains how to prepare and push Supabase container images to Azure Container Registry.

## Prerequisites

- Docker installed and running
- Azure CLI authenticated
- ACR created via Terraform

## Step 1: Login to ACR

```bash
# Get ACR credentials from Terraform output
cd terraform/environments/dev
terraform output -json > outputs.json

# Login to ACR
az acr login --name <your-acr-name>

# Or use Docker login
docker login <your-acr-name>.azurecr.io -u <username> -p <password>
```

## Step 2: Pull Supabase Images

Pull the official Supabase images from Docker Hub:

```bash
# Kong API Gateway
docker pull kong:3.0

# Supabase Auth (GoTrue)
docker pull supabase/gotrue:v2.99.0

# Supabase Realtime
docker pull supabase/realtime:v2.25.0

# Supabase Storage API
docker pull supabase/storage-api:v0.43.11

# Supabase REST API (PostgREST)
docker pull postgrest/postgrest:v11.2.0

# Supabase Studio (optional - for management UI)
docker pull supabase/studio:latest
```

## Step 3: Tag and Push to ACR

Replace `<your-acr-name>` with your ACR name (e.g., `ignitedevacr`):

```bash
ACR_NAME="<your-acr-name>"

# Kong
docker tag kong:3.0 ${ACR_NAME}.azurecr.io/supabase/kong:latest
docker push ${ACR_NAME}.azurecr.io/supabase/kong:latest

# Auth (GoTrue)
docker tag supabase/gotrue:v2.99.0 ${ACR_NAME}.azurecr.io/supabase/auth:latest
docker push ${ACR_NAME}.azurecr.io/supabase/auth:latest

# Realtime
docker tag supabase/realtime:v2.25.0 ${ACR_NAME}.azurecr.io/supabase/realtime:latest
docker push ${ACR_NAME}.azurecr.io/supabase/realtime:latest

# Storage
docker tag supabase/storage-api:v0.43.11 ${ACR_NAME}.azurecr.io/supabase/storage-api:latest
docker push ${ACR_NAME}.azurecr.io/supabase/storage-api:latest

# PostgREST
docker tag postgrest/postgrest:v11.2.0 ${ACR_NAME}.azurecr.io/supabase/postgrest:latest
docker push ${ACR_NAME}.azurecr.io/supabase/postgrest:latest

# Studio (optional)
docker tag supabase/studio:latest ${ACR_NAME}.azurecr.io/supabase/studio:latest
docker push ${ACR_NAME}.azurecr.io/supabase/studio:latest
```

## Step 4: Generate Supabase Keys

Generate the required secrets for Supabase:

```bash
# JWT Secret (for signing JWTs)
openssl rand -base64 32

# For production, generate proper JWT keys:
# Anon key (public, for client-side access)
# Service key (private, for server-side access)
```

Visit https://supabase.com/docs/guides/hosting/overview#api-keys for more information on generating proper JWT keys.

## Step 5: Update Terraform Variables

Add the generated secrets to your `terraform.tfvars`:

```hcl
supabase_jwt_secret   = "<generated-jwt-secret>"
supabase_anon_key     = "<generated-anon-jwt>"
supabase_service_key  = "<generated-service-jwt>"
postgres_admin_password = "<secure-password>"
```

**IMPORTANT:** Never commit `terraform.tfvars` to version control!

## Automated Script

Create a helper script `scripts/push-supabase-images.sh`:

```bash
#!/bin/bash
set -e

ACR_NAME=$1

if [ -z "$ACR_NAME" ]; then
    echo "Usage: ./push-supabase-images.sh <acr-name>"
    exit 1
fi

echo "🔐 Logging into ACR: ${ACR_NAME}"
az acr login --name ${ACR_NAME}

echo "📦 Pulling Supabase images..."
docker pull kong:3.0
docker pull supabase/gotrue:v2.99.0
docker pull supabase/realtime:v2.25.0
docker pull supabase/storage-api:v0.43.11
docker pull postgrest/postgrest:v11.2.0

echo "🏷️  Tagging images for ACR..."
docker tag kong:3.0 ${ACR_NAME}.azurecr.io/supabase/kong:latest
docker tag supabase/gotrue:v2.99.0 ${ACR_NAME}.azurecr.io/supabase/auth:latest
docker tag supabase/realtime:v2.25.0 ${ACR_NAME}.azurecr.io/supabase/realtime:latest
docker tag supabase/storage-api:v0.43.11 ${ACR_NAME}.azurecr.io/supabase/storage-api:latest
docker tag postgrest/postgrest:v11.2.0 ${ACR_NAME}.azurecr.io/supabase/postgrest:latest

echo "⬆️  Pushing images to ACR..."
docker push ${ACR_NAME}.azurecr.io/supabase/kong:latest
docker push ${ACR_NAME}.azurecr.io/supabase/auth:latest
docker push ${ACR_NAME}.azurecr.io/supabase/realtime:latest
docker push ${ACR_NAME}.azurecr.io/supabase/storage-api:latest
docker push ${ACR_NAME}.azurecr.io/supabase/postgrest:latest

echo "✅ All images pushed successfully!"
echo "📝 Update your Container Apps to use these images"
```

Make it executable:
```bash
chmod +x scripts/push-supabase-images.sh
```

Run it:
```bash
./scripts/push-supabase-images.sh ignitedevacr
```

## Verification

Check that images are in ACR:

```bash
az acr repository list --name <your-acr-name> --output table
```

## Next Steps

1. Run Terraform to create Container Apps
2. Verify containers are running:
   ```bash
   az containerapp list --resource-group rg-ignite-dev --output table
   ```
3. Check logs for any issues:
   ```bash
   az containerapp logs show --name ca-supabase-kong --resource-group rg-ignite-dev
   ```
4. Test Supabase API endpoint
5. Configure your frontend to use the new Supabase URL

## Troubleshooting

**Image Pull Errors:**
- Verify ACR admin is enabled in Terraform
- Check ACR credentials in Container App configuration
- Ensure images exist in ACR

**Container Start Errors:**
- Check environment variables are correct
- Verify PostgreSQL connection string
- Review container logs for specific errors

**Connection Errors:**
- Verify networking/subnet configuration
- Check NSG rules allow traffic
- Ensure Private DNS is configured correctly
