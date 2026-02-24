# Shared Resource Groups Module
# Use this for resources shared across environments

variable "location" {
  description = "Azure region"
  type        = string
  default     = "westeurope"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ignite"
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}

# Shared resource group (e.g., for shared services, monitoring)
resource "azurerm_resource_group" "shared" {
  name     = "rg-${var.project_name}-shared"
  location = var.location
  tags     = var.tags
}

output "shared_resource_group_name" {
  value = azurerm_resource_group.shared.name
}

output "shared_resource_group_id" {
  value = azurerm_resource_group.shared.id
}
