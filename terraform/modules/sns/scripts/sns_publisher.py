import boto3
import json
import uuid
from datetime import datetime

class SNSPublisher:
    def __init__(self, region_name='ap-south-1'):
        self.sns = boto3.client('sns', region_name=region_name)
    
    def publish_order_event(self, topic_arn, order_data):
        """Publish order event to SNS topic"""
        message = {
            'event_id': str(uuid.uuid4()),
            'event_type': 'order_created',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0',
            'data': order_data
        }
        
        try:
            response = self.sns.publish(
                TopicArn=topic_arn,
                Message=json.dumps(message),
                MessageAttributes={
                    'event_type': {
                        'DataType': 'String',
                        'StringValue': 'order_created'
                    },
                    'priority': {
                        'DataType': 'String',
                        'StringValue': order_data.get('priority', 'medium')
                    },
                    'customer_tier': {
                        'DataType': 'String',
                        'StringValue': order_data.get('customer_tier', 'standard')
                    }
                }
            )
            print(f"Order event published: {response['MessageId']}")
            return response
        except Exception as e:
            print(f"Error publishing order event: {str(e)}")
            raise e
    
    def publish_payment_event(self, topic_arn, payment_data):
        """Publish payment event to FIFO SNS topic"""
        message = {
            'event_id': str(uuid.uuid4()),
            'event_type': 'payment_processed',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0',
            'data': payment_data
        }
        
        try:
            response = self.sns.publish(
                TopicArn=topic_arn,
                Message=json.dumps(message),
                MessageGroupId='payments',
                MessageDeduplicationId=str(uuid.uuid4()),
                MessageAttributes={
                    'event_type': {
                        'DataType': 'String',
                        'StringValue': 'payment_processed'
                    },
                    'amount': {
                        'DataType': 'Number',
                        'StringValue': str(payment_data.get('amount', 0))
                    }
                }
            )
            print(f"Payment event published: {response['MessageId']}")
            return response
        except Exception as e:
            print(f"Error publishing payment event: {str(e)}")
            raise e
    
    def publish_system_alert(self, topic_arn, alert_data):
        """Publish system alert to SNS topic"""
        message = {
            'event_id': str(uuid.uuid4()),
            'event_type': 'system_alert',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0',
            'data': alert_data
        }
        
        try:
            response = self.sns.publish(
                TopicArn=topic_arn,
                Message=json.dumps(message),
                Subject=f"System Alert: {alert_data.get('severity', 'unknown')}",
                MessageAttributes={
                    'event_type': {
                        'DataType': 'String',
                        'StringValue': 'system_alert'
                    },
                    'severity': {
                        'DataType': 'String',
                        'StringValue': alert_data.get('severity', 'info')
                    },
                    'component': {
                        'DataType': 'String',
                        'StringValue': alert_data.get('component', 'unknown')
                    }
                }
            )
            print(f"System alert published: {response['MessageId']}")
            return response
        except Exception as e:
            print(f"Error publishing system alert: {str(e)}")
            raise e

# Usage example
if __name__ == "__main__":
    publisher = SNSPublisher()
    
    # Sample order data
    order_data = {
        'order_id': 'ORD-001',
        'customer_id': 'CUST-123',
        'amount': 199.99,
        'currency': 'USD',
        'items': [
            {'product_id': 'PROD-1', 'quantity': 2, 'price': 99.99}
        ],
        'priority': 'high',
        'customer_tier': 'premium'
    }
    
    # Replace with your actual topic ARN
    topic_arn = "YOUR_TOPIC_ARN"
    publisher.publish_order_event(topic_arn, order_data)