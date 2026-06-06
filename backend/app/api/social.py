from flask import Blueprint, request, jsonify
import boto3
import os
import uuid
from datetime import datetime
from ..middleware.security import require_auth, xss_sanitizer, limiter

social_bp = Blueprint('social', __name__)

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
TABLE_REQUESTS = 'SmartCity-FollowRequests'
TABLE_USERS = 'SmartCity-Users'

@social_bp.route('/search', methods=['GET'])
@require_auth
@limiter.limit("60 per minute")
def search_users():
    try:
        query = request.args.get('q', '').lower().strip()
        if not query:
            return jsonify([]), 200
            
        table = dynamodb.Table(TABLE_USERS)
        # Scan all users and filter in Python (case-insensitive)
        # DynamoDB contains() is case-sensitive, so we must do this client-side
        response = table.scan()
        all_users = response.get('Items', [])
        
        # Handle pagination if table is large
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            all_users.extend(response.get('Items', []))
        
        # Case-insensitive search across multiple fields
        matched = []
        for u in all_users:
            name = (u.get('displayName') or u.get('name') or '').lower()
            email = (u.get('email') or '').lower()
            role = (u.get('role') or '').lower()
            
            if query in name or query in email or query in role:
                matched.append({
                    **u,
                    'uid': u.get('userId'),
                    'name': u.get('displayName') or u.get('name') or 'Unknown'
                })
        
        return jsonify(matched[:20]), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@social_bp.route('/follow', methods=['POST'])
@require_auth
@xss_sanitizer
@limiter.limit("20 per minute")
def send_follow_request():
    try:
        data = getattr(request, 'sanitized_json', request.get_json())
        from_user_id = data.get('fromUserId')
        to_user_id = data.get('toUserId')
        
        if not from_user_id or not to_user_id:
            return jsonify({'error': 'Missing user IDs'}), 400
            
        users_table = dynamodb.Table(TABLE_USERS)
        
        # Fetch sender
        sender_resp = users_table.get_item(Key={'userId': from_user_id})
        sender = sender_resp.get('Item', {})
        from_name = sender.get('displayName', 'Unknown')
        from_email = sender.get('email', '')
        
        # Fetch target
        target_resp = users_table.get_item(Key={'userId': to_user_id})
        target = target_resp.get('Item', {})
        to_name = target.get('displayName', 'Unknown')
        to_email = target.get('email', '')
        
        request_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat() + 'Z'
        
        req_item = {
            'requestId': request_id,
            'createdAt': created_at,
            'fromUserId': from_user_id,
            'toUserId': to_user_id,
            'fromName': from_name,
            'fromEmail': from_email,
            'toName': to_name,
            'toEmail': to_email,
            'status': 'pending'
        }
        
        req_table = dynamodb.Table(TABLE_REQUESTS)
        req_table.put_item(Item=req_item)
        return jsonify({'requestId': request_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@social_bp.route('/incoming/<user_id>', methods=['GET'])
@require_auth
def get_incoming(user_id):
    try:
        table = dynamodb.Table(TABLE_REQUESTS)
        from boto3.dynamodb.conditions import Key
        response = table.query(
            IndexName='toUserId-index',
            KeyConditionExpression=Key('toUserId').eq(user_id)
        )
        reqs = response.get('Items', [])
        # Map to frontend expected format
        mapped = []
        for r in reqs:
            mapped.append({
                **r,
                'id': r.get('requestId'),
                'fromUid': r.get('fromUserId')
            })
        return jsonify(mapped), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@social_bp.route('/outgoing/<user_id>', methods=['GET'])
@require_auth
def get_outgoing(user_id):
    try:
        table = dynamodb.Table(TABLE_REQUESTS)
        from boto3.dynamodb.conditions import Key
        response = table.query(
            IndexName='fromUserId-index',
            KeyConditionExpression=Key('fromUserId').eq(user_id)
        )
        return jsonify(response.get('Items', [])), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@social_bp.route('/respond', methods=['POST'])
@require_auth
@xss_sanitizer
def respond_request():
    try:
        data = getattr(request, 'sanitized_json', request.get_json())
        request_id = data.get('requestId')
        accepted = data.get('accepted', False)
        from_user_id = data.get('fromUserId')
        to_user_id = data.get('toUserId')
        
        status = 'accepted' if accepted else 'rejected'
        
        table = dynamodb.Table(TABLE_REQUESTS)
        table.update_item(
            Key={'requestId': request_id},
            UpdateExpression="set #s = :s",
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':s': status}
        )
        
        if accepted:
            users_table = dynamodb.Table(TABLE_USERS)
            # Increment followers for target
            users_table.update_item(
                Key={'userId': to_user_id},
                UpdateExpression="ADD followers :one",
                ExpressionAttributeValues={':one': 1}
            )
            # Increment following for sender
            users_table.update_item(
                Key={'userId': from_user_id},
                UpdateExpression="ADD following :one",
                ExpressionAttributeValues={':one': 1}
            )
            
        return jsonify({'success': True, 'status': status}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@social_bp.route('/followers/<user_id>', methods=['GET'])
@require_auth
def get_followers(user_id):
    try:
        table = dynamodb.Table(TABLE_REQUESTS)
        from boto3.dynamodb.conditions import Key
        response = table.query(
            IndexName='toUserId-index',
            KeyConditionExpression=Key('toUserId').eq(user_id)
        )
        accepted = [r for r in response.get('Items', []) if r.get('status') == 'accepted']
        mapped = [{
            'uid': r.get('fromUserId'),
            'name': r.get('fromName', 'Unknown'),
            'email': r.get('fromEmail', ''),
            'followedAt': r.get('createdAt')
        } for r in accepted]
        return jsonify(mapped), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@social_bp.route('/following/<user_id>', methods=['GET'])
@require_auth
def get_following(user_id):
    try:
        table = dynamodb.Table(TABLE_REQUESTS)
        from boto3.dynamodb.conditions import Key
        response = table.query(
            IndexName='fromUserId-index',
            KeyConditionExpression=Key('fromUserId').eq(user_id)
        )
        accepted = [r for r in response.get('Items', []) if r.get('status') == 'accepted']
        mapped = [{
            'uid': r.get('toUserId'),
            'name': r.get('toName', 'Unknown'),
            'email': r.get('toEmail', ''),
            'followedAt': r.get('createdAt')
        } for r in accepted]
        return jsonify(mapped), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
