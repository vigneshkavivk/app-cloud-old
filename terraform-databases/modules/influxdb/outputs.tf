output "instance_id" {
  value = aws_instance.influxdb.id
}

output "public_ip" {
  value = aws_instance.influxdb.public_ip
}

output "endpoint" {
  value = "http://${aws_instance.influxdb.public_ip}:8086"
}

