output "postgres_endpoint" {
  value = try(module.postgres[0].endpoint, null)
}

output "mysql_endpoint" {
  value = try(module.mysql[0].endpoint, null)
}

output "mongodb_endpoint" {
  value = try(module.docdb[0].endpoint, null)
}

output "influxdb_instance_id" {
  value = try(module.influxdb[0].instance_id, null)
}
