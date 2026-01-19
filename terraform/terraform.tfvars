    # Environment
    environment = "dev"
    aws_region  = "us-east-1"
    project_name = "myproject"

    # VPC
    vpc_cidr = "10.0.0.0/16"
    public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
    private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]

    # EKS
    cluster_name = "my-eks-cluster"
    cluster_version = "1.28"
    capacity_type = "ON_DEMAND"
    instance_types = ["t3.micro"]
    desired_size = 1
    min_size = 1
    max_size = 2

    # RDS
    db_name = "mydatabase"
    db_username = "admin"
    db_password = "SecurePassword123!"
    instance_class = "db.t3.micro"
    allocated_storage = 20
    db_engine = "postgres"
    db_engine_version = "14.16"

    # S3
    s3_bucket_name = "my-app-bucket-248908662228-12345"

    # Lambda
    lambda_function_name = "my-lambda-function"
    lambda_runtime = "python3.9"
    lambda_handler = "lambda_function.lambda_handler"

    # DynamoDB
    dynamodb_table_name = "my-dynamodb-table"

    # sns.tfvars

    environment = "dev"
    project_name = "myproject"
    aws_region  = "us-east-1"

    common_tags = {
    Environment = "dev"
    Project     = "myproject"
    Owner       = "saravana"
    }

    sns_topics = {
    "alert-topic" = {
        display_name = "MyProject Alert Notifications"
        tags = {
        Team = "DevOps"
        }
    }
    }

    sns_subscriptions = {
    "alert-email" = {
        topic_name = "alert-topic"
        protocol   = "email"
        endpoint   = "saravana@example.com"  # 🔔 Replace with your real email
    }
    # Uncomment below if you want Lambda subscription too
    # "alert-lambda" = {
    #   topic_name = "alert-topic"
    #   protocol   = "lambda"
    #   endpoint   = "arn:aws:lambda:us-east-1:248908662228:function:my-lambda-function"
    #   raw_message_delivery = true
    # }
    }
