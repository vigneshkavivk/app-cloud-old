variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnets" {
  type = list(string)
}

variable "security_groups" {
  type = list(string)
  default = []
}

# alb | nlb | gwlb
variable "lb_type" {
  type = string
}

# Target group port
variable "target_port" {
  type    = number
  default = 80
}

# HTTPS enable
variable "enable_https" {
  type    = bool
  default = false
}

variable "certificate_arn" {
  type    = string
  default = ""
}
