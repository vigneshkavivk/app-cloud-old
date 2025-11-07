data "aws_caller_identity" "current" {}

resource "aws_iam_role" "mysql_monitoring" {
  name = "${var.environment}-sql-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      },
    ]
  })

  tags = {
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.mysql_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_iam_policy" "mysql_secrets_manager" {
  name        = "${var.environment}-mysql-secrets-manager"
  description = "Policy for RDS secrets manager access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.environment}/rds/*"
      },
    ]
  })

  tags = {
    Environment = var.environment
  }
}

resource "aws_iam_role" "db_admin" {
  name = "${var.environment}-db-admin-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithSAML"
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:saml-provider/MySSOProvider"
        }
      },
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "db_admin_secrets" {
  role       = aws_iam_role.db_admin.name
  policy_arn = aws_iam_policy.mysql_secrets_manager.arn
}


# ---------------------------------------------------------------

resource "aws_db_parameter_group" "mysql_params" {
  name        = "${var.environment}-mysql-params"
  family      = "mysql8.0"
  description = "Custom parameter group for MySQL 8.0"

  parameter {
    name  = "max_connections"
    value = "300"
  }

  parameter {
    name  = "slow_query_log"
    value = "1"
  }
}

# ---------------------------------------------------------

resource "aws_db_instance" "mysql" {
  identifier              = "${var.environment}-mysql"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  username                = var.db_username
  password                = var.db_password
  db_name                 = var.db_name
  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.skip_final_snapshot
  monitoring_interval     = var.monitoring_interval
  monitoring_role_arn     = aws_iam_role.mysql_monitoring.arn
  copy_tags_to_snapshot   = var.copy_tags_to_snapshot
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  iam_database_authentication_enabled = var.iam_auth_enabled
  ca_cert_identifier      = var.ca_cert_identifier
  parameter_group_name = aws_db_parameter_group.mysql_params.name
  enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]
  storage_encrypted = true

  tags = {
    Name = "${var.environment}-mysql-db"
  }
}
