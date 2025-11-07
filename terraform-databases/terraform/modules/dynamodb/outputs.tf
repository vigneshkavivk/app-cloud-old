output "dynamodb_table_id" {
  description = "DynamoDB table ID"
  value       = aws_dynamodb_table.main.id
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.main.arn
}
