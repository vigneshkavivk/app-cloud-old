# sns/variables.tf

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "myproject"
}

variable "sns_topics" {
  description = "Map of SNS topics to create. Key = topic name, Value = config"
  type = map(object({
    display_name = optional(string)
    tags         = optional(map(string))
  }))
  default = {}
}

variable "sns_subscriptions" {
  description = "Map of SNS subscriptions. Key = subscription name, Value = config"
  type = map(object({
    topic_name = string      # must match a key in sns_topics
    protocol   = string      # e.g., email, lambda, sqs, https
    endpoint   = string      # e.g., email address or ARN
    raw_message_delivery = optional(bool)
  }))
  default = {}
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}