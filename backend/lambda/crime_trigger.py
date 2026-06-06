"""
Lambda Function: crime-trigger
Trigger: DynamoDB Stream on SmartCity-CrimeReports
Action:  Publish to SmartCity-CrimeAlerts SNS topic
"""
import boto3
import json
import os

sns = boto3.client('sns')
dynamo = boto3.resource('dynamodb')

CRIME_TOPIC = os.environ.get('CRIME_ALERTS_TOPIC', '')


def handler(event, context):
    for record in event.get('Records', []):
        if record['eventName'] != 'INSERT':
            continue

        new = record['dynamodb']['NewImage']
        report_id  = new.get('reportId',  {}).get('S', 'unknown')
        crime_type = new.get('crimeType', {}).get('S', 'crime')
        severity   = new.get('severity',  {}).get('S', 'medium')
        location   = new.get('location',  {}).get('S', 'Unknown')
        description = new.get('description', {}).get('S', '')

        message = json.dumps({
            'type':        'CRIME',
            'reportId':    report_id,
            'crimeType':   crime_type,
            'severity':    severity,
            'location':    location,
            'description': description,
            'source':      'SmartCity-Lambda',
        })

        subject = f"[{severity.upper()}] Crime Report: {crime_type.title()} at {location}"

        if CRIME_TOPIC:
            sns.publish(
                TopicArn=CRIME_TOPIC,
                Subject=subject,
                Message=message,
                MessageAttributes={
                    'crimeType': {'DataType': 'String', 'StringValue': crime_type},
                    'severity':  {'DataType': 'String', 'StringValue': severity},
                }
            )

    return {'statusCode': 200, 'body': 'Processed'}
