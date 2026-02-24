# Azure DevOps Pipeline Integration

This guide explains how to integrate Terraform with Azure DevOps pipelines.

## Service Principal Setup

1. Create a service principal for Terraform:

```bash
az ad sp create-for-rbac --name "sp-terraform-ignite" \
  --role="Contributor" \
  --scopes="/subscriptions/<SUBSCRIPTION_ID>"
```

Save the output:
- `appId` → `ARM_CLIENT_ID`
- `password` → `ARM_CLIENT_SECRET`
- `tenant` → `ARM_TENANT_ID`

2. Get your subscription ID:
```bash
az account show --query id -o tsv
```
This is your `ARM_SUBSCRIPTION_ID`

## Pipeline Variables

Add these as **secret variables** in your Azure DevOps pipeline:

| Variable Name | Description | Example |
|--------------|-------------|---------|
| `ARM_CLIENT_ID` | Service Principal App ID | `xxxxx-xxxx-xxxx-xxxx` |
| `ARM_CLIENT_SECRET` | Service Principal Password | `xxxxx` |
| `ARM_SUBSCRIPTION_ID` | Azure Subscription ID | `xxxxx-xxxx-xxxx-xxxx` |
| `ARM_TENANT_ID` | Azure AD Tenant ID | `xxxxx-xxxx-xxxx-xxxx` |
| `TF_VAR_postgres_connection_string` | PostgreSQL connection string with password | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `TF_VAR_supabase_jwt_secret` | Supabase JWT secret | Generated via `openssl rand -base64 32` |
| `TF_VAR_supabase_anon_key` | Supabase anon key | Generated JWT |
| `TF_VAR_supabase_service_key` | Supabase service key | Generated JWT |

## Example Pipeline - Development

Create `.azure-pipelines/terraform-dev.yml`:

