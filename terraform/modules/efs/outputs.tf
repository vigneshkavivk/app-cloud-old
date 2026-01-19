output "file_system_id" {
  description = "ID of the EFS file system"
  value       = aws_efs_file_system.efs.id
}

output "file_system_arn" {
  description = "ARN of the EFS file system"
  value       = aws_efs_file_system.efs.arn
}

# output "mount_target_ids" {
#   description = "IDs of the EFS mount targets"
#   value       = aws_efs_mount_target.efs_mount_target[*].id
# }

