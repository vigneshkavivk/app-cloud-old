# Random suffix for unique naming
resource "random_id" "project_suffix" {
  byte_length = 8
}

# KMS Key for SNS Encryption
resource "aws_kms_key" "sns_custom_key" {
  description             = "KMS key for SNS message encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms_policy.json

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-sns-key-${var.environment}"
  })
}

resource "aws_kms_alias" "sns_key_alias" {
  name          = "alias/${var.project_name}-sns-key-${var.environment}"
  target_key_id = aws_kms_key.sns_custom_key.key_id
}

# KMS Policy Document
data "aws_iam_policy_document" "kms_policy" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid    = "Allow SNS to use the key"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }
    actions = [
      "kms:GenerateDataKey",
      "kms:Decrypt"
    ]
    resources = ["*"]
  }
}

# Default SNS topics if none provided
locals {
  default_sns_topics = {
    order_events = {
      display_name = "Order Events"
      fifo_topic   = false
    }
    payment_events = {
      display_name = "Payment Events"
      fifo_topic   = false
    }
    system_alerts = {
      display_name = "System Alerts" 
      fifo_topic   = false
    }
  }
  
  final_sns_topics = length(var.sns_topics) > 0 ? var.sns_topics : local.default_sns_topics
}

# SNS Topics
resource "aws_sns_topic" "main_topics" {
  for_each = local.final_sns_topics

  name = each.value.fifo_topic ? "${var.project_name}-${each.key}-${var.environment}.fifo" : "${var.project_name}-${each.key}-${var.environment}"

  display_name = each.value.display_name

  # FIFO topic configuration
  fifo_topic = each.value.fifo_topic
  content_based_deduplication = lookup(each.value, "content_based_deduplication", false)

  # Encryption
  kms_master_key_id = lookup(each.value, "kms_master_key_id", "alias/aws/sns") == "alias/aws/sns" ? null : aws_kms_key.sns_custom_key.arn

  # Tags
  tags = merge(var.common_tags, {
    TopicType = each.value.fifo_topic ? "FIFO" : "Standard"
  })
}

# SNS Topic Policies
resource "aws_sns_topic_policy" "topic_policies" {
  for_each = aws_sns_topic.main_topics

  arn    = each.value.arn
  policy = data.aws_iam_policy_document.sns_topic_policy[each.key].json
}

data "aws_iam_policy_document" "sns_topic_policy" {
  for_each = local.final_sns_topics

  statement {
    sid    = "AllowCloudWatchEvents"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.main_topics[each.key].arn]
  }

  statement {
    sid    = "AllowS3Events"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.main_topics[each.key].arn]
  }

  statement {
    sid    = "AllowLambdaPublish"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.sns_publisher_role.arn]
    }
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.main_topics[each.key].arn]
  }
}

# SNS Subscriptions - FIXED
resource "aws_sns_topic_subscription" "topic_subscriptions" {
  for_each = var.sns_subscriptions

  topic_arn = contains(["order_events_email", "order_events_sqs"], each.key) ? aws_sns_topic.main_topics["order_events"].arn : (contains(["payment_events_sms"], each.key) ? aws_sns_topic.main_topics["payment_events"].arn : aws_sns_topic.main_topics["system_alerts"].arn)

  protocol  = each.value.protocol
  endpoint  = each.value.endpoint
  raw_message_delivery = lookup(each.value, "raw_message_delivery", false)

  # Filter policy for message filtering
  filter_policy = jsonencode(lookup(each.value, "filter_policy", {}))

  depends_on = [aws_sqs_queue.sns_destination_queue]
}

# SQS Queue for SNS destination
resource "aws_sqs_queue" "sns_destination_queue" {
  name = "${var.project_name}-sns-destination-${var.environment}.fifo"

  fifo_queue                  = true
  content_based_deduplication = true

  message_retention_seconds = 345600  # 4 days
  visibility_timeout_seconds = 300

  kms_master_key_id                 = aws_kms_key.sns_custom_key.arn
  kms_data_key_reuse_period_seconds = 300

  tags = merge(var.common_tags, {
    Purpose = "SNS-Destination"
  })
}

# SQS Policy for SNS
data "aws_iam_policy_document" "sqs_for_sns_policy" {
  statement {
    sid    = "AllowSNSNotifications"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.sns_destination_queue.arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [for topic in aws_sns_topic.main_topics : topic.arn]
    }
  }
}

# IAM Role for SNS Publishers
resource "aws_iam_role" "sns_publisher_role" {
  name = "${var.project_name}-sns-publisher-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# IAM Policy for SNS Publishers - FIXED
resource "aws_iam_policy" "sns_publisher_policy" {
  name        = "${var.project_name}-sns-publisher-policy-${var.environment}"
  description = "Policy for SNS message publishers"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sns:Publish", "sns:GetTopicAttributes"]
        Resource = length(aws_sns_topic.main_topics) > 0 ? [for topic in aws_sns_topic.main_topics : topic.arn] : ["*"]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
        Resource = aws_kms_key.sns_custom_key.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sns_publisher_attachment" {
  role       = aws_iam_role.sns_publisher_role.name
  policy_arn = aws_iam_policy.sns_publisher_policy.arn
}

# IAM Role for SNS Consumers (Lambda)
resource "aws_iam_role" "sns_consumer_role" {
  name = "${var.project_name}-sns-consumer-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# IAM Policy for SNS Consumers - FIXED
resource "aws_iam_policy" "sns_consumer_policy" {
  name        = "${var.project_name}-sns-consumer-policy-${var.environment}"
  description = "Policy for SNS message consumers"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Subscribe", "sns:Receive"]
        Resource = length(aws_sns_topic.main_topics) > 0 ? [for topic in aws_sns_topic.main_topics : topic.arn] : ["*"]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = aws_kms_key.sns_custom_key.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "sns_consumer_attachment" {
  role       = aws_iam_role.sns_consumer_role.name
  policy_arn = aws_iam_policy.sns_consumer_policy.arn
}

# Lambda Functions as SNS Consumers
resource "aws_lambda_function" "sns_consumers" {
  for_each = var.lambda_config

  function_name = "${var.project_name}-${each.key}-${var.environment}"
  role          = aws_iam_role.sns_consumer_role.arn
  runtime       = each.value.runtime
  timeout       = each.value.timeout
  memory_size   = each.value.memory_size
  handler       = each.value.handler

  filename         = data.archive_file.lambda_zip[each.key].output_path
  source_code_hash = data.archive_file.lambda_zip[each.key].output_base64sha256

  environment {
    variables = lookup(each.value, "environment_variables", {})
  }

  tags = var.common_tags
}

# Lambda Permission for SNS
resource "aws_lambda_permission" "sns_lambda_permission" {
  for_each = aws_lambda_function.sns_consumers

  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.main_topics[replace(each.key, "_processor", "_events")].arn
}

# Lambda Zip Files
data "archive_file" "lambda_zip" {
  for_each = var.lambda_config

  type        = "zip"
  output_path = "lambda_${each.key}.zip"

  source {
    content  = <<EOF
import json
import boto3

def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from SNS Lambda!')
    }
EOF
    filename = "${split(".", each.value.handler)[0]}.py"
  }
}

# Data Source: Current AWS Account
data "aws_caller_identity" "current" {}