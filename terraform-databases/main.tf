data "aws_caller_identity" "current" {}
terraform {
  backend "s3" {
    bucket         = "terraform-state-248908662228-eks"
    key            = "rds/terraform.tfstate"
    region         = "us-east-1"
    # dynamodb_table = "terraform-lock"   
  }
}



# Root module that calls the specific database module based on selection

module "postgres" {
  source = "./modules/postgres"
  count  = var.selected_database == "postgres" ? 1 : 0

  environment             = var.environment
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = var.db_password
  private_subnet_ids      = var.private_subnet_ids
  security_group_ids      = var.security_group_ids
  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_period
  skip_final_snapshot     = var.skip_final_snapshot
  monitoring_interval     = var.monitoring_interval
  deletion_protection     = var.deletion_protection
  copy_tags_to_snapshot   = var.copy_tags_to_snapshot
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  iam_auth_enabled        = var.iam_auth_enabled
  ca_cert_identifier      = var.ca_cert_identifier
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports
  db_parameters           = var.db_parameters
  aws_region              = var.aws_region
}

module "mysql" {
  source = "./modules/mysql"
  count  = var.selected_database == "mysql" ? 1 : 0
  environment             = var.environment
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  db_name                 = var.db_name
  db_username             = var.db_username
  db_password             = var.db_password
  private_subnet_ids      = var.private_subnet_ids
  security_group_ids      = var.security_group_ids
  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.skip_final_snapshot
  monitoring_interval     = var.monitoring_interval
  copy_tags_to_snapshot   = var.copy_tags_to_snapshot
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
   iam_auth_enabled        = var.iam_auth_enabled
  ca_cert_identifier      = var.ca_cert_identifier
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports
  aws_region              =  var.aws_region
}

module "docdb" {
  source = "./modules/docdb"
  count  = var.selected_database == "docdb" ? 1 : 0
  environment             = var.environment
  db_username             = var.db_username
  db_password             = var.db_password
  private_subnet_ids      = var.private_subnet_ids
  security_group_ids      = var.security_group_ids
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.skip_final_snapshot
}

module "influxdb" {
  source = "./modules/influxdb"
  count  = var.selected_database == "influxdb" ? 1 : 0
  environment             = var.environment
  influxdb_instance_profile = var.influxdb_instance_profile
}


