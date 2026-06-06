import boto3
from botocore.exceptions import ClientError

REGION = "us-east-1"
ACCESS_KEY = "YOUR_AWS_ACCESS_KEY_ID"
SECRET_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"

dynamodb = boto3.client(
    'dynamodb',
    region_name=REGION,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY
)

print("\n[CREATE] CityPlans...")
try:
    response = dynamodb.create_table(
        TableName='CityPlans',
        KeySchema=[
            {
                'AttributeName': 'plan_id',
                'KeyType': 'HASH'
            }
        ],
        AttributeDefinitions=[
            {
                'AttributeName': 'plan_id',
                'AttributeType': 'S'
            }
        ],
        BillingMode='PAY_PER_REQUEST'
    )
    print("  [OK] Success")
except ClientError as e:
    if e.response['Error']['Code'] == 'ResourceInUseException':
        print("  [SKIP] Table already exists - skipping")
    else:
        print(f"  [ERR] ERROR: {e}")
print("Done!")
