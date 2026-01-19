# /modules/iam/outputs.tf

output "user_arn" {
  value       = var.create_user ? aws_iam_user.user[0].arn : null
  description = "ARN of the created IAM user."
}

output "user_name" {
  value       = var.create_user ? aws_iam_user.user[0].name : null
  description = "Name of the created IAM user."
}

output "access_key_id" {
  value       = var.create_user && var.create_access_key ? aws_iam_access_key.user_key[0].id : null
  description = "Access Key ID for the IAM user."
}

output "secret_access_key" {
  value       = var.create_user && var.create_access_key ? aws_iam_access_key.user_key[0].secret : null
  description = "Secret Access Key for the IAM user. (Store securely!)"
}

output "role_arn" {
  value       = var.create_role ? aws_iam_role.role[0].arn : null
  description = "ARN of the created IAM role."
}

output "role_name" {
  value       = var.create_role ? aws_iam_role.role[0].name : null
  description = "Name of the created IAM role."
}
