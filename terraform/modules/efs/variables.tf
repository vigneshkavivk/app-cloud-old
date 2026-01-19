variable "file_system_name" {
  description = "Name of the EFS file system"
  type        = string
}

variable "performance_mode" {
  description = "Performance mode of the file system"
  type        = string
  default     = "generalPurpose"
  validation {
    condition     = contains(["generalPurpose", "maxIO"], var.performance_mode)
    error_message = "Performance mode must be either 'generalPurpose' or 'maxIO'."
  }
}

variable "throughput_mode" {
  description = "Throughput mode of the file system"
  type        = string
  default     = "bursting"
  validation {
    condition     = contains(["provisioned", "bursting"], var.throughput_mode)
    error_message = "Throughput mode must be either 'provisioned' or 'bursting'."
  }
}

variable "encrypted" {
  description = "Whether the file system is encrypted"
  type        = bool
  default     = true
}

variable "provisioned_throughput_in_mibps" {
  description = "Provisioned throughput for the file system (required if throughput_mode is provisioned)"
  type        = number
  default     = null
}

variable "environment" {
  description = "Environment tag"
  type        = string
  default     = "prod"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Add variables for VPC, Subnets, Security Groups if mount targets are needed
# variable "vpc_id" {
#   description = "ID of the VPC to create mount targets in"
#   type        = string
#   default     = null
# }

# variable "subnet_ids" {
#   description = "List of subnet IDs for mount targets"
#   type        = list(string)
#   default     = []
# }

# variable "security_group_ids" {
#   description = "List of security group IDs for mount targets"
#   type        = list(string)
#   default     = []
# }

