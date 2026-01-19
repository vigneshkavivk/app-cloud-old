# Use your actual VPC ID and subnet IDs
cluster_name = "production-eks-cluster"
vpc_id       = "vpc-0c993fccc65662f49"

# Use 2-3 subnets from your list (preferably different AZs)
subnet_ids   = [
  "subnet-0c63f70761292dece",  # us-east-1a
  "subnet-0d4a189e882478582",  # us-east-1c  
  "subnet-0df0dfdb559a1ac3a"   # us-east-1b
]

# Other configurations
cluster_version = "1.29"
desired_size    = 2
min_size        = 1
max_size        = 3
instance_types  = ["t3.micro,t2.micro"]
capacity_type   = "ON_DEMAND"
cluster_ingress_cidrs = ["172.31.0.0/16"]  # Your VPC CIDR range
endpoint_private_access = false
endpoint_public_access  = true
