# Development Environment - Main Configuration

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      purge_soft_delete_on_destroy = true
    }
  }
}

# Local variables
locals {
  environment         = "dev"
  project_name        = var.project_name
  location            = var.location
  resource_group_name = "IGNITE-DEV" # Using existing resource group

  common_tags = {
    Environment = "Development"
    Project     = local.project_name
    ManagedBy   = "Terraform"
    CreatedDate = timestamp()
  }
}

# Use existing Resource Group
data "azurerm_resource_group" "main" {
  name = local.resource_group_name
}

# Static Web App for Frontend
module "static_web_app" {
  source = "../../modules/static-web-app"

  name                = "${local.project_name}-${local.environment}"
  resource_group_name = data.azurerm_resource_group.main.name
  location            = "westeurope"  # Static Web Apps not available in Switzerland North
  sku_tier            = var.static_web_app_sku
  tags                = local.common_tags
}

# Container Registry for Supabase images
module "container_registry" {
  source = "../../modules/container-registry"

  name                = "${local.project_name}${local.environment}acr"
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  sku                 = var.acr_sku
  admin_enabled       = true
  tags                = local.common_tags
}

# Networking (VNet, Subnets)
module "networking" {
  source = "../../modules/networking"

  name                = "${local.project_name}-${local.environment}"
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  existing_vnet_name  = "VNET-INFRA-MSD-IGNITE-CHN"
  tags                = local.common_tags
}

# Container Apps Environment for Supabase
module "container_apps" {
  source = "../../modules/container-apps"

  name                = "${local.project_name}-${local.environment}"
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location

  subnet_id = module.networking.container_apps_subnet_id

  # Supabase configuration
  supabase_jwt_secret        = var.supabase_jwt_secret
  supabase_anon_key          = var.supabase_anon_key
  supabase_service_key       = var.supabase_service_key
  postgres_connection_string = var.postgres_connection_string

  acr_login_server   = module.container_registry.login_server
  acr_admin_username = module.container_registry.admin_username
  acr_admin_password = module.container_registry.admin_password

  tags = local.common_tags
}

# Application Insights
module "application_insights" {
  source = "../../modules/application-insights"

  name                = "${local.project_name}-${local.environment}"
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location

  tags = local.common_tags
}
