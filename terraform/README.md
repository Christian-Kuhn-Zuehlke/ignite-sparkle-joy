# Terraform Infrastructure for Ignite

This directory contains Terraform configurations for deploying Ignite to Azure.

## Architecture Overview

- **Frontend**: Azure Static Web App (Vite/React)
- **Backend**: Self-hosted Supabase on Azure Container Apps
- **Database**: Azure PostgreSQL Flexible Server
- **Container Registry**: Azure Container Registry (for Supabase images)
- **Monitoring**: Application Insights

## Directory Structure

```
terraform/
├── environments/           # Environment-specific configurations
│   ├── dev/               # Development environment
│   └── prod/              # Production environment (placeholder)
├── modules/               # Reusable Terraform modules
│   ├── static-web-app/   # Frontend hosting
│   ├── container-registry/ # ACR for Docker images
│   ├── container-apps/    # Supabase containers
│   ├── postgresql/        # Azure PostgreSQL
│   ├── application-insights/ # Monitoring
│   └── networking/        # VNets, subnets, NSGs
└── shared/                # Shared resources across environments
    └── resource-groups/   # Common resource groups
```

## Prerequisites

1. Azure CLI installed and authenticated
2. Terraform >= 1.5.0
3. Azure subscription with appropriate permissions

## State Management

This project uses **Azure Storage Backend** for Terraform state:

- State files stored in Azure Blob Storage
- State locking enabled (prevents concurrent modifications)
- Separate state per environment

### Initial Setup

Before running Terraform, create the storage backend:

```bash
# Run from terraform/ directory
./scripts/setup-backend.sh
```

Or manually:
```bash
az group create --name rg-tfstate --location westeurope
az storage account create --name <unique-name>tfstate --resource-group rg-tfstate --sku Standard_LRS
az storage container create --name tfstate --account-name <unique-name>tfstate
```

## Usage

### Development Environment

```bash
cd environments/dev
terraform init
terraform plan
terraform apply
```

### Production Environment

```bash
cd environments/prod
# (To be configured later)
terraform init
terraform plan
terraform apply
```

## Azure DevOps Integration

Add these variables to your pipeline:
- `ARM_CLIENT_ID`
- `ARM_CLIENT_SECRET`
- `ARM_SUBSCRIPTION_ID`
- `ARM_TENANT_ID`

See `docs/AZURE_DEVOPS.md` for pipeline examples.

## Modules

Each module is self-contained and reusable:

- **static-web-app**: Frontend deployment
- **container-registry**: Docker image storage
- **container-apps**: Supabase service containers
- **postgresql**: Managed PostgreSQL database
- **application-insights**: Logging and monitoring
- **networking**: Network infrastructure

## Best Practices Applied

✅ Separate environments with dedicated state files  
✅ Reusable, composable modules  
✅ Variables defined at appropriate levels  
✅ Outputs for cross-module references  
✅ Remote state backend with locking  
✅ Consistent naming conventions  
✅ Tags for resource organization  

## Next Steps

1. Update `terraform.tfvars` in environments/dev with your values
2. Run setup script to create backend storage
3. Initialize and apply dev environment
4. Configure Azure DevOps pipelines
5. Populate prod environment when ready
