
output "cluster_id" {
  value = aws_eks_cluster.cluster.id
}

output "cluster_endpoint" {
  value = aws_eks_cluster.cluster.endpoint
}

output "cluster_certificate_authority" {
  value = aws_eks_cluster.cluster.certificate_authority[0].data
}

output "node_role_arn" {
  value = aws_iam_role.nodes.arn
}

output "cluster_sg_id" {
  value = aws_security_group.cluster.id
}


