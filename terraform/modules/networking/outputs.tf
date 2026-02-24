# Networking Module - Outputs

output "vnet_id" {
  description = "ID of the virtual network"
  value       = data.azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = data.azurerm_virtual_network.main.name
}


output "container_apps_subnet_id" {
  description = "ID of the Container Apps subnet"
  value       = azurerm_subnet.container_apps.id
}
