export const modules = [
  {
    id: "vpc",
    name: "VPC",
    price: { vpc: 0.01, endpoints: 0.01, natGateway: 0.045 },
    requirements: ["CIDR Block", "Subnets", "Route Tables", "Internet Gateway"],
    description: "Virtual Private Cloud lets you provision a logically isolated section of AWS.",
    iacResources: ["aws_vpc", "aws_subnet", "aws_route_table", "aws_internet_gateway"],
  },
  {
    id: "s3",
    name: "S3",
    price: { storage: 0.023, requests: 0.0004, transfer: 0.09 },
    requirements: ["Bucket Name", "Policy", "Encryption Settings", "Access Control"],
    description: "Simple Storage Service offers scalable object storage for data backup and archiving.",
    iacResources: ["aws_s3_bucket", "aws_s3_bucket_policy", "aws_s3_bucket_public_access_block"],
  },
  {
    id: "ec2",
    name: "EC2",
    price: { base: 0.1, storage: 0.08, bandwidth: 0.09 },
    requirements: ["VPC", "Security Group", "IAM Role", "Key Pair"],
    description: "Elastic Compute Cloud provides resizable compute capacity in the cloud.",
    iacResources: [
      "aws_instance",
      "aws_security_group",
      "aws_key_pair",
      "aws_iam_role",
      "aws_iam_instance_profile",
      "aws_iam_role_policy_attachment"
    ],
  },
  {
    id: "eks",
    name: "EKS",
    price: { cluster: 0.1, nodes: 0.2, storage: 0.1 },
    requirements: ["VPC", "IAM Role", "Node Group", "Cluster Config"],
    description: "Elastic Kubernetes Service makes it easy to deploy containerized applications.",
    iacResources: ["aws_eks_cluster", "aws_eks_node_group", "aws_iam_role"],
  },
  {
    id: "lambda",
    name: "Lambda",
    price: { requests: 0.0000002, duration: 0.0000166667 },
    requirements: ["IAM Role", "Function Code", "Runtime", "Memory Config"],
    description: "Serverless compute service that runs code without provisioning or managing servers.",
    iacResources: ["aws_lambda_function", "aws_iam_role", "aws_lambda_permission"],
  },
  {
    id: "dynamodb",
    name: "DynamoDB",
    price: { read: 0.25, write: 1.25, storage: 0.25 },
    requirements: ["Table Name", "Primary Key", "Billing Mode", "Attributes"],
    description: "Fully managed NoSQL database service for fast and predictable performance.",
    iacResources: ["aws_dynamodb_table", "aws_dynamodb_global_table"],
  },
  {
    id: "lb",
    name: "Load Balancer",
    price: { alb: 0.022, nlb: 0.0225, gwlb: 0.012 }, // hourly approx
    requirements: ["VPC", "Subnets", "Target Port", "Type (alb/nlb/gwlb)"],
    description: "Deploy ALB, NLB, or Gateway Load Balancer using a universal Terraform module.",
    iacResources: ["aws_lb", "aws_lb_target_group", "aws_lb_listener"]
  },
  {
    id: "kms",
    name: "KMS Key",
    price: { key: 1.0 }, // ~$1/month per key
    requirements: ["Key Alias", "Key Policy", "IAM Permissions"],
    description: "Create AWS KMS key to encrypt S3, EBS, RDS, Secrets Manager, and CloudWatch logs.",
    iacResources: ["aws_kms_key", "aws_kms_alias"]
  },
  {
    id: "route53",
    name: "Route53",
    price: { hostedZone: 0.5, record: 0.0 },
    requirements: ["Domain Name", "Record Type (A/CNAME)", "Target (ALB/DNS)", "Routing Policy"],
    description: "Manage DNS with Route53: Hosted Zones, A/AAAA/CNAME records, and weighted/latency routing.",
    iacResources: ["aws_route53_zone", "aws_route53_record"]
  },
  {
    id: "cloudfront",
    name: "CloudFront",
    price: { dataOut: 0.085, requests: 0.0075 },
    requirements: ["Origin", "Distribution", "Cache Behavior", "SSL Certificate"],
    description: "Content Delivery Network that securely delivers data with low latency and high speed.",
    iacResources: ["aws_cloudfront_distribution", "aws_cloudfront_origin_access_identity"],
  },
  {
    id: "iam",
    name: "IAM",
    price: { free: 0 },
    requirements: ["Users", "Roles", "Policies", "Access Keys"],
    description: "Identity and Access Management controls user access to AWS resources securely.",
    iacResources: ["aws_iam_user", "aws_iam_role", "aws_iam_policy", "aws_iam_access_key"],
  },
  {
    id: "efs",
    name: "EFS",
    price: { storage: 0.30 }, // Price per GB-month of storage, example value
    requirements: ["File System Name", "Performance Mode", "Throughput Mode", "VPC"],
    description: "Elastic File System provides scalable file storage for use with EC2 instances.",
    iacResources: ["aws_efs_file_system", "aws_efs_mount_target"],
  },
  {
    id: "sns",
    name: "SNS",
    price: { publish: 0.5 / 1e6, sms: 0.00645 },
    requirements: ["Topic", "Subscriptions", "Message Format", "Permissions"],
    description: "Simple Notification Service sends messages to multiple subscribers and endpoints.",
    iacResources: ["aws_sns_topic", "aws_sns_topic_subscription"],
  },
  {
    id: "cloudwatch",
    name: "CloudWatch",
    price: { logs: 0.57, metrics: 0.30 }, // Per GB and per metric
    requirements: ["Log Group Name", "Retention Period", "IAM Permissions"],
    description: "Monitor AWS resources and applications in real-time with logs and metrics.",
    iacResources: [
      "aws_cloudwatch_log_group",
      "aws_cloudwatch_metric_alarm",
      "aws_cloudwatch_dashboard",
      "aws_cloudwatch_event_rule"
    ],
  },
  {
    id: "cloudtrail",
    name: "CloudTrail",
    price: { trail: 0, storage: 0.023 }, // CloudTrail itself is free; S3 storage costs apply
    requirements: ["S3 Bucket", "IAM Role", "Region", "Trail Name"],
    description: "Tracks user activity and API usage across your AWS infrastructure for security and compliance.",
    iacResources: [
      "aws_cloudtrail",
      "aws_s3_bucket",
      "aws_s3_bucket_policy",
      "aws_s3_bucket_public_access_block"
    ],
  },
  {
    id: "ecr",
    name: "ECR",
    price: { storage: 0.1 },
    requirements: ["Repository Name", "IAM Role"],
    description: "Elastic Container Registry securely stores and manages Docker container images.",
    iacResources: ["aws_ecr_repository"],
  },
];
