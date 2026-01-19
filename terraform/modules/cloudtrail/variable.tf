variable "aws_account_id" {
  description = "AWS Account ID where CloudTrail will be deployed"
  type        = string
}

variable "region" {
  description = "AWS region for S3 bucket naming (used if bucket name is not provided)"
  type        = string
}

variable "trail_name" {
  description = "Name of the CloudTrail trail"
  type        = string
  default     = "default-cloudtrail"
}

variable "s3_bucket_name" {
  description = "Custom S3 bucket name for logs. If empty, auto-generated."
  type        = string
  default     = ""
}

variable "s3_key_prefix" {
  description = "S3 key prefix for CloudTrail logs"
  type        = string
  default     = "cloudtrail"
}

variable "include_global_service_events" {
  description = "Whether to include global service events (e.g., IAM, STS)"
  type        = bool
  default     = true
}

variable "is_multi_region_trail" {
  description = "Whether the trail applies to all regions"
  type        = bool
  default     = true
}

variable "enable_log_file_validation" {
  description = "Enable log file validation (creates signed digest files)"
  type        = bool
  default     = true
}


variable "tags" {
  description = "Tags to apply to CloudTrail and related resources"
  type        = map(string)
  default     = {}
}

