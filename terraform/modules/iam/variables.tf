# /modules/iam/variables.tf

variable "create_user" {
  description = "Set to true to create an IAM User."
  type        = bool
  default     = false
}

variable "create_role" {
  description = "Set to true to create an IAM Role."
  type        = bool
  default     = false
}

# ===== USER CONFIGURATION =====
variable "user_name" {
  description = "The name of the IAM user to create."
  type        = string
  default     = ""
}

variable "user_path" {
  description = "The path for the IAM user."
  type        = string
  default     = "/"
}

variable "create_access_key" {
  description = "Set to true to create an access key for the IAM user."
  type        = bool
  default     = false
}

# ===== ROLE CONFIGURATION =====
variable "role_name" {
  description = "The name of the IAM role to create."
  type        = string
  default     = ""
}

variable "role_path" {
  description = "The path for the IAM role."
  type        = string
  default     = "/"
}

variable "assume_role_policy" {
  description = "The JSON policy document that grants an entity permission to assume the role."
  type        = string
  default     = ""
}

# ===== POLICY CONFIGURATION =====
variable "policy_document" {
  description = "The JSON policy document to attach to the user or role."
  type        = string
  default     = null
}

# ===== COMMON TAGS =====
variable "common_tags" {
  description = "Common tags to apply to all resources."
  type        = map(string)
  default     = {}
}
