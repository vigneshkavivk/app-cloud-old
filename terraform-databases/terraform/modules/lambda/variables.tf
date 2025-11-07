variable "lambda_function_name" {
  description = "Lambda function name"
  type        = string
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "python3.9"
}

variable "lambda_handler" {
  description = "Lambda handler"
  type        = string
  default     = "lambda_function.lambda_handler"
}

variable "environment" {
  description = "Environment name"
  type        = string
}
