from flask import Blueprint, request, jsonify
import boto3
import os
from datetime import datetime
from ..middleware.security import require_auth, xss_sanitizer
from ..utils.crypto import encrypt_data

users_bp = Blueprint('users', __name__)

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

@users_bp.route('/sync', methods=['POST'])
@require_auth
@xss_sanitizer
def sync_user():
    """
    Syncs a user from Firebase to DynamoDB.
    """
    try:
        data = getattr(request, 'sanitized_json', request.get_json())
        if not data or 'userId' not in data:
            return jsonify({'error': 'Missing userId'}), 400
            
        table = dynamodb.Table('SmartCity-Users')
        user_id = data['userId']
        
        # Check if user already exists
        response = table.get_item(Key={'userId': user_id})
        existing_user = response.get('Item')
        
        if existing_user:
            return jsonify({'message': 'User already exists', 'user': existing_user}), 200
            
        # Create new user
        new_user = {
            'userId': user_id,
            'email': encrypt_data(data.get('email', '')),  # IEEE Security Requirement: Encrypted PII
            'displayName': data.get('name', 'Citizen'),
            'role': data.get('role', 'citizen'),
            'trustScore': data.get('trust_score', 50),
            'trustLevel': 'normal',
            'validReports': 0,
            'fakeReports': 0,
            'communityConfirmations': 0,
            'followers': 0,
            'following': 0,
            'isVerified': False,
            'createdAt': datetime.utcnow().isoformat() + 'Z'
        }
        
        table.put_item(Item=new_user)
        return jsonify({'message': 'User created successfully', 'user': new_user}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500
