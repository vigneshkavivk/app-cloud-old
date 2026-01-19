output "lb_dns_name" {
  value = aws_lb.lb.dns_name
}

output "lb_arn" {
  value = aws_lb.lb.arn
}

output "target_group_arn" {
  value = local.is_gwlb ? null : aws_lb_target_group.tg[0].arn
}
