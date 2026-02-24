# Container Apps Module - Supabase Deployment

# Container Apps Environment
resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${var.name}"
  resource_group_name        = var.resource_group_name
  location                   = var.location
  infrastructure_subnet_id   = var.subnet_id
  internal_load_balancer_enabled = false
  
  tags = var.tags

  lifecycle {
    ignore_changes = [
      tags["CreatedDate"],
      infrastructure_resource_group_name
    ]
  }
}

# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  
  tags = var.tags

  lifecycle {
    ignore_changes = [tags["CreatedDate"]]
  }
}

# Container App: Supabase Kong (API Gateway)
resource "azurerm_container_app" "kong" {
  name                         = "ca-supabase-kong"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"
  
  registry {
    server               = var.acr_login_server
    username             = var.acr_admin_username
    password_secret_name = "acr-password"
  }
  
  secret {
    name  = "acr-password"
    value = var.acr_admin_password
  }
  
  secret {
    name  = "jwt-secret"
    value = var.supabase_jwt_secret
  }
  
  ingress {
    external_enabled = true
    target_port      = 8000
    
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }
  
  template {
    container {
      name   = "kong"
      image  = "${var.acr_login_server}/supabase/kong:latest"
      cpu    = 0.5
      memory = "1Gi"
      
      env {
        name  = "KONG_DATABASE"
        value = "off"
      }
      
      env {
        name  = "KONG_DECLARATIVE_CONFIG"
        value = "/var/lib/kong/kong.yml"
      }
    }
  }
  
  tags = var.tags

  lifecycle {
    ignore_changes = [tags["CreatedDate"]]
  }
}

# Container App: Supabase Auth
resource "azurerm_container_app" "auth" {
  name                         = "ca-supabase-auth"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"
  
  registry {
    server               = var.acr_login_server
    username             = var.acr_admin_username
    password_secret_name = "acr-password"
  }
  
  secret {
    name  = "acr-password"
    value = var.acr_admin_password
  }
  
  secret {
    name  = "jwt-secret"
    value = var.supabase_jwt_secret
  }
  
  secret {
    name  = "db-url"
    value = var.postgres_connection_string
  }
  
  template {
    container {
      name   = "auth"
      image  = "${var.acr_login_server}/supabase/auth:latest"
      cpu    = 0.5
      memory = "1Gi"
      
      env {
        name        = "GOTRUE_JWT_SECRET"
        secret_name = "jwt-secret"
      }
      
      env {
        name        = "GOTRUE_DB_DATABASE_URL"
        secret_name = "db-url"
      }
    }
  }
  
  tags = var.tags

  lifecycle {
    ignore_changes = [tags["CreatedDate"]]
  }
}

# Container App: Supabase Realtime
resource "azurerm_container_app" "realtime" {
  name                         = "ca-supabase-realtime"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"
  
  registry {
    server               = var.acr_login_server
    username             = var.acr_admin_username
    password_secret_name = "acr-password"
  }
  
  secret {
    name  = "acr-password"
    value = var.acr_admin_password
  }
  
  secret {
    name  = "jwt-secret"
    value = var.supabase_jwt_secret
  }
  
  secret {
    name  = "db-url"
    value = var.postgres_connection_string
  }
  
  template {
    container {
      name   = "realtime"
      image  = "${var.acr_login_server}/supabase/realtime:latest"
      cpu    = 0.5
      memory = "1Gi"
      
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
      
      env {
        name        = "DB_URL"
        secret_name = "db-url"
      }
    }
  }
  
  tags = var.tags

  lifecycle {
    ignore_changes = [tags["CreatedDate"]]
  }
}

# Container App: Supabase Storage
resource "azurerm_container_app" "storage" {
  name                         = "ca-supabase-storage"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"
  
  registry {
    server               = var.acr_login_server
    username             = var.acr_admin_username
    password_secret_name = "acr-password"
  }
  
  secret {
    name  = "acr-password"
    value = var.acr_admin_password
  }
  
  secret {
    name  = "jwt-secret"
    value = var.supabase_jwt_secret
  }
  
  secret {
    name  = "db-url"
    value = var.postgres_connection_string
  }
  
  template {
    container {
      name   = "storage"
      image  = "${var.acr_login_server}/supabase/storage-api:latest"
      cpu    = 0.5
      memory = "1Gi"
      
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
      
      env {
        name        = "DATABASE_URL"
        secret_name = "db-url"
      }
    }
  }
  
  tags = var.tags

  lifecycle {
    ignore_changes = [tags["CreatedDate"]]
  }
}
