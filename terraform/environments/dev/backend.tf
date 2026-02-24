# Configure Terraform backend for state management
terraform {
  backend "azurerm" {
    resource_group_name  = "IGNITE-DEV"
    storage_account_name = "igniteterraformstate" # UPDATE: Must be globally unique
    container_name       = "tfstate"
    key                  = "dev.terraform.tfstate"
  }
}
