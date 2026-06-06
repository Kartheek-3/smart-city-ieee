import json
import boto3
import os

sns = boto3.client('sns')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')

def lambda_handler(event, context):
    print(f"Received event: {json.dumps(event)}")
    
    for record in event['Records']:
        if record['eventName'] == 'INSERT':
            new_image = record['dynamodb']['NewImage']
            
            # Extract fields
            alert_id = new_image.get('alertId', {}).get('S', 'Unknown')
            title = new_image.get('title', {}).get('S', 'Emergency Alert')
            message = new_image.get('message', {}).get('S', '')
            priority = new_image.get('priority', {}).get('S', 'High')
            department = new_image.get('department', {}).get('S', 'General')
            
            # Construct SMS/Email Message
            sns_message = f"🚨 SMART CITY ALERT: {title} 🚨\n\nPriority: {priority}\nDepartment: {department}\n\n{message}\n\nPlease stay safe!"
            
            print(f"Publishing to SNS: {SNS_TOPIC_ARN}")
            
            try:
                response = sns.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Message=sns_message,
                    Subject=f"Smart City Alert: {title}"
                )
                print(f"Successfully published to SNS. MessageId: {response['MessageId']}")
            except Exception as e:
                print(f"Error publishing to SNS: {str(e)}")
                raise e
    
    return {
        'statusCode': 200,
        'body': json.dumps('Successfully processed records.')
    }
