# Networking Module - Using Existing VNet

# Use existing Virtual Network
data "azurerm_virtual_network" "main" {
  name                = var.existing_vnet_name
  resource_group_name = var.resource_group_name
}

# Reference existing subnet (without modifying delegation)
# Container Apps Environment will need a dedicated subnet with proper delegation
resource "azurerm_subnet" "container_apps" {
  name                 = "SUBNET-IGNITE-TEST"
  resource_group_name  = var.resource_group_name
  virtual_network_name = data.azurerm_virtual_network.main.name
  address_prefixes     = ["10.2.3.0/26"]

  delegation {
    name = "container-apps-delegation"

    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}
