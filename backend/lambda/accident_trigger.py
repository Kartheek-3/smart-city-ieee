"""
Lambda Function: accident-trigger
Trigger: DynamoDB Stream on SmartCity-AccidentReports
Action:  Publish to SmartCity-AccidentAlerts SNS topic
"""
import boto3
import json
import os

sns = boto3.client('sns')

ACCIDENT_TOPIC = os.environ.get('ACCIDENT_ALERTS_TOPIC', '')
EMERGENCY_TOPIC = os.environ.get('EMERGENCY_BROADCAST_TOPIC', '')


def handler(event, context):
    for record in event.get('Records', []):
        if record['eventName'] != 'INSERT':
            continue

        new = record['dynamodb']['NewImage']
        report_id  = new.get('reportId',    {}).get('S', 'unknown')
        severity   = new.get('severity',    {}).get('S', 'medium')
        location   = new.get('location',    {}).get('S', 'Unknown location')
        description = new.get('description', {}).get('S', '')
        reporter_id = new.get('reporterId', {}).get('S', 'anonymous')

        severity_emoji = {
            'critical': '[CRITICAL]',
            'high':     '[HIGH]',
            'medium':   '[MEDIUM]',
            'low':      '[LOW]',
        }.get(severity, '[ALERT]')

        message = json.dumps({
            'type':        'ACCIDENT',
            'reportId':    report_id,
            'severity':    severity,
            'location':    location,
            'description': description,
            'reporterId':  reporter_id,
            'source':      'SmartCity-Lambda',
        })

        subject = f"{severity_emoji} Accident Reported at {location}"

        if ACCIDENT_TOPIC:
            sns.publish(
                TopicArn=ACCIDENT_TOPIC,
                Subject=subject,
                Message=message,
                MessageAttributes={
                    'severity': {
                        'DataType': 'String',
                        'StringValue': severity,
                    }
                }
            )

        # Broadcast critical accidents to all admins
        if severity == 'critical' and EMERGENCY_TOPIC:
            sns.publish(
                TopicArn=EMERGENCY_TOPIC,
                Subject=f"[EMERGENCY] Critical Accident at {location}",
                Message=message,
            )

    return {'statusCode': 200, 'body': 'Processed'}
