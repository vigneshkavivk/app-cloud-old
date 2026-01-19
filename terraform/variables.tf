# Common Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "myproject"
}

# VPC Variables
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

# EKS Variables
variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "my-eks-cluster"
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "capacity_type" {
  description = "Node group capacity type"
  type        = string
  default     = "ON_DEMAND"
}

variable "instance_types" {
  description = "Node group instance types"
  type        = list(string)
  default     = ["t3.micro"]
}

variable "desired_size" {
  description = "Desired node count"
  type        = number
  default     = 1
}

variable "min_size" {
  description = "Minimum node count"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum node count"
  type        = number
  default     = 2
}

variable "cluster_ingress_cidrs" {
  description = "CIDR blocks for cluster ingress"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "endpoint_private_access" {
  description = "Enable private API server access"
  type        = bool
  default     = true
}

variable "endpoint_public_access" {
  description = "Enable public API server access"
  type        = bool
  default     = true
}

# RDS Variables
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "mydatabase"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_engine" {
  description = "Database engine"
  type        = string
  default     = "postgres"
}

variable "db_engine_version" {
  description = "Database engine version"
  type        = string
  default     = "14.9"
}

variable "db_parameter_family" {
  description = "DB parameter group family"
  type        = string
  default     = "postgres14"
}

variable "multi_az" {
  description = "Enable multi-AZ deployment"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

# S3 Variables
variable "s3_bucket_name" {
  description = "S3 bucket name"
  type        = string
  default     = "my-app-bucket-248908662228"
}

# Lambda Variables
variable "lambda_function_name" {
  description = "Lambda function name"
  type        = string
  default     = "my-lambda-function"
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

# DynamoDB Variables
variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
  default     = "my-dynamodb-table"
}

# EC2 Variables
variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ec2_key_name" {
  description = "EC2 key pair name"
  type        = string
  default     = "my-keypair"
}
