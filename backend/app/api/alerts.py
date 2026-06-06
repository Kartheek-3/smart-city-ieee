from flask import Blueprint, request, jsonify
import boto3
import os
import uuid
from datetime import datetime
from ..middleware.security import require_auth, xss_sanitizer, limiter

alerts_bp = Blueprint('alerts', __name__)

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
TABLE_ALERTS = 'SmartCity-EmergencyAlerts'

@alerts_bp.route('/broadcast', methods=['POST'])
@require_auth
@xss_sanitizer
@limiter.limit("10 per minute")
def broadcast_alert():
    """
    Creates an emergency alert.
    Only officials/admins should use this (can be enforced by role).
    """
    try:
        data = getattr(request, 'sanitized_json', request.get_json())
        title = data.get('title')
        message = data.get('message')
        priority = data.get('priority', 'High')
        department = data.get('department', 'General')
        sender_id = data.get('senderId', 'System')
        
        if not title or not message:
            return jsonify({'error': 'Missing title or message'}), 400
            
        alert_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        item = {
            'alertId': alert_id,
            'timestamp': timestamp,
            'title': title,
            'message': message,
            'priority': priority,
            'department': department,
            'senderId': sender_id,
            'status': 'pending_broadcast' # Lambda will pick this up and change to 'broadcasted'
        }
        
        table = dynamodb.Table(TABLE_ALERTS)
        table.put_item(Item=item)
        
        return jsonify({'success': True, 'alertId': alert_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    """
    Returns recent alerts for the public dashboard.
    """
    try:
        table = dynamodb.Table(TABLE_ALERTS)
        # Scan is okay for small tables; for production, use a GSI
        response = table.scan()
        items = response.get('Items', [])
        # Sort by timestamp descending
        sorted_items = sorted(items, key=lambda x: x.get('timestamp', ''), reverse=True)
        return jsonify(sorted_items[:50]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
