selected_database = "docdb"

environment             = "dev"
instance_class          = "db.t3.micro"
allocated_storage       = "20"
db_name                 = "mydb"
db_username             = "admin"
db_password             = "Password123!"
private_subnet_ids      = ["subnet-006947e9553675648", "subnet-04cfb141a6cb4c3e7"]
security_group_ids      = ["sg-08daffa2ef52226ab"]
aws_region              = "us-east-1"
multi_az                = true
backup_retention_period = 7
skip_final_snapshot     = true
monitoring_interval     = 60
deletion_protection     = true
copy_tags_to_snapshot   = true
auto_minor_version_upgrade = true
iam_auth_enabled        = true
ca_cert_identifier      = "rds-ca-rsa2048-g1"
enabled_cloudwatch_logs_exports = ["postgresql"]
db_parameters = [
  { name = "log_statement", value = "all" },
  { name = "log_min_duration_statement", value = "500" }
]
influxdb_instance_profile = "influxdb-instance-profile"
