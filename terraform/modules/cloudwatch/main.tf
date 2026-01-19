# Create CloudWatch Log Group
resource "aws_cloudwatch_log_group" "this" {
  name              = var.log_group_name
  retention_in_days = var.log_retention_days == 0 ? null : var.log_retention_days
  kms_key_id        = var.kms_key_id != "" ? var.kms_key_id : null
  tags              = var.common_tags
}

# Create SNS Topic for Alerts
resource "aws_sns_topic" "alert_topic" {
  name  = "${var.application_name}-cloudwatch-alerts"
  tags  = var.common_tags
}

# Subscribe email to SNS (if provided)
resource "aws_sns_topic_subscription" "email_alerts" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alert_topic.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Optional: ECS Cluster Alarms (if ECS cluster name is provided)
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  count = var.ecs_cluster_name != "" ? 1 : 0

  alarm_name          = "${var.application_name}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "ECS cluster CPU utilization > 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alert_topic.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
  }

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  count = var.ecs_cluster_name != "" ? 1 : 0

  alarm_name          = "${var.application_name}-ecs-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "ECS cluster memory utilization > 85% for 10 minutes"
  alarm_actions       = [aws_sns_topic.alert_topic.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
  }

  tags = var.common_tags
}

# Optional: ALB Alarms (if ALB name is provided)
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  count = var.alb_name != "" ? 1 : 0

  alarm_name          = "${var.application_name}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "ALB 5XX errors > 10 in 5 minutes"
  alarm_actions       = [aws_sns_topic.alert_topic.arn]

  dimensions = {
    LoadBalancer = var.alb_name
  }

  tags = var.common_tags
}

