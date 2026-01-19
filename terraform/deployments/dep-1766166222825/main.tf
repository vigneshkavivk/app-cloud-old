terraform {
  backend "s3" {
    bucket         = "cloudmasa-terraform-states-890742610918"
    key            = "vpc/deployments/dep-1766166222825/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
provider "aws" {
  region = "us-east-1"
}
module "vpc" {
  source                 = "../../modules/vpc"
  project_name           = "cloudmasa-tests"
  vpc_cidr               = "10.0.0.0/16"
  public_subnet_cidrs    = ["10.0.1.0/24"]
  private_subnet_cidrs   = ["10.0.2.0/24"]
}
