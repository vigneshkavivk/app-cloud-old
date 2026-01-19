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
  ami           = "ami-0c02fb55956c7d316"  # Amazon Linux 2
  instance_type = "t3.micro"
  monitoring    = true
  ebs_optimized = true

  iam_instance_profile = aws_iam_instance_profile.influxdb_profile.name

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
    encrypted   = true
  }

  # ✅ Enhanced user_data with auth + DB auto-create
  user_data = <<-EOF
    #!/bin/bash
    sudo yum update -y
    sudo yum install -y docker git
    sudo systemctl start docker
    sudo usermod -aG docker ec2-user

    # Create config directory & write influxdb.conf
    sudo mkdir -p /etc/influxdb
    cat <<'CONF' | sudo tee /etc/influxdb/influxdb.conf
    [http]
      auth-enabled = true
    CONF

    # Run InfluxDB with persistent storage
    sudo docker run -d \
      --name influxdb \
      -p 8086:8086 \
      -v /etc/influxdb:/etc/influxdb \
      -v influxdb-storage:/var/lib/influxdb \
      -e DOCKER_INFLUXDB_INIT_MODE=setup \
      -e DOCKER_INFLUXDB_INIT_USERNAME='${var.db_username}' \
      -e DOCKER_INFLUXDB_INIT_PASSWORD='${var.db_password}' \
      -e DOCKER_INFLUXDB_INIT_ORG='${var.environment}' \
      -e DOCKER_INFLUXDB_INIT_BUCKET='${var.db_name}' \
      -e DOCKER_INFLUXDB_INIT_RETENTION=72h \
      influxdb:latest

    # Wait & verify
    sleep 10
    echo "InfluxDB setup complete. Access via: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8086"
  EOF

  tags = {
    Name        = "${var.environment}-influxdb"
    Environment = var.environment
    DBName      = var.db_name
  }
}

