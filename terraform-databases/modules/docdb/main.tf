resource "aws_docdb_subnet_group" "docdb" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name        = "${var.environment}-docdb-subnet-group"
    Environment = var.environment
  }
}

resource "aws_docdb_cluster_parameter_group" "docdb_params" {
  name        = "${var.environment}-docdb-params"
  family      = "docdb5.0"
  description = "Parameter group for ${var.environment}"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = {
    Name        = "${var.environment}-docdb-params"
    Environment = var.environment
  }
}

resource "aws_docdb_cluster" "docdb" {
  cluster_identifier      = "${var.environment}-docdb"
  engine                  = "docdb"
  engine_version          = "5.0.0"
  master_username         = var.db_username
  master_password         = var.db_password
  vpc_security_group_ids  = var.security_group_ids
  db_subnet_group_name    = aws_docdb_subnet_group.docdb.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.docdb_params.name
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.skip_final_snapshot
  storage_encrypted       = true
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports

  tags = {
    Name        = "${var.environment}-docdb-cluster"
    Environment = var.environment
  }
}

resource "aws_docdb_cluster_instance" "docdb_instance" {
  count              = var.instance_count
  identifier         = "${var.environment}-instance-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = var.instance_class
  engine             = "docdb"
  apply_immediately  = true

  tags = {
    Name        = "${var.environment}-docdb-instance-${count.index + 1}"
    Environment = var.environment
  }
}
