resource "aws_efs_file_system" "efs" {
  creation_token = var.file_system_name
  performance_mode = var.performance_mode
  throughput_mode  = var.throughput_mode
  encrypted        = var.encrypted

  # Use conditional assignment instead of dynamic block
  provisioned_throughput_in_mibps = var.throughput_mode == "provisioned" ? var.provisioned_throughput_in_mibps : null

  tags = merge(var.tags, {
    Name        = var.file_system_name
    Environment = var.environment
  })
}

# Mount targets can be added conditionally if VPC details are provided
# resource "aws_efs_mount_target" "efs_mount_target" {
#   for_each = var.subnet_ids != null ? toset(var.subnet_ids) : {}
#   file_system_id  = aws_efs_file_system.efs.id
#   subnet_id       = each.value
#   security_groups = var.security_group_ids
# }
