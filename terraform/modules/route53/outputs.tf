output "zone_id" {
  value = aws_route53_zone.zone.zone_id
}

output "record_fqdn" {
  value = aws_route53_record.record.fqdn
}