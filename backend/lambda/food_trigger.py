"""
Lambda Function: food-trigger
Trigger: DynamoDB Stream on SmartCity-FoodDonations
Action:  Publish to SmartCity-FoodDistribution SNS topic + run expiry check
"""
import boto3
import json
import os
from datetime import datetime, timezone

sns    = boto3.client('sns')
dynamo = boto3.resource('dynamodb')

FOOD_TOPIC = os.environ.get('FOOD_DISTRIBUTION_TOPIC', '')
TABLE_NAME = os.environ.get('FOOD_TABLE', 'SmartCity-FoodDonations')


def handler(event, context):
    for record in event.get('Records', []):
        event_name = record['eventName']
        new = record['dynamodb'].get('NewImage', {})

        donation_id = new.get('donationId', {}).get('S', 'unknown')
        food_type   = new.get('foodType',   {}).get('S', 'food')
        quantity    = new.get('quantity',   {}).get('N', '0')
        location    = new.get('location',   {}).get('S', 'Unknown')
        status      = new.get('status',     {}).get('S', 'available')
        expiry_time = new.get('expiryTime', {}).get('S', '')

        # New donation available
        if event_name == 'INSERT' and status == 'available':
            message = json.dumps({
                'type':       'FOOD_AVAILABLE',
                'donationId': donation_id,
                'foodType':   food_type,
                'quantity':   quantity,
                'location':   location,
                'expiryTime': expiry_time,
                'source':     'SmartCity-Lambda',
            })

            if FOOD_TOPIC:
                sns.publish(
                    TopicArn=FOOD_TOPIC,
                    Subject=f"Food Available: {food_type.title()} ({quantity} servings) at {location}",
                    Message=message,
                )

        # Check if item just expired
        if expiry_time:
            try:
                expiry_dt = datetime.fromisoformat(expiry_time.replace('Z', '+00:00'))
                now = datetime.now(timezone.utc)
                if expiry_dt < now and status == 'available':
                    table = dynamo.Table(TABLE_NAME)
                    table.update_item(
                        Key={'donationId': donation_id, 'createdAt': new.get('createdAt', {}).get('S', '')},
                        UpdateExpression='SET #s = :exp',
                        ExpressionAttributeNames={'#s': 'status'},
                        ExpressionAttributeValues={':exp': 'expired'},
                    )
                    if FOOD_TOPIC:
                        sns.publish(
                            TopicArn=FOOD_TOPIC,
                            Subject=f"[EXPIRED] Food Donation Expired at {location}",
                            Message=json.dumps({'type': 'FOOD_EXPIRED', 'donationId': donation_id}),
                        )
            except Exception:
                pass

    return {'statusCode': 200, 'body': 'Processed'}
