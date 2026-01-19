variable "domain_name" {
  type = string
}
variable "record_name" {
  type    = string
  default = ""
}
variable "record_type" {
  type    = string
  default = "A"
}
variable "target" {
  type = string
}
variable "routing_policy" {
  type    = string
  default = "simple"
}
variable "weight" {
  type    = number
  default = 100
}
variable "region" {
  type    = string
  default = "us-east-1"
}
variable "enable_health_check" {
  type    = bool
  default = false
}
variable "health_check_url" {
  type    = string
  default = ""
}