```yaml
trigger:
  branches:
    include:
    - main
  paths:
    include:
    - terraform/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: terraform-dev-secrets  # Variable group with secrets
  - name: terraformVersion
    value: '1.5.7'
  - name: workingDirectory
    value: 'terraform/environments/dev'

stages:
- stage: Validate
  displayName: 'Validate Terraform'
  jobs:
  - job: Validate
    steps:
    - task: TerraformInstaller@0
      displayName: 'Install Terraform'
      inputs:
        terraformVersion: $(terraformVersion)
    
    - task: TerraformTaskV4@4
      displayName: 'Terraform Init'
      inputs:
        provider: 'azurerm'
        command: 'init'
        workingDirectory: $(workingDirectory)
        backendServiceArm: 'Azure-Terraform-Connection'
        backendAzureRmResourceGroupName: 'rg-ignite-tfstate'
        backendAzureRmStorageAccountName: 'igniteterraformstate'
        backendAzureRmContainerName: 'tfstate'
        backendAzureRmKey: 'dev.terraform.tfstate'
    
    - task: TerraformTaskV4@4
      displayName: 'Terraform Validate'
      inputs:
        provider: 'azurerm'
        command: 'validate'
        workingDirectory: $(workingDirectory)
    
    - task: TerraformTaskV4@4
      displayName: 'Terraform Format Check'
      inputs:
        provider: 'azurerm'
        command: 'custom'
        customCommand: 'fmt'
        commandOptions: '-check -recursive'
        workingDirectory: $(workingDirectory)

- stage: Plan
  displayName: 'Plan Infrastructure'
  dependsOn: Validate
  jobs:
  - job: Plan
    steps:
    - task: TerraformInstaller@0
      displayName: 'Install Terraform'
      inputs:
        terraformVersion: $(terraformVersion)
    
    - task: TerraformTaskV4@4
      displayName: 'Terraform Init'
      inputs:
        provider: 'azurerm'
        command: 'init'
        workingDirectory: $(workingDirectory)
        backendServiceArm: 'Azure-Terraform-Connection'
        backendAzureRmResourceGroupName: 'rg-ignite-tfstate'
        backendAzureRmStorageAccountName: 'igniteterraformstate'
        backendAzureRmContainerName: 'tfstate'
        backendAzureRmKey: 'dev.terraform.tfstate'
    
    - task: TerraformTaskV4@4
      displayName: 'Terraform Plan'
      inputs:
        provider: 'azurerm'
        command: 'plan'
        workingDirectory: $(workingDirectory)
        environmentServiceNameAzureRM: 'Azure-Terraform-Connection'
        commandOptions: '-out=tfplan'
      env:
        ARM_CLIENT_ID: $(ARM_CLIENT_ID)
        ARM_CLIENT_SECRET: $(ARM_CLIENT_SECRET)
        ARM_SUBSCRIPTION_ID: $(ARM_SUBSCRIPTION_ID)
        ARM_TENANT_ID: $(ARM_TENANT_ID)
        TF_VAR_postgres_connection_string: $(TF_VAR_postgres_connection_string)
        TF_VAR_supabase_jwt_secret: $(TF_VAR_supabase_jwt_secret)
        TF_VAR_supabase_anon_key: $(TF_VAR_supabase_anon_key)
        TF_VAR_supabase_service_key: $(TF_VAR_supabase_service_key)
    
    - task: PublishPipelineArtifact@1
      displayName: 'Publish Plan'
      inputs:
        targetPath: '$(workingDirectory)/tfplan'
        artifact: 'terraform-plan'

- stage: Apply
  displayName: 'Apply Infrastructure'
  dependsOn: Plan
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: Apply
    environment: 'dev'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: TerraformInstaller@0
            displayName: 'Install Terraform'
            inputs:
              terraformVersion: $(terraformVersion)
          
          - task: DownloadPipelineArtifact@2
            displayName: 'Download Plan'
            inputs:
              artifact: 'terraform-plan'
              path: $(workingDirectory)
          
          - task: TerraformTaskV4@4
            displayName: 'Terraform Init'
            inputs:
              provider: 'azurerm'
              command: 'init'
              workingDirectory: $(workingDirectory)
              backendServiceArm: 'Azure-Terraform-Connection'
              backendAzureRmResourceGroupName: 'rg-ignite-tfstate'
              backendAzureRmStorageAccountName: 'igniteterraformstate'
              backendAzureRmContainerName: 'tfstate'
              backendAzureRmKey: 'dev.terraform.tfstate'
          
          - task: TerraformTaskV4@4
            displayName: 'Terraform Apply'
            inputs:
              provider: 'azurerm'
              command: 'apply'
              workingDirectory: $(workingDirectory)
              environmentServiceNameAzureRM: 'Azure-Terraform-Connection'
              commandOptions: 'tfplan'
            env:
              ARM_CLIENT_ID: $(ARM_CLIENT_ID)
              ARM_CLIENT_SECRET: $(ARM_CLIENT_SECRET)
              ARM_SUBSCRIPTION_ID: $(ARM_SUBSCRIPTION_ID)
              ARM_TENANT_ID: $(ARM_TENANT_ID)
```

## Setup Steps

1. **Create Service Connection** in Azure DevOps:
   - Go to Project Settings → Service connections
   - New service connection → Azure Resource Manager
   - Service principal (manual)
   - Enter the SP credentials

2. **Create Variable Group**:
   - Go to Pipelines → Library
   - Add variable group: `terraform-dev-secrets`
   - Add all secret variables
   - Mark sensitive ones as secret

3. **Create Pipeline**:
   - Go to Pipelines → Create Pipeline
   - Select your repo
   - Choose existing YAML file
   - Point to `.azure-pipelines/terraform-dev.yml`

4. **Create Environment**:
   - Go to Pipelines → Environments
   - Create environment: `dev`
   - Add approvers if needed

## Best Practices

✅ Use separate pipelines for each environment  
✅ Always run plan before apply  
✅ Require manual approval for production  
✅ Store secrets in Azure Key Vault or variable groups  
✅ Use service principals with minimal required permissions  
✅ Enable branch protection for main branch  
✅ Review plan output before approving  

## Troubleshooting

**Authentication Errors:**
- Verify service principal credentials
- Check subscription ID is correct
- Ensure SP has Contributor role

**Backend Errors:**
- Verify storage account exists
- Check storage account name is correct
- Ensure backend container exists

**State Lock Errors:**
- Wait for other operations to complete
- Check for orphaned locks in storage account
