# Development Environment - Outputs

output "resource_group_name" {
  description = "Name of the resource group"
  value       = data.azurerm_resource_group.main.name
}

output "static_web_app_url" {
  description = "URL of the Static Web App"
  value       = module.static_web_app.default_hostname
}

output "static_web_app_api_key" {
  description = "API key for Static Web App deployment"
  value       = module.static_web_app.api_key
  sensitive   = true
}

output "container_registry_login_server" {
  description = "Login server for ACR"
  value       = module.container_registry.login_server
}

output "container_registry_admin_username" {
  description = "Admin username for ACR"
  value       = module.container_registry.admin_username
  sensitive   = true
}

output "supabase_api_url" {
  description = "Supabase API URL"
  value       = module.container_apps.supabase_api_url
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = module.application_insights.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = module.application_insights.connection_string
  sensitive   = true
}

