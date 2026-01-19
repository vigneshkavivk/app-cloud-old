locals {
  is_alb  = var.lb_type == "alb"
  is_nlb  = var.lb_type == "nlb"
  is_gwlb = var.lb_type == "gwlb"

  lb_type_mapped = (
    var.lb_type == "gwlb" ? "gateway" :
    var.lb_type == "nlb"  ? "network" :
    "application"
  )
}

resource "aws_lb" "lb" {
  name               = var.name
  load_balancer_type = local.lb_type_mapped
  internal           = false
  subnets            = var.subnets
  security_groups    = local.is_alb ? var.security_groups : null
  tags = {
    Name = var.name
  }
}

# Target Group
resource "aws_lb_target_group" "tg" {
  count = local.is_gwlb ? 0 : 1

  name        = "${var.name}-tg"
  port        = var.target_port
  protocol    = local.is_nlb ? "TCP" : "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"
}

# ALB Listener - HTTP
resource "aws_lb_listener" "alb_http" {
  count = local.is_alb ? 1 : 0

  load_balancer_arn = aws_lb.lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg[0].arn
  }
}

# ALB Listener - HTTPS
resource "aws_lb_listener" "alb_https" {
  count = local.is_alb && var.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.lb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg[0].arn
  }
}

# NLB Listener
resource "aws_lb_listener" "nlb" {
  count = local.is_nlb ? 1 : 0

  load_balancer_arn = aws_lb.lb.arn
  port              = var.target_port
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg[0].arn
  }
}

# Gateway LB (No listeners)
