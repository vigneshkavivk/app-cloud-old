resource "aws_iam_role" "influxdb_role" {
  name = "${var.environment}-influxdb-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_instance_profile" "influxdb_profile" {
  name = "${var.environment}-influxdb-profile"
  role = aws_iam_role.influxdb_role.name
}

resource "aws_instance" "influxdb" {
  ami           = "ami-0c02fb55956c7d316"  # Amazon Linux 2 (adjust if needed)
  instance_type = "t3.micro"
  monitoring    = true
  ebs_optimized = true

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
    encrypted   = true
  }

  # ✅ Correct: reference the instance profile NAME, not the role ARN
  iam_instance_profile = aws_iam_instance_profile.influxdb_profile.name

  user_data = <<-EOF
    #!/bin/bash
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo usermod -aG docker ec2-user
    sudo docker run -d -p 8086:8086 influxdb:latest
  EOF

  tags = {
    Name = "${var.environment}-influxdb-instance"
  }
}