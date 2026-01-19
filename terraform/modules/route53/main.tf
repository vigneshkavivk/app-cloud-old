# Create or import existing Hosted Zone
resource "aws_route53_zone" "zone" {
  name = var.domain_name
}

# Optional Health Check
resource "aws_route53_health_check" "main" {
  count = var.enable_health_check ? 1 : 0

  fqdn                   = var.record_name == "" ? var.domain_name : "${var.record_name}.${var.domain_name}"
  port                   = 443
  type                   = "HTTPS"
  resource_path          = "/health"
  failure_threshold      = "3"
  request_interval       = "30"
  measure_latency        = true
  tags = {
    Name = "health-check-${var.domain_name}"
  }
}

# Determine if target is an ALB (ends with .elb.amazonaws.com)
locals {
  is_alb_target = can(regex(".elb\\.amazonaws\\.com$", var.target))
  full_record_name = var.record_name == "" ? var.domain_name : "${var.record_name}.${var.domain_name}."
  health_check_id = var.enable_health_check ? aws_route53_health_check.main[0].id : null
}

resource "aws_route53_record" "record" {
  zone_id = aws_route53_zone.zone.zone_id
  name    = local.full_record_name
  type    = var.record_type

  # Alias for ALB
  dynamic "alias" {
    for_each = local.is_alb_target && var.record_type == "A" ? [1] : []
    content {
      name                   = "${var.target}."
      zone_id                = "Z35SXDOTRQ7X7K"
      evaluate_target_health = true
    }
  }

  records = local.is_alb_target && var.record_type == "A" ? [] : [var.target]
  ttl     = local.is_alb_target && var.record_type == "A" ? null : 300

  # Set identifier only for advanced routing
  set_identifier = (
    var.routing_policy == "weighted" || var.routing_policy == "latency"
  ) ? "record-${var.record_name != "" ? var.record_name : "root"}" : null

  # ✅ DYNAMIC blocks — no nulls!
  dynamic "weighted_routing_policy" {
    for_each = var.routing_policy == "weighted" ? [1] : []
    content {
      weight = var.weight
    }
  }

  dynamic "latency_routing_policy" {
    for_each = var.routing_policy == "latency" ? [1] : []
    content {
      region = var.region
    }
  }

  health_check_id = local.health_check_id
}