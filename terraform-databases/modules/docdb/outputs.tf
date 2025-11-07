# modules/docdb/outputs.tf
output "endpoint" {
  value = aws_docdb_cluster.docdb.endpoint
}