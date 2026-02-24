# Application Insights Module

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = var.retention_in_days
  
  tags = var.tags

  lifecycle {
    ignore_changes = [tags["CreatedDate"]]
  }
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "appi-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  application_type    = var.application_type
  workspace_id        = azurerm_log_analytics_workspace.main.id
  
  tags = var.tags

  lifecycle {
    ignore_changes = [tags["CreatedDate"]]
  }
}
