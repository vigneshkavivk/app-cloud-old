variable "environment" {}
variable "instance_class" {}
variable "allocated_storage" {}
variable "db_name" {}
variable "db_username" {}
variable "db_password" {}
variable "private_subnet_ids" {}
variable "security_group_ids" {}
# variable "monitoring_role_arn" {}
variable "multi_az" {}
variable "backup_retention_period" {}
variable "skip_final_snapshot" {}
variable "monitoring_interval" {}
variable "deletion_protection" {}
variable "copy_tags_to_snapshot" {}
variable "auto_minor_version_upgrade" {}
variable "iam_auth_enabled" {}
variable "ca_cert_identifier" {}
variable "enabled_cloudwatch_logs_exports" {}
variable "aws_region" {}

