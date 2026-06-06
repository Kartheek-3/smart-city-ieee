from flask import Blueprint, request, jsonify
import boto3
import os
import uuid
from datetime import datetime
from ..middleware.security import require_auth, xss_sanitizer, limiter

messages_bp = Blueprint('messages', __name__)

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
TABLE_NAME = 'SmartCity-Messages'

def build_conversation_id(uid1, uid2):
    return '#'.join(sorted([uid1, uid2]))

@messages_bp.route('/send', methods=['POST'])
@require_auth
@xss_sanitizer
@limiter.limit("30 per minute")
def send_message():
    try:
        data = getattr(request, 'sanitized_json', request.get_json())
        sender_id = data.get('senderId')
        receiver_id = data.get('receiverId')
        content = data.get('content')
        media_url = data.get('mediaUrl')
        
        if not sender_id or not receiver_id or not content:
            return jsonify({'error': 'Missing required fields'}), 400
            
        table = dynamodb.Table(TABLE_NAME)
        conversation_id = build_conversation_id(sender_id, receiver_id)
        message_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        message = {
            'conversationId': conversation_id,
            'timestamp': timestamp,
            'messageId': message_id,
            'senderId': sender_id,
            'receiverId': receiver_id,
            'content': content,
            'status': 'sent'
        }
        if media_url:
            message['mediaUrl'] = media_url
            
        table.put_item(Item=message)
        return jsonify(message), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/conversation/<conversation_id>', methods=['GET'])
@require_auth
def get_conversation(conversation_id):
    try:
        table = dynamodb.Table(TABLE_NAME)
        limit = int(request.args.get('limit', 50))
        
        from boto3.dynamodb.conditions import Key
        response = table.query(
            KeyConditionExpression=Key('conversationId').eq(conversation_id),
            Limit=limit,
            ScanIndexForward=True # Chronological order
        )
        return jsonify(response.get('Items', [])), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/user/<user_id>', methods=['GET'])
@require_auth
def get_user_conversations(user_id):
    """
    Returns latest message from all conversations the user is part of.
    """
    try:
        table = dynamodb.Table(TABLE_NAME)
        from boto3.dynamodb.conditions import Key, Attr
        
        # Query sent messages
        sent_response = table.query(
            IndexName='senderId-index',
            KeyConditionExpression=Key('senderId').eq(user_id)
        )
        sent_items = sent_response.get('Items', [])
        
        # Scan received messages
        received_response = table.scan(
            FilterExpression=Attr('receiverId').eq(user_id)
        )
        received_items = received_response.get('Items', [])
        
        all_messages = sent_items + received_items
        
        # Deduplicate
        conversation_map = {}
        for m in all_messages:
            cid = m['conversationId']
            if cid not in conversation_map or m['timestamp'] > conversation_map[cid]['timestamp']:
                conversation_map[cid] = m
                
        sorted_convos = sorted(conversation_map.values(), key=lambda x: x['timestamp'], reverse=True)
        return jsonify(sorted_convos), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/mark-read', methods=['POST'])
@require_auth
def mark_read():
    try:
        data = getattr(request, 'sanitized_json', request.get_json())
        conversation_id = data.get('conversationId')
        timestamps = data.get('timestamps', [])
        
        table = dynamodb.Table(TABLE_NAME)
        for ts in timestamps:
            table.update_item(
                Key={'conversationId': conversation_id, 'timestamp': ts},
                UpdateExpression="set #status = :r",
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':r': 'read'}
            )
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
