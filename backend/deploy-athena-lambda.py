"""
Deploys the DynamoToAthenaSync Lambda function and attaches it to the DynamoDB Stream.
"""
import boto3
import os
import time
import zipfile
import json

REGION = "us-east-1"
LAMBDA_NAME = "DynamoToAthenaSync"
ROLE_NAME = "SmartCity-LambdaRole"

# Local paths
LAMBDA_DIR = os.path.join(os.path.dirname(__file__), 'lambda')
SCRIPT_PATH = os.path.join(LAMBDA_DIR, 'athena-trigger.py')
ZIP_PATH = os.path.join(LAMBDA_DIR, 'athena-trigger.zip')

print("🚀 Starting Automated Lambda Deployment for Athena Analytics...")

# 1. Zip the Lambda function
print(f"📦 Zipping {SCRIPT_PATH}...")
with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(SCRIPT_PATH, 'athena-trigger.py')

# 2. Setup Boto3 Clients
iam = boto3.client('iam', region_name=REGION)
lam = boto3.client('lambda', region_name=REGION)
ddb = boto3.client('dynamodb', region_name=REGION)
ddb_streams = boto3.client('dynamodbstreams', region_name=REGION)

# 3. Get IAM Role ARN
print(f"🔍 Finding IAM Role: {ROLE_NAME}...")
try:
    role_response = iam.get_role(RoleName=ROLE_NAME)
    role_arn = role_response['Role']['Arn']
    print(f"✅ Found Role ARN: {role_arn}")
except Exception as e:
    print(f"❌ Error finding role. Did you run the initial deploy-lambda.py script? Error: {e}")
    exit(1)

# 4. Deploy Lambda
print(f"⚙️ Deploying Lambda Function: {LAMBDA_NAME}...")
with open(ZIP_PATH, 'rb') as f:
    zip_bytes = f.read()

try:
    lam.create_function(
        FunctionName=LAMBDA_NAME,
        Runtime='python3.12',
        Role=role_arn,
        Handler='athena-trigger.lambda_handler',
        Code={'ZipFile': zip_bytes},
        Timeout=30,
        Environment={
            'Variables': {
                'ANALYTICS_BUCKET': 'smart-city-analytics-1'
            }
        }
    )
    print("✅ Successfully created Lambda function!")
    time.sleep(5) # Wait for function to be active
except lam.exceptions.ResourceConflictException:
    print("⚠️ Function already exists. Updating code instead...")
    lam.update_function_code(
        FunctionName=LAMBDA_NAME,
        ZipFile=zip_bytes
    )
    print("✅ Successfully updated Lambda function code!")

# 5. Connect DynamoDB Streams
print("🔗 Connecting DynamoDB Streams to Lambda...")
# Attach it to all major tables for the IEEE paper demonstration
TABLES = [
    "SmartCity-AccidentReports",
    "SmartCity-CrimeReports",
    "SmartCity-WasteReports",
    "SmartCity-FoodDonations"
]

try:
    for table_name in TABLES:
        print(f"\nProcessing {table_name}...")
        table_desc = ddb.describe_table(TableName=table_name)
        stream_arn = table_desc['Table'].get('LatestStreamArn')
        
        if not stream_arn:
            print(f"❌ DynamoDB Streams is not enabled on {table_name}!")
            print("Please enable it in the AWS Console (New and old images) and run this script again.")
        else:
            print(f"✅ Found Stream ARN for {table_name}: {stream_arn}")
            
            # Check if mapping already exists
            mappings = lam.list_event_source_mappings(FunctionName=LAMBDA_NAME, EventSourceArn=stream_arn)
            if len(mappings.get('EventSourceMappings', [])) == 0:
                print(f"Creating Event Source Mapping for {table_name}...")
                lam.create_event_source_mapping(
                    EventSourceArn=stream_arn,
                    FunctionName=LAMBDA_NAME,
                    Enabled=True,
                    StartingPosition='TRIM_HORIZON'
                )
                print(f"✅ Successfully attached {table_name} Stream to Lambda!")
            else:
                print(f"✅ {table_name} Stream is already attached to this Lambda function.")

except Exception as e:
    print(f"❌ Failed to setup streams: {e}")

print("=" * 60)
print("🎉 AUTOMATED DEPLOYMENT COMPLETE!")
print("Your Lambda function 'DynamoToAthenaSync' is now live in AWS.")
print("To finish, just run the 'CREATE EXTERNAL TABLE' commands in the Athena Query Editor.")
