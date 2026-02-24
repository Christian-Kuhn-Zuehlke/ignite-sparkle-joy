# Development Environment - Variables

variable "project_name" {
  description = "Name of the project, used for resource naming"
  type        = string
  default     = "ignite"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "switzerlandnorth"
}

# Static Web App
variable "static_web_app_sku" {
  description = "SKU tier for Static Web App"
  type        = string
  default     = "Free"
  validation {
    condition     = contains(["Free", "Standard"], var.static_web_app_sku)
    error_message = "SKU must be Free or Standard"
  }
}

# Container Registry
variable "acr_sku" {
  description = "SKU for Azure Container Registry"
  type        = string
  default     = "Basic"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "ACR SKU must be Basic, Standard, or Premium"
  }
}

# PostgreSQL - External Database Only
variable "postgres_connection_string" {
  description = "Connection string for external PostgreSQL database"
  type        = string
  sensitive   = true
}

# Supabase
variable "supabase_jwt_secret" {
  description = "JWT secret for Supabase"
  type        = string
  sensitive   = true
}

variable "supabase_anon_key" {
  description = "Anonymous key for Supabase"
  type        = string
  sensitive   = true
}

variable "supabase_service_key" {
  description = "Service role key for Supabase"
  type        = string
  sensitive   = true
}
