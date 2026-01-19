
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "eks_cluster_policy" {
  default     = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  description = "EKS Cluster Policy ARN"
}

variable "eks_service_policy" {
  default     = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  description = "EKS Service Policy ARN"
}

variable "eks_worker_node_policy" {
  default     = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  description = "EKS Worker Node Policy ARN"
}

variable "eks_cni_policy" {
  default     = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  description = "EKS CNI Policy ARN"
}

variable "ecr_readonly_policy" {
  default     = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  description = "ECR ReadOnly Policy ARN"
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "subnet_ids" {
  description = "List of subnet IDs to launch the cluster and worker nodes in"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID where EKS resources will be deployed"
  type        = string
}

variable "cluster_ingress_cidrs" {
  description = "CIDR blocks allowed to access EKS API (port 443)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Change to your VPC CIDR in production
}

variable "endpoint_private_access" {
  description = "Enable private access to Kubernetes API server endpoint"
  type        = bool
  default     = false
}

variable "endpoint_public_access" {
  description = "Enable public access to Kubernetes API server endpoint"
  type        = bool
  default     = true
}

variable "capacity_type" {
  description = "EC2 capacity type for the node group. Valid values: ON_DEMAND or SPOT"
  type        = string
  default     = "SPOT"
}

variable "instance_types" {
  description = "List of EC2 instance types for the node group"
  type        = list(string)
  default     = ["m5.large"]
}

variable "desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 5
}

variable "min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 2
}

variable "max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 5
}

variable "aws_auth_users" {
  description = "Additional IAM users to add to aws-auth configmap"
  type = list(object({
    userarn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}
