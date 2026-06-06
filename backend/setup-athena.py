import boto3
import sys

REGION = "us-east-1"
BUCKET_NAME = "smart-city-analytics-1" # Using a unique suffix just in case

print("🚀 Step 1: Setting up Amazon Athena Analytics Infrastructure\n")

try:
    s3 = boto3.client('s3', region_name=REGION)
    
    # Create the bucket (handle US East 1 properly)
    print(f"Creating S3 Bucket: {BUCKET_NAME}...")
    if REGION == 'us-east-1':
        s3.create_bucket(Bucket=BUCKET_NAME)
    else:
        s3.create_bucket(
            Bucket=BUCKET_NAME,
            CreateBucketConfiguration={'LocationConstraint': REGION}
        )
    print("✅ Bucket created successfully!\n")
    
    # Create necessary folders
    folders = ['accidents/', 'crimes/', 'waste/', 'food/', 'trust/']
    for folder in folders:
        print(f"Creating folder: {folder}")
        s3.put_object(Bucket=BUCKET_NAME, Key=folder)
        
    print("\n✅ Folders created successfully!\n")

except Exception as e:
    # If bucket exists, ignore it and just print the schemas
    if "BucketAlreadyExists" in str(e) or "BucketAlreadyOwnedByYou" in str(e):
        print("✅ Bucket already exists. Moving to Athena schemas...\n")
    else:
        print(f"⚠️ Warning during bucket creation: {e}")
        print("Continuing to Athena schema generation...\n")


print("="*60)
print("🚀 Step 2: Amazon Athena SQL Commands")
print("="*60)
print("1. Go to AWS Console -> Amazon Athena -> Query Editor")
print("2. Run the following command to create your database:\n")
print("CREATE DATABASE IF NOT EXISTS smartcity;")
print("\n3. Make sure 'smartcity' is selected in the Database dropdown on the left.")
print("4. Run the following CREATE EXTERNAL TABLE commands one by one:\n")

schemas = {
    "accidents": """
CREATE EXTERNAL TABLE accidents (
    report_id string,
    location string,
    severity string,
    timestamp string
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://{BUCKET}/accidents/';
""",
    "crimes": """
CREATE EXTERNAL TABLE crimes (
    report_id string,
    crime_type string,
    location string,
    timestamp string
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://{BUCKET}/crimes/';
""",
    "waste_reports": """
CREATE EXTERNAL TABLE waste_reports (
    report_id string,
    severity string,
    location string,
    timestamp string
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://{BUCKET}/waste/';
""",
    "food_donations": """
CREATE EXTERNAL TABLE food_donations (
    donation_id string,
    quantity int,
    location string,
    timestamp string
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://{BUCKET}/food/';
""",
    "trust_scores": """
CREATE EXTERNAL TABLE trust_scores (
    user_id string,
    score int,
    timestamp string
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://{BUCKET}/trust/';
"""
}

for table, sql in schemas.items():
    print(f"-- TABLE: {table} --")
    print(sql.replace("{BUCKET}", BUCKET_NAME).strip() + "\n")

print("="*60)
print("✅ SETUP COMPLETE!")
print("Next Steps:")
print("1. Deploy 'backend/lambda/athena-trigger.py' as a Lambda function.")
print("2. Connect your DynamoDB Streams to the Lambda function.")
print("3. Open Amazon QuickSight and connect it to Amazon Athena (smartcity database).")
