# Container Apps Module - Variables

variable "name" {
  description = "Base name for container apps"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "subnet_id" {
  description = "ID of the subnet for Container Apps"
  type        = string
}

variable "acr_login_server" {
  description = "Login server for Azure Container Registry"
  type        = string
}

variable "acr_admin_username" {
  description = "Admin username for ACR"
  type        = string
  sensitive   = true
}

variable "acr_admin_password" {
  description = "Admin password for ACR"
  type        = string
  sensitive   = true
}

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

variable "postgres_connection_string" {
  description = "PostgreSQL connection string (must include password)"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
