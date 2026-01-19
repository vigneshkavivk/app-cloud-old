variable "key_alias" {
  type        = string
  description = "Alias name (without alias/ prefix)"
}

variable "description" {
  type        = string
  default     = "KMS key for encryption"
}

variable "enable_key_rotation" {
  type        = bool
  default     = true
}

variable "account_id" {
  type        = string
}