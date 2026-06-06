"""
Lambda Function: trust-updater
Trigger: API Gateway POST /trust/update
Action:  Recalculate and persist trust score for a user
"""
import boto3
import json
from decimal import Decimal
from datetime import datetime, timezone

dynamo = boto3.resource('dynamodb')
users_table = dynamo.Table('SmartCity-Users')
trust_table = dynamo.Table('SmartCity-TrustScores')


def compute_trust(valid, confirmations, fake):
    raw = (valid * 5) + (confirmations * 3) - (fake * 10)
    score = max(0, min(100, raw))
    if score <= 20:
        level = 'suspicious'
    elif score <= 50:
        level = 'normal'
    elif score <= 80:
        level = 'trusted'
    else:
        level = 'expert'
    return score, level


def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId')
        delta   = body.get('delta', {})
        reason  = body.get('reason', 'manual update')

        if not user_id:
            return {'statusCode': 400, 'body': json.dumps({'error': 'userId required'})}

        # Get current user data
        response = users_table.get_item(Key={'userId': user_id})
        user = response.get('Item')

        if not user:
            return {'statusCode': 404, 'body': json.dumps({'error': 'User not found'})}

        valid         = int(user.get('validReports', 0)) + int(delta.get('validReports', 0))
        fake          = int(user.get('fakeReports', 0)) + int(delta.get('fakeReports', 0))
        confirmations = int(user.get('communityConfirmations', 0)) + int(delta.get('confirmations', 0))

        score, level = compute_trust(valid, confirmations, fake)
        updated_at   = datetime.now(timezone.utc).isoformat()

        # Update Users table
        users_table.update_item(
            Key={'userId': user_id},
            UpdateExpression='SET trustScore = :s, trustLevel = :l, validReports = :v, fakeReports = :f, communityConfirmations = :c',
            ExpressionAttributeValues={
                ':s': Decimal(score),
                ':l': level,
                ':v': Decimal(valid),
                ':f': Decimal(fake),
                ':c': Decimal(confirmations),
            }
        )

        # Write to TrustScores history
        trust_table.put_item(Item={
            'userId':       user_id,
            'updatedAt':    updated_at,
            'score':        Decimal(score),
            'level':        level,
            'validReports': Decimal(valid),
            'fakeReports':  Decimal(fake),
            'confirmations':Decimal(confirmations),
            'changeReason': reason,
        })

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'userId': user_id, 'score': score, 'level': level}),
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
        }
