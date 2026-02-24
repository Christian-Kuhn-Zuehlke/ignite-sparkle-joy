# Static Web App Module - Outputs

output "id" {
  description = "ID of the Static Web App"
  value       = azurerm_static_web_app.main.id
}

output "default_hostname" {
  description = "Default hostname of the Static Web App"
  value       = azurerm_static_web_app.main.default_host_name
}

output "api_key" {
  description = "API key for deployment"
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}
