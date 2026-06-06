"""
Lambda Function: waste-trigger
Trigger: DynamoDB Stream on SmartCity-WasteReports
Action:  Publish to SmartCity-WasteAlerts SNS topic
"""
import boto3
import json
import os

sns = boto3.client('sns')

WASTE_TOPIC = os.environ.get('WASTE_ALERTS_TOPIC', '')


def handler(event, context):
    for record in event.get('Records', []):
        if record['eventName'] != 'INSERT':
            continue

        new = record['dynamodb']['NewImage']
        report_id  = new.get('reportId',   {}).get('S', 'unknown')
        waste_type = new.get('wasteType',  {}).get('S', 'garbage')
        severity   = new.get('severity',   {}).get('S', 'medium')
        location   = new.get('location',   {}).get('S', 'Unknown')
        zone       = new.get('zone',       {}).get('S', 'General')

        # Only send SNS for high/critical severity waste
        if severity not in ('high', 'critical'):
            continue

        message = json.dumps({
            'type':      'WASTE',
            'reportId':  report_id,
            'wasteType': waste_type,
            'severity':  severity,
            'location':  location,
            'zone':      zone,
            'source':    'SmartCity-Lambda',
        })

        if WASTE_TOPIC:
            sns.publish(
                TopicArn=WASTE_TOPIC,
                Subject=f"[{severity.upper()}] Waste Report: {waste_type.title()} in Zone {zone}",
                Message=message,
            )

    return {'statusCode': 200, 'body': 'Processed'}
