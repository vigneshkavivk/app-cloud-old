variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}

variable "db_name" {
  description = "Name of the InfluxDB database to create"
  type        = string
  default     = "main"
}

variable "db_username" {
  description = "Admin username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Admin password"
  type        = string
  default     = "password123"
  sensitive   = true
}

