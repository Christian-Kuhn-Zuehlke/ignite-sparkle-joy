# Application Insights Module - Outputs

output "id" {
  description = "ID of the Application Insights instance"
  value       = azurerm_application_insights.main.id
}

output "instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "connection_string" {
  description = "Connection string for Application Insights"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "app_id" {
  description = "Application ID"
  value       = azurerm_application_insights.main.app_id
}
