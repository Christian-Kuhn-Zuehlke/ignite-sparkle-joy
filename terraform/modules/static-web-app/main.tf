# Static Web App Module

resource "azurerm_static_web_app" "main" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_tier            = var.sku_tier
  sku_size            = var.sku_tier == "Free" ? "Free" : "Standard"
  
  tags = var.tags

  lifecycle {
    ignore_changes = [tags["CreatedDate"]]
  }
}
