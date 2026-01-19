# modules/docdb/outputs.tf

output "cluster_id" {
  description = "The ID of the DocumentDB cluster"
  value       = aws_docdb_cluster.docdb.id
}

output "cluster_identifier" {
  description = "The cluster identifier"
  value       = aws_docdb_cluster.docdb.cluster_identifier
}

output "endpoint" {
  description = "Writer endpoint"
  value       = aws_docdb_cluster.docdb.endpoint
}

output "reader_endpoint" {
  description = "Reader endpoint"
  value       = aws_docdb_cluster.docdb.reader_endpoint
}

output "port" {
  description = "Database port"
  value       = aws_docdb_cluster.docdb.port
}

output "subnet_group_name" {
  value = aws_docdb_subnet_group.docdb.name
}

output "parameter_group_name" {
  value = aws_docdb_cluster_parameter_group.docdb_params.name
}
