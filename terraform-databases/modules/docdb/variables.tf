# modules/docdb/variables.tf

variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
}

variable "db_username" {
  description = "Master username for the DocumentDB cluster"
  type        = string
}

variable "db_password" {
  description = "Master password"
  type        = string
  sensitive   = true
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs (must span ≥2 AZs)"
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "DocumentDB requires subnets in at least 2 AZs."
  }
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
  default     = []
}

variable "backup_retention_period" {
  description = "Backup retention period in days (1–35)"
  type        = number
  default     = 7
  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention must be between 1 and 35 days."
  }
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when cluster is deleted"
  type        = bool
  default     = true
}

# ✅ Added: configurable instance class
variable "instance_class" {
  description = "Instance class for DocDB instances (e.g., db.t3.medium, db.r5.large)"
  type        = string
  default     = "db.t3.medium"
  validation {
    condition     = contains([
      "db.t3.medium", "db.t3.large",
      "db.r5.large", "db.r5.xlarge", "db.r5.2xlarge",
      "db.r6g.large", "db.r6g.xlarge"
    ], var.instance_class)
    error_message = "Unsupported instance class for DocumentDB."
  }
}

# ✅ Added: number of instances (for HA)
variable "instance_count" {
  description = "Number of DocDB instances to create (1–5)"
  type        = number
  default     = 1
  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 5
    error_message = "Instance count must be 1–5."
  }
}

# ✅ Added: CloudWatch log exports
variable "enabled_cloudwatch_logs_exports" {
  description = "CloudWatch log types to enable"
  type        = list(string)
  default     = ["audit", "profiler"]
  validation {
    condition     = alltrue([
      for v in var.enabled_cloudwatch_logs_exports : contains(["audit", "profiler", "slowquery"], v)
    ])
    error_message = "Only 'audit', 'profiler', and 'slowquery' are supported."
  }
}
