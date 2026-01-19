# Terraform Settings
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "your-app-terraform-states-981914209208"  # ← your S3 bucket name
    key            = "deployments/${var.deployment_id}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"  # ← your DynamoDB table name
    encrypt        = true
  }
}

# Provider
provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  project_name        = var.project_name
  vpc_cidr           = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# EKS Module
module "eks" {
  source = "./modules/eks"
  
  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  capacity_type   = var.capacity_type
  instance_types  = var.instance_types
  desired_size    = var.desired_size
  min_size        = var.min_size
  max_size        = var.max_size
  
  cluster_ingress_cidrs = var.cluster_ingress_cidrs
  endpoint_private_access = var.endpoint_private_access
  endpoint_public_access  = var.endpoint_public_access
}

# RDS Module
module "rds" {
  source = "./modules/rds"
  
  project_name    = var.project_name
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids = [module.eks.cluster_security_group_id]
  
  db_name      = var.db_name
  db_username  = var.db_username
  db_password  = var.db_password
  instance_class = var.instance_class
  allocated_storage = var.allocated_storage
  
  db_engine         = var.db_engine
  db_engine_version = var.db_engine_version
  db_parameter_family = var.db_parameter_family
  
  multi_az = var.multi_az
  backup_retention_period = var.backup_retention_period
}

# S3 Module
module "s3" {
  source = "./modules/s3"
  
  s3_bucket_name = var.s3_bucket_name
  environment    = var.environment
}


# DynamoDB Module
module "dynamodb" {
  source = "./modules/dynamodb"
  
  dynamodb_table_name = var.dynamodb_table_name
  environment         = var.environment
}

# Lambda Module
module "lambda" {
  source = "./modules/lambda"
  
  lambda_function_name = var.lambda_function_name
  lambda_runtime       = var.lambda_runtime
  lambda_handler       = var.lambda_handler
  environment          = var.environment
}

# EC2 Module (if needed)
module "ec2" {
  source            = "./modules/ec2"
  instance_name     = var.instance_name
  ami_id            = var.ami_id
  instance_type     = var.instance_type
  key_name          = var.key_name           # ← Must match existing key in AWS
  subnet_id         = var.subnet_id
  security_group_id = var.security_group_id
  tags = {
    Project = "TerraformDemo"
    Owner   = "Vignesh"
  }
}

# ALB – HTTPS Enabled
module "lb" {
  source          = "./modules/loadbalancer"
  name            = "myapp-alb"
  lb_type         = "alb"
  vpc_id          = module.vpc.vpc_id
  subnets         = module.vpc.public_subnets
  security_groups = [module.ec2.security_group_id]
  enable_https    = true
  certificate_arn = "arn:aws:acm:us-east-1:xxxx"
}

# NLB – TCP
module "lb" {
  source  = "./modules/loadbalancer"
  name    = "mynlb"
  lb_type = "nlb"
  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.public_subnets
}

# Gateway Load Balancer
module "lb" {
  source  = "./modules/loadbalancer"
  name    = "mygwlb"
  lb_type = "gwlb"
  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.private_subnets
}
module "ecr" {
  source              = "./modules/ecr"
  repository_name     = "Trail HH"  # ✅ Correct name (must match variables.tf)
  image_tag_mutability = "IMMUTABLE"
  scan_on_push        = true
  tags = {
    Environment = "production"
  }
}
#CloudTrail
module "cloudtrail" {
  source = "./cloudtrail"

  aws_account_id = "123456789012"
  region         = "us-east-1"

  trail_name     = "prod-cloudtrail"
  enable_data_events = false
  tags = {
    Environment = "prod"
    Terraform   = "true"
  }
}

module "cloudwatch" {
  source = "./modules/cloudwatch"

  application_name     = "cloudmasa-app"
  log_group_name       = "/aws/lambda/cloudmasa-function"
  log_retention_days   = 30
  alert_email          = "alerts@cloudmasa.example.com"
  ecs_cluster_name     = "cloudmasa-ecs-cluster"  # optional
  alb_name             = "app/cloudmasa-alb/12345" # optional
  kms_key_id           = ""                       # optional

  common_tags = {
    Environment = "production"
    Owner       = "CloudMaSa"
    ManagedBy   = "terraform"
  }
}



