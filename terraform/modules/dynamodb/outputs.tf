output "dynamodb_table_name" {
  description = "The name of the DynamoDB table"
  value       = aws_dynamodb_table.file_metadata.name
}

output "dynamodb_table_arn" {
  description = "The ARN of the DynamoDB table"
  value       = aws_dynamodb_table.file_metadata.arn
}

output "kms_key_id" {
  description = "KMS key ID"
  value       = aws_kms_key.dynamodb_key.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = aws_kms_key.dynamodb_key.arn
}
