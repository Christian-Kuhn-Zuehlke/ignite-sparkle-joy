# Networking Module - Variables

variable "name" {
  description = "Base name for networking resources"
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

variable "existing_vnet_name" {
  description = "Name of the existing virtual network to use"
  type        = string
  default     = "VNET-INFRA-MSD-IGNITE-CHN"
}

variable "create_postgresql_subnet" {
  description = "Whether to create a PostgreSQL subnet (for private endpoint)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
