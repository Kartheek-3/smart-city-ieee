import boto3
import json
import time
import zipfile
import os
from botocore.exceptions import ClientError

REGION = 'us-east-1'
sns = boto3.client('sns', region_name=REGION)
dynamodb = boto3.client('dynamodb', region_name=REGION)
iam = boto3.client('iam', region_name=REGION)
lambda_client = boto3.client('lambda', region_name=REGION)

TOPIC_NAME = 'SmartCity-EmergencyAlerts'
TABLE_NAME = 'SmartCity-EmergencyAlerts'
ROLE_NAME = 'SmartCity-EmergencyAlertLambdaRole'
LAMBDA_NAME = 'SmartCity-EmergencyAlertLambda'

def setup():
    print("--- 🚨 Smart City Emergency Alerts Setup 🚨 ---")
    
    # 1. Create SNS Topic
    print(f"\n[1] Creating SNS Topic: {TOPIC_NAME}")
    topic_response = sns.create_topic(Name=TOPIC_NAME)
    topic_arn = topic_response['TopicArn']
    print(f"  [OK] Topic ARN: {topic_arn}")
    
    # 2. Create DynamoDB Table with Streams
    print(f"\n[2] Creating DynamoDB Table: {TABLE_NAME}")
    stream_arn = None
    try:
        response = dynamodb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[{'AttributeName': 'alertId', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'alertId', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST',
            StreamSpecification={
                'StreamEnabled': True,
                'StreamViewType': 'NEW_IMAGE'
            }
        )
        print("  [WAIT] Waiting for table to be active...")
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(TableName=TABLE_NAME)
        stream_arn = response['TableDescription']['LatestStreamArn']
        print(f"  [OK] Table created. Stream ARN: {stream_arn}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            print("  [SKIP] Table already exists. Checking stream...")
            desc = dynamodb.describe_table(TableName=TABLE_NAME)
            stream_spec = desc['Table'].get('StreamSpecification', {})
            if not stream_spec.get('StreamEnabled'):
                print("  [UPDATE] Enabling Stream on existing table...")
                resp = dynamodb.update_table(
                    TableName=TABLE_NAME,
                    StreamSpecification={'StreamEnabled': True, 'StreamViewType': 'NEW_IMAGE'}
                )
                stream_arn = resp['TableDescription']['LatestStreamArn']
            else:
                stream_arn = desc['Table']['LatestStreamArn']
            print(f"  [OK] Stream ARN: {stream_arn}")
        else:
            raise e

    # 3. Create IAM Role
    print(f"\n[3] Creating IAM Role: {ROLE_NAME}")
    assume_role_policy = {
        "Version": "2012-10-17",
        "Statement": [{"Action": "sts:AssumeRole", "Principal": {"Service": "lambda.amazonaws.com"}, "Effect": "Allow"}]
    }
    role_arn = None
    try:
        role_resp = iam.create_role(
            RoleName=ROLE_NAME,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy)
        )
        role_arn = role_resp['Role']['Arn']
        print(f"  [OK] Created Role: {role_arn}")
        time.sleep(10) # Wait for role to propagate
    except ClientError as e:
        if e.response['Error']['Code'] == 'EntityAlreadyExists':
            print("  [SKIP] Role already exists.")
            role_arn = iam.get_role(RoleName=ROLE_NAME)['Role']['Arn']
        else:
            raise e

    # Attach Policies to Role (AWSLambdaBasicExecutionRole, DynamoDB Streams, SNS Publish)
    print("  [UPDATE] Attaching policies to role...")
    iam.attach_role_policy(RoleName=ROLE_NAME, PolicyArn='arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole')
    
    custom_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {"Effect": "Allow", "Action": ["sns:Publish"], "Resource": topic_arn},
            {"Effect": "Allow", "Action": ["dynamodb:GetRecords", "dynamodb:GetShardIterator", "dynamodb:DescribeStream", "dynamodb:ListStreams"], "Resource": stream_arn}
        ]
    }
    try:
        iam.put_role_policy(
            RoleName=ROLE_NAME,
            PolicyName='SmartCityEmergencyAlertPolicy',
            PolicyDocument=json.dumps(custom_policy)
        )
        print("  [OK] Policies attached.")
        time.sleep(10) # Wait for policy propagation
    except Exception as e:
        print(f"  [ERR] {e}")

    # 4. Zip and Deploy Lambda
    print(f"\n[4] Deploying Lambda Function: {LAMBDA_NAME}")
    zip_path = 'emergency_lambda.zip'
    with zipfile.ZipFile(zip_path, 'w') as z:
        z.write('emergency_lambda.py')
    
    with open(zip_path, 'rb') as f:
        zipped_code = f.read()

    try:
        lambda_client.create_function(
            FunctionName=LAMBDA_NAME,
            Runtime='python3.9',
            Role=role_arn,
            Handler='emergency_lambda.lambda_handler',
            Code={'ZipFile': zipped_code},
            Environment={'Variables': {'SNS_TOPIC_ARN': topic_arn}},
            Timeout=10
        )
        print("  [OK] Lambda function created.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceConflictException':
            print("  [UPDATE] Lambda already exists. Updating code...")
            lambda_client.update_function_code(FunctionName=LAMBDA_NAME, ZipFile=zipped_code)
            lambda_client.update_function_configuration(
                FunctionName=LAMBDA_NAME,
                Environment={'Variables': {'SNS_TOPIC_ARN': topic_arn}}
            )
            print("  [OK] Lambda function updated.")
        else:
            raise e

    # 5. Create Event Source Mapping
    print(f"\n[5] Mapping DynamoDB Stream to Lambda")
    try:
        lambda_client.create_event_source_mapping(
            EventSourceArn=stream_arn,
            FunctionName=LAMBDA_NAME,
            StartingPosition='LATEST',
            BatchSize=5
        )
        print("  [OK] Event source mapping created successfully!")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceConflictException':
            print("  [SKIP] Mapping already exists.")
        else:
            print(f"  [ERR] Mapping failed: {e}")
            
    # Cleanup zip
    if os.path.exists(zip_path):
        os.remove(zip_path)
        
    print("\n✅ Setup Complete! To test, hit POST /api/alerts/broadcast")
    print("If you want to receive texts/emails, go to AWS Console -> SNS -> Subscriptions and add your email/phone to the topic.")

if __name__ == '__main__':
    setup()
