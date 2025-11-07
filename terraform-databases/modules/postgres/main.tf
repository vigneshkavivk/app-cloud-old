data "aws_caller_identity" "current" {}

resource "aws_iam_role" "postgres_monitoring" {
  name = "${var.environment}-postgres-monitoring-role"

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

resource "aws_iam_role_policy_attachment" "postgres_monitoring" {
  role       = aws_iam_role.postgres_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_iam_policy" "postgres_secrets_manager" {
  name        = "${var.environment}-postgres-secrets-manager"
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
  policy_arn = aws_iam_policy.postgres_secrets_manager.arn
}

# ---------------------------------------------------------------------

resource "aws_db_subnet_group" "rds" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids
  tags = {
    Name        = "${var.environment}-db-subnet-group"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "postgres" {
  name   = "${var.environment}-postgres-params"
  family = "postgres14"

  dynamic "parameter" {
    for_each = var.db_parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = {
    Name        = "${var.environment}-postgres-params"
    Environment = var.environment
  }
}

locals {
  reserved_postgres_usernames = ["admin", "postgres", "rdsadmin", "master", "root", "rdsroot"]
  db_username = contains(local.reserved_postgres_usernames, lower(var.db_username)) ? "${var.db_username}_user" : var.db_username
}

resource "aws_db_instance" "postgres" {
  identifier             = "${var.environment}-db"
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  engine                 = "postgres"
  engine_version         = "14"
  username               = local.db_username
  password               = var.db_password
  db_name                = var.db_name
  db_subnet_group_name   = aws_db_subnet_group.rds.id
  vpc_security_group_ids = var.security_group_ids
  parameter_group_name   = aws_db_parameter_group.postgres.name
 
  storage_encrypted       = true
  performance_insights_enabled = true
  skip_final_snapshot     = var.skip_final_snapshot
  monitoring_interval     = var.monitoring_interval
  monitoring_role_arn     = aws_iam_role.postgres_monitoring.arn
  deletion_protection     = var.deletion_protection
  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention_period
  copy_tags_to_snapshot   = var.copy_tags_to_snapshot
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  iam_database_authentication_enabled = var.iam_auth_enabled
  ca_cert_identifier      = var.ca_cert_identifier
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  tags = {
    Name        = "${var.environment}-postgres-db"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [password]
  }
}
