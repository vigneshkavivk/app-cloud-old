 variable "application_name" {
  description = "Name of the application (used for naming resources)"
  type        = string
}

variable "log_group_name" {
  description = "Name of the CloudWatch Log Group"
  type        = string
}

variable "log_retention_days" {
  description = "Number of days to retain log events (0 = never expire)"
  type        = number
  default     = 14
}

variable "alert_email" {
  description = "Email address to receive SNS alert notifications"
  type        = string
  default     = ""
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster to monitor (optional)"
  type        = string
  default     = ""
}

variable "alb_name" {
  description = "Name of the ALB to monitor (optional)"
  type        = string
  default     = ""
}

variable "kms_key_id" {
  description = "KMS Key ID or ARN to encrypt the log group (optional)"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}

