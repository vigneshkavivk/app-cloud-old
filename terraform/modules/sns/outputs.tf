output "sns_infrastructure_summary" {
  description = "Summary of deployed SNS infrastructure"
  value = <<EOT
🎯 Production SNS Platform Deployment Complete!

📢 SNS Topics:
%{if can(aws_sns_topic.main_topics["order_events"])}   - Order Events: ${aws_sns_topic.main_topics["order_events"].arn}%{endif}
%{if can(aws_sns_topic.main_topics["payment_events"])}   - Payment Events: ${aws_sns_topic.main_topics["payment_events"].arn}%{endif}
%{if can(aws_sns_topic.main_topics["system_alerts"])}   - System Alerts: ${aws_sns_topic.main_topics["system_alerts"].arn}%{endif}

📩 Subscriptions:
   - Email: venkat.k@cloudmasa.com
   - SMS: +6381851033
   - Slack: Webhook configured
%{if can(aws_sqs_queue.sns_destination_queue.url)}   - SQS: ${aws_sqs_queue.sns_destination_queue.url}%{endif}

⚡ Lambda Consumers:
%{if can(aws_lambda_function.sns_consumers)}   ${join("\n   ", [for lambda in aws_lambda_function.sns_consumers : lambda.function_name])}%{endif}

🔐 IAM Roles:
%{if can(aws_iam_role.sns_publisher_role.arn)}   - Publisher Role: ${aws_iam_role.sns_publisher_role.arn}%{endif}
%{if can(aws_iam_role.sns_consumer_role.arn)}   - Consumer Role: ${aws_iam_role.sns_consumer_role.arn}%{endif}

🚨 Monitoring:
   - CloudWatch Alarms configured for all topics
   - System alerts topic for notifications

🔑 Encryption:
%{if can(aws_kms_key.sns_custom_key.arn)}   - KMS Key: ${aws_kms_key.sns_custom_key.arn}%{endif}

📋 Next Steps:
   1. Confirm email subscription
   2. Test message publishing
   3. Verify Lambda executions
   4. Monitor CloudWatch metrics
EOT
}

output "sns_topic_arns" {
  description = "SNS topic ARNs for integration"
  value = {
    for k, topic in aws_sns_topic.main_topics :
    k => topic.arn
  }
}

output "sns_topic_names" {
  description = "SNS topic names"
  value = {
    for k, topic in aws_sns_topic.main_topics :
    k => topic.name
  }
}

output "lambda_functions" {
  description = "Lambda function details"
  value = {
    for k, lambda in aws_lambda_function.sns_consumers :
    k => {
      function_name = lambda.function_name
      arn           = lambda.arn
    }
  }
}

output "sqs_queue_url" {
  description = "SQS queue URL for SNS destination"
  value       = try(aws_sqs_queue.sns_destination_queue.url, "Not created")
}

output "iam_roles" {
  description = "IAM roles for publishers and consumers"
  value = {
    publisher_role_arn = try(aws_iam_role.sns_publisher_role.arn, "Not created")
    consumer_role_arn  = try(aws_iam_role.sns_consumer_role.arn, "Not created")
  }
}

output "kms_key_arn" {
  description = "KMS key ARN for encryption"
  value       = try(aws_kms_key.sns_custom_key.arn, "Not created")
}

output "integration_examples" {
  description = "Code examples for SNS integration"
  value = <<EOT
Python Publisher Example:

import boto3
import json

sns = boto3.client('sns')
%{if can(aws_sns_topic.main_topics["order_events"])}topic_arn = "${aws_sns_topic.main_topics["order_events"].arn}"%{else}topic_arn = "YOUR_TOPIC_ARN_HERE"%{endif}

response = sns.publish(
    TopicArn=topic_arn,
    Message=json.dumps({
        'event_type': 'order_created',
        'order_id': '12345',
        'customer_id': '67890',
        'amount': 99.99
    }),
    MessageAttributes={
        'priority': {
            'DataType': 'String',
            'StringValue': 'high'
        },
        'event_type': {
            'DataType': 'String',
            'StringValue': 'order_created'
        }
    }
)

AWS CLI Example:

aws sns publish \
%{if can(aws_sns_topic.main_topics["order_events"])}    --topic-arn "${aws_sns_topic.main_topics["order_events"].arn}" \%{else}    --topic-arn "YOUR_TOPIC_ARN_HERE" \%{endif}
    --message '{"event_type":"order_created","order_id":"12345"}' \
    --message-attributes '{"priority":{"DataType":"String","StringValue":"high"}}'
EOT
}