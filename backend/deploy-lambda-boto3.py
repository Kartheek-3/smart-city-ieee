import boto3
import json
import os
import zipfile
import time

REGION = "us-east-1"
ROLE_NAME = "SmartCity-LambdaRole"

LAMBDA_DIR = os.path.join(os.path.dirname(__file__), "lambda")

def zip_lambda(filename):
    src = os.path.join(LAMBDA_DIR, filename)
    dest = os.path.join(LAMBDA_DIR, filename.replace(".py", ".zip"))
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(src, filename)
    print(f"  [ZIP] {dest}")
    return dest

def main():
    session = boto3.Session(region_name=REGION)
    sts = session.client('sts')
    iam = session.client('iam')
    lam = session.client('lambda')
    dynamodb = session.client('dynamodb')

    # Step 1: Account ID
    print("\n[STEP 1] Detecting AWS Account ID...")
    account_id = sts.get_caller_identity()["Account"]
    print(f"  [OK] Account: {account_id}")

    role_arn = f"arn:aws:iam::{account_id}:role/{ROLE_NAME}"

    # Step 2: Create IAM Role
    print("\n[STEP 2] Creating IAM Role for Lambda...")
    trust_policy = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "lambda.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    })

    try:
        iam.create_role(
            RoleName=ROLE_NAME,
            AssumeRolePolicyDocument=trust_policy,
            Description="SmartCity Lambda execution role"
        )
        print(f"  [OK] Role {ROLE_NAME} created")
    except iam.exceptions.EntityAlreadyExistsException:
        print(f"  [SKIP] Role {ROLE_NAME} already exists")

    policies = [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
        "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
        "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    ]
    for p in policies:
        iam.attach_role_policy(RoleName=ROLE_NAME, PolicyArn=p)
        print(f"  [OK] Attached {p.split('/')[-1]}")

    print("  [WAIT] Waiting for role to propagate...")
    time.sleep(10)

    # Step 3: Deploy Lambda Functions
    print("\n[STEP 3] Deploying Lambda Functions...")
    FUNCTIONS = [
        {
            "name": "smartcity-accident-trigger",
            "file": "accident_trigger.py",
            "handler": "accident_trigger.handler",
            "table": "SmartCity-AccidentReports",
            "env_vars": {
                "ACCIDENT_ALERTS_TOPIC": f"arn:aws:sns:{REGION}:{account_id}:SmartCity-AccidentAlerts",
            }
        },
        {
            "name": "smartcity-crime-trigger",
            "file": "crime_trigger.py",
            "handler": "crime_trigger.handler",
            "table": "SmartCity-CrimeReports",
            "env_vars": {
                "CRIME_ALERTS_TOPIC": f"arn:aws:sns:{REGION}:{account_id}:SmartCity-CrimeAlerts",
            }
        },
        {
            "name": "smartcity-waste-trigger",
            "file": "waste_trigger.py",
            "handler": "waste_trigger.handler",
            "table": "SmartCity-WasteReports",
            "env_vars": {
                "WASTE_ALERTS_TOPIC": f"arn:aws:sns:{REGION}:{account_id}:SmartCity-WasteAlerts",
            }
        },
        {
            "name": "smartcity-food-trigger",
            "file": "food_trigger.py",
            "handler": "food_trigger.handler",
            "table": "SmartCity-FoodDonations",
            "env_vars": {
                "FOOD_DISTRIBUTION_TOPIC": f"arn:aws:sns:{REGION}:{account_id}:SmartCity-FoodDistribution",
                "FOOD_TABLE": "SmartCity-FoodDonations",
            }
        },
    ]

    for fn in FUNCTIONS:
        print(f"\n  [DEPLOY] {fn['name']}...")
        zip_path = zip_lambda(fn["file"])
        with open(zip_path, 'rb') as f:
            zip_content = f.read()

        try:
            lam.create_function(
                FunctionName=fn['name'],
                Runtime='python3.11',
                Role=role_arn,
                Handler=fn['handler'],
                Code={'ZipFile': zip_content},
                Environment={'Variables': fn.get('env_vars', {})},
                Timeout=30,
                MemorySize=256
            )
            print(f"  [OK] {fn['name']} created")
        except lam.exceptions.ResourceConflictException:
            lam.update_function_code(
                FunctionName=fn['name'],
                ZipFile=zip_content
            )
            # Wait for update to complete before updating configuration
            while True:
                response = lam.get_function(FunctionName=fn['name'])
                if response['Configuration']['LastUpdateStatus'] == 'Successful':
                    break
                time.sleep(2)
                
            lam.update_function_configuration(
                FunctionName=fn['name'],
                Environment={'Variables': fn.get('env_vars', {})}
            )
            print(f"  [UPDATE] {fn['name']} updated")

    # Step 4: DynamoDB Streams -> Event Source Mappings
    print("\n[STEP 4] Connecting DynamoDB Streams to Lambda...")
    for fn in FUNCTIONS:
        if 'table' not in fn:
            continue
            
        print(f"  [MAP] Processing {fn['table']} -> {fn['name']}")
        try:
            table_info = dynamodb.describe_table(TableName=fn['table'])
            stream_arn = table_info['Table'].get('LatestStreamArn')
            
            if not stream_arn:
                print(f"  [ERR] No stream enabled for {fn['table']}")
                continue
                
            # Check if mapping exists
            mappings = lam.list_event_source_mappings(
                EventSourceArn=stream_arn,
                FunctionName=fn['name']
            )
            
            if not mappings['EventSourceMappings']:
                lam.create_event_source_mapping(
                    EventSourceArn=stream_arn,
                    FunctionName=fn['name'],
                    Enabled=True,
                    BatchSize=100,
                    StartingPosition='TRIM_HORIZON'
                )
                print(f"  [OK] Created Event Source Mapping")
            else:
                print(f"  [SKIP] Mapping already exists")
                
        except Exception as e:
            print(f"  [ERR] Failed mapping: {str(e)}")

    print("\n[COMPLETE] All Lambda functions deployed and triggers configured!")

if __name__ == '__main__':
    main()
