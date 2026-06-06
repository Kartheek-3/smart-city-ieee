from flask import Blueprint, request, jsonify
import boto3
import os
import json
from decimal import Decimal
from ..utils.blockchain import generate_hash, add_report_to_blockchain, get_report_from_blockchain

reports_bp = Blueprint('reports', __name__)

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
s3_client = boto3.client('s3', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# Load bucket name
try:
    with open('s3_config.json', 'r') as f:
        BUCKET_NAME = json.load(f).get('BUCKET_NAME')
except:
    BUCKET_NAME = "smartcity-storage" # Fallback

dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

@reports_bp.route('/', methods=['GET', 'POST'])
def handle_reports():
    table_name = request.args.get('type', 'SmartCity-WasteReports')
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
                
            # --- Blockchain Audit Layer ---
            import json as _json
            # We hash the core report content (ignoring existing blockchain markers)
            core_data = {k: v for k, v in data.items() if k not in ['blockchainHash', 'blockchainTxId']}
            report_hash = generate_hash(_json.dumps(core_data, sort_keys=True))
            
            # Submit to Ethereum Smart Contract
            report_id = data.get('reportId', str(data.get('timestamp', '')))
            bc_res = add_report_to_blockchain(report_id, report_hash)
            
            if bc_res.get('status') == 'success':
                data['blockchainHash'] = report_hash
                data['blockchainTxId'] = bc_res.get('tx_hash')
            # ------------------------------
                
            table = dynamodb.Table(table_name)
            table.put_item(Item=data)
            return jsonify({'message': 'Report submitted successfully', 'report': data}), 201
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # GET handling
    table_name = request.args.get('type', 'SmartCity-WasteReports')
    try:
        table = dynamodb.Table(table_name)
        response = table.scan()
        items = response.get('Items', [])
        
        # Inject presigned URLs for items with an image_key
        for item in items:
            if 'image_key' in item and item['image_key']:
                try:
                    url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BUCKET_NAME, 'Key': item['image_key']},
                        ExpiresIn=3600
                    )
                    item['image_url'] = url
                except Exception as e:
                    print(f"Failed to generate presigned URL: {e}")
                    
        return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/<report_id>/verify', methods=['GET'])
def verify_report(report_id):
    """
    IEEE Demo feature: Compares the DynamoDB record against the Ethereum Blockchain
    to prove cryptographic tamper-resistance.
    """
    table_name = request.args.get('type', 'SmartCity-WasteReports')
    timestamp_key = request.args.get('timestamp')
    
    key = {'reportId': report_id}
    if timestamp_key:
        key['timestamp'] = timestamp_key

    try:
        # 1. Fetch from AWS DynamoDB
        table = dynamodb.Table(table_name)
        response = table.get_item(Key=key)
        item = response.get('Item')
        if not item:
            return jsonify({'error': 'Report not found in DynamoDB'}), 404
            
        # 2. Fetch immutable record from Ethereum Smart Contract
        bc_data = get_report_from_blockchain(report_id)
        if bc_data.get('status') != 'success':
            return jsonify({'error': 'Not found on Blockchain', 'details': bc_data}), 404
            
        # 3. Recalculate hash of current DB state
        import json as _json
        core_data = {k: v for k, v in item.items() if k not in ['blockchainHash', 'blockchainTxId', 'image_url']}
        current_hash = generate_hash(_json.dumps(core_data, sort_keys=True))
        
        stored_hash = bc_data.get('reportHash')
        
        # 4. Compare
        if current_hash == stored_hash:
            return jsonify({
                'status': 'Verified',
                'message': 'Integrity Check Passed: The AWS database matches the Ethereum ledger.',
                'hash': stored_hash,
                'blockchainTx': item.get('blockchainTxId')
            }), 200
        else:
            return jsonify({
                'status': 'Tampered',
                'message': 'WARNING: Database tampering detected! AWS record does not match Ethereum.',
                'current_hash': current_hash,
                'stored_hash': stored_hash
            }), 200
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/<report_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_single_report(report_id):
    table_name = request.args.get('type', 'SmartCity-WasteReports')
    # Because DynamoDB key schemas vary (e.g. AccidentReports has timestamp as RANGE key),
    # we might need timestamp for full Key operations. If timestamp isn't provided, 
    # we might just try deleting/updating by reportId if it's the only hash key,
    # but for composite keys we assume timestamp is passed in query args.
    timestamp_key = request.args.get('timestamp')
    
    key = {'reportId': report_id}
    if timestamp_key:
        key['timestamp'] = timestamp_key

    try:
        table = dynamodb.Table(table_name)
        
        if request.method == 'GET':
            response = table.get_item(Key=key)
            item = response.get('Item')
            if not item:
                return jsonify({'error': 'Not found'}), 404
                
            if 'image_key' in item and item['image_key']:
                try:
                    url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': BUCKET_NAME, 'Key': item['image_key']},
                        ExpiresIn=3600
                    )
                    item['image_url'] = url
                except Exception as e:
                    print(f"Failed to generate presigned URL: {e}")
                    
            return jsonify(item), 200

        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
                
            # Usually for PUT we replace the whole item, but let's assume partial updates via set
            # For simplicity, we can do a put_item with merged data if we fetch first, 
            # or just expect the frontend to send the full updated item.
            # Let's expect the full item and do put_item (which overwrites).
            # Ensure the keys are correct in the payload
            data['reportId'] = report_id
            if timestamp_key:
                data['timestamp'] = timestamp_key
                
            table.put_item(Item=data)
            return jsonify({'message': 'Report updated successfully', 'report': data}), 200
            
        elif request.method == 'DELETE':
            table.delete_item(Key=key)
            return jsonify({'message': 'Report deleted successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
