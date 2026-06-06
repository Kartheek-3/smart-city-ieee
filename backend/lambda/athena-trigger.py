import json
import boto3
import os
import uuid
from datetime import datetime

# S3 Analytics Bucket Configuration
S3_BUCKET = os.environ.get('ANALYTICS_BUCKET', 'smart-city-analytics-1')
s3_client = boto3.client('s3')

def lambda_handler(event, context):
    print(f"Received {len(event['Records'])} records from DynamoDB Streams")
    
    success_count = 0
    
    for record in event['Records']:
        if record['eventName'] == 'INSERT':
            new_image = record['dynamodb']['NewImage']
            timestamp = datetime.utcnow().isoformat()
            file_id = str(uuid.uuid4())[:8]
            
            s3_key = None
            payload = {}
            
            # Determine table source based on the stream ARN
            table_arn = record.get('eventSourceARN', '')
            
            if 'SmartCity-AccidentReports' in table_arn:
                payload = {
                    "report_id": new_image.get('reportId', {}).get('S', file_id),
                    "location": new_image.get('location', {}).get('S', 'Unknown'),
                    "severity": new_image.get('severity', {}).get('S', 'Medium'),
                    "timestamp": new_image.get('timestamp', {}).get('S', timestamp)
                }
                s3_key = f"accidents/{timestamp}-{file_id}.json"
                
            elif 'SmartCity-CrimeReports' in table_arn:
                payload = {
                    "report_id": new_image.get('reportId', {}).get('S', file_id),
                    "crime_type": new_image.get('type', {}).get('S', 'General'),
                    "location": new_image.get('location', {}).get('S', 'Unknown'),
                    "timestamp": new_image.get('timestamp', {}).get('S', timestamp)
                }
                s3_key = f"crimes/{timestamp}-{file_id}.json"
                
            elif 'SmartCity-WasteReports' in table_arn:
                payload = {
                    "report_id": new_image.get('reportId', {}).get('S', file_id),
                    "severity": new_image.get('severity', {}).get('S', 'low'),
                    "location": new_image.get('location', {}).get('S', 'Unknown'),
                    "timestamp": new_image.get('timestamp', {}).get('S', timestamp)
                }
                s3_key = f"waste/{timestamp}-{file_id}.json"
                
            elif 'SmartCity-FoodDonations' in table_arn:
                quantity_obj = new_image.get('quantity', {})
                quantity_val = int(quantity_obj.get('N', quantity_obj.get('S', '0'))) if quantity_obj else 0
                
                payload = {
                    "donation_id": new_image.get('donation_id', {}).get('S', f'FOOD-{file_id}'),
                    "quantity": quantity_val,
                    "location": new_image.get('location', {}).get('S', 'Unknown'),
                    "timestamp": new_image.get('timestamp', {}).get('S', timestamp)
                }
                s3_key = f"food/{timestamp}-{file_id}.json"

            # Upload to S3 if payload is mapped
            if s3_key and payload:
                try:
                    s3_client.put_object(
                        Bucket=S3_BUCKET,
                        Key=s3_key,
                        Body=json.dumps(payload),
                        ContentType='application/json'
                    )
                    success_count += 1
                except Exception as e:
                    print(f"Failed to upload {s3_key} to S3: {e}")

    print(f"Successfully processed and uploaded {success_count} records to Athena Analytics S3 bucket.")
    return {"statusCode": 200, "body": json.dumps(f"Processed {success_count} records.")}
