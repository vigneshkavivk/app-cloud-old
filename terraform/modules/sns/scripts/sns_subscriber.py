import boto3
import json
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SNSSubscriber:
    def __init__(self, region_name='ap-south-1'):
        self.sns = boto3.client('sns', region_name=region_name)
        self.sqs = boto3.client('sqs', region_name=region_name)
    
    def process_sns_message(self, message: Dict[str, Any]):
        """Process incoming SNS message"""
        try:
            # Parse SNS message
            sns_message = json.loads(message['Body'])
            sns_notification = json.loads(sns_message['Message'])
            
            event_type = sns_notification.get('event_type')
            event_data = sns_notification.get('data', {})
            
            logger.info(f"Processing {event_type} event: {event_data}")
            
            # Route to appropriate handler
            if event_type == 'order_created':
                self.handle_order_created(event_data)
            elif event_type == 'payment_processed':
                self.handle_payment_processed(event_data)
            elif event_type == 'system_alert':
                self.handle_system_alert(event_data)
            else:
                logger.warning(f"Unknown event type: {event_type}")
                
        except Exception as e:
            logger.error(f"Error processing SNS message: {str(e)}")
            raise e
    
    def handle_order_created(self, order_data: Dict[str, Any]):
        """Handle order created events"""
        logger.info(f"Processing new order: {order_data['order_id']}")
        
        # Add your order processing logic here
        # Example: Update database, send confirmation email, etc.
        
        logger.info(f"Order {order_data['order_id']} processed successfully")
    
    def handle_payment_processed(self, payment_data: Dict[str, Any]):
        """Handle payment processed events"""
        logger.info(f"Processing payment: {payment_data['payment_id']}")
        
        # Add your payment processing logic here
        # Example: Update payment status, trigger fulfillment, etc.
        
        logger.info(f"Payment {payment_data['payment_id']} processed successfully")
    
    def handle_system_alert(self, alert_data: Dict[str, Any]):
        """Handle system alert events"""
        severity = alert_data.get('severity', 'info')
        component = alert_data.get('component', 'unknown')
        message = alert_data.get('message', '')
        
        logger.info(f"System Alert - {severity.upper()} in {component}: {message}")
        
        # Add your alert handling logic here
        # Example: Send to PagerDuty, create incident, etc.
    
    def listen_to_sqs_queue(self, queue_url: str):
        """Listen to SQS queue for SNS messages"""
        logger.info(f"Starting to listen to SQS queue: {queue_url}")
        
        while True:
            try:
                # Receive messages from SQS
                response = self.sqs.receive_message(
                    QueueUrl=queue_url,
                    MaxNumberOfMessages=10,
                    WaitTimeSeconds=20,
                    MessageAttributeNames=['All']
                )
                
                messages = response.get('Messages', [])
                if not messages:
                    continue
                
                logger.info(f"Received {len(messages)} messages")
                
                for message in messages:
                    try:
                        # Process the message
                        self.process_sns_message(message)
                        
                        # Delete the message after processing
                        self.sqs.delete_message(
                            QueueUrl=queue_url,
                            ReceiptHandle=message['ReceiptHandle']
                        )
                        
                        logger.info(f"Message processed and deleted: {message['MessageId']}")
                        
                    except Exception as e:
                        logger.error(f"Error processing message {message['MessageId']}: {str(e)}")
                        # Don't delete message if processing failed
                
            except Exception as e:
                logger.error(f"Error receiving messages: {str(e)}")
                # Continue listening despite errors

# Usage example for Lambda function
def lambda_handler(event, context):
    """AWS Lambda handler for SNS messages"""
    logger.info(f"Received event: {json.dumps(event)}")
    
    subscriber = SNSSubscriber()
    
    # Process each SNS record
    for record in event['Records']:
        if record.get('EventSource') == 'aws:sns':
            try:
                subscriber.process_sns_message(record)
            except Exception as e:
                logger.error(f"Failed to process record: {str(e)}")
                # Consider whether to re-raise the exception
    
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Processing completed'})
    }

# Standalone usage
if __name__ == "__main__":
    subscriber = SNSSubscriber()