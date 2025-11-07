resource "aws_docdb_subnet_group" "docdb" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = var.private_subnet_ids  # Should include subnets from at least 2 AZs
  
  tags = {
    Name = "${var.environment}-docdb-subnet-group"
  }
}

resource "aws_docdb_cluster_parameter_group" "docdb_params" {
  name        = "${var.environment}-docdb-params"
  family      = "docdb5.0"
  description = "Custom parameters for DocumentDB"

  parameter {
    name  = "tls"
    value = "enabled"
  }
}


resource "aws_docdb_cluster" "docdb" {
  cluster_identifier      = "${var.environment}-mongodb"
  engine                  = "docdb"
  master_username         = var.db_username
  master_password         = var.db_password
  vpc_security_group_ids  = var.security_group_ids
  db_subnet_group_name    = aws_docdb_subnet_group.docdb.name
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.skip_final_snapshot
  storage_encrypted       = true
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.docdb_params.name
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = {
    Name = "${var.environment}-mongodb-cluster"
  }
}

resource "aws_docdb_cluster_instance" "docdb_instance" {
  identifier         = "${var.environment}-mongodb-instance-1"
  cluster_identifier = aws_docdb_cluster.docdb.id
  instance_class     = "db.t3.medium"
  engine             = "docdb"
  apply_immediately  = true

  tags = {
    Name = "${var.environment}-mongodb-instance"
  }
}
# # -----------------------------------------------------------

# resource "aws_docdb_subnet_group" "docdb" {
#   name       = "${var.environment}-db-subnet-group"
#   subnet_ids = var.private_subnet_ids
  
#   tags = {
#     Name = "${var.environment}-docdb-subnet-group"
#   }
# }

# # Simple-ah cluster create pannu - ellam remove pannitu
# resource "aws_docdb_cluster" "docdb" {
#   cluster_identifier      = "${var.environment}-mongodb"
#   engine                  = "docdb"
#   master_username         = var.db_username
#   master_password         = var.db_password
#   vpc_security_group_ids  = var.security_group_ids
#   db_subnet_group_name    = aws_docdb_subnet_group.docdb.name
  
#   # Ippa intha values mattum than vachukunga
#   backup_retention_period = 1
#   skip_final_snapshot     = true
#   storage_encrypted       = false  # Encryption temporarily disable pannu
  
#   # Intha lines remove pannu first
#   # db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.docdb_params.name
#   # enabled_cloudwatch_logs_exports = ["audit", "profiler"]
  
#   depends_on = [aws_docdb_subnet_group.docdb]

#   tags = {
#     Name = "${var.environment}-mongodb-cluster"
#   }
# }