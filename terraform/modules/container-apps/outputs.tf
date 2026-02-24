# Container Apps Module - Outputs

output "environment_id" {
  description = "ID of the Container App Environment"
  value       = azurerm_container_app_environment.main.id
}

output "supabase_api_url" {
  description = "URL of the Supabase API (Kong gateway)"
  value       = "https://${azurerm_container_app.kong.ingress[0].fqdn}"
}

output "kong_fqdn" {
  description = "FQDN of the Kong container app"
  value       = azurerm_container_app.kong.ingress[0].fqdn
}

output "auth_name" {
  description = "Name of the Auth container app"
  value       = azurerm_container_app.auth.name
}

output "realtime_name" {
  description = "Name of the Realtime container app"
  value       = azurerm_container_app.realtime.name
}

output "storage_name" {
  description = "Name of the Storage container app"
  value       = azurerm_container_app.storage.name
}
