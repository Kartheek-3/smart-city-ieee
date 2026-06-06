from flask import Blueprint, request, jsonify
import boto3
import os
import json
import uuid
from werkzeug.utils import secure_filename

storage_bp = Blueprint('storage', __name__)

# Initialize boto3 clients
s3_client = boto3.client('s3', region_name=os.environ.get('AWS_REGION', 'us-east-1'))

# Try to load bucket name from config
try:
    with open('s3_config.json', 'r') as f:
        config = json.load(f)
        BUCKET_NAME = config.get('BUCKET_NAME')
except Exception as e:
    print(f"Warning: Could not load s3_config.json: {e}")
    # Fallback: trying to detect bucket name if script is run with proper AWS credentials
    try:
        sts = boto3.client('sts', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        account_id = sts.get_caller_identity()["Account"]
        BUCKET_NAME = f"smartcity-storage-{account_id}"
    except:
        BUCKET_NAME = "smartcity-storage" # Fallback, likely will fail if not created

@storage_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected for uploading"}), 400
        
    category = request.form.get('category', 'misc') # e.g., 'accidents', 'crimes'
    
    if file:
        filename = secure_filename(file.filename)
        # Create a unique key to prevent overwriting
        unique_id = str(uuid.uuid4())[:8]
        s3_key = f"{category}/{unique_id}_{filename}"
        
        try:
            # Upload to S3
            s3_client.upload_fileobj(
                file,
                BUCKET_NAME,
                s3_key,
                ExtraArgs={
                    "ContentType": file.content_type
                }
            )
            
            return jsonify({
                "status": "success",
                "message": "File uploaded successfully",
                "image_key": s3_key
            }), 201
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@storage_bp.route('/presign', methods=['GET'])
def generate_presigned_url():
    key = request.args.get('key')
    if not key:
        return jsonify({"error": "Missing key parameter"}), 400
        
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': key
            },
            ExpiresIn=3600 # 1 hour
        )
        return jsonify({"url": url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
