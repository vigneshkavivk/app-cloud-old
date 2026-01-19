resource "aws_instance" "this" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = var.subnet_id               # ← Required for custom VPC
  vpc_security_group_ids = [var.security_group_id]     # ← Must be a list

  tags = merge(
    { Name = var.instance_name },
    var.tags
  )
}
