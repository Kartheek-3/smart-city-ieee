import boto3
import json

def setup_s3():
    session = boto3.Session(region_name='us-east-1')
    sts = session.client('sts')
    s3 = session.client('s3')
    
    account_id = sts.get_caller_identity()["Account"]
    bucket_name = f"smartcity-storage-{account_id}"
    
    print(f"Checking bucket: {bucket_name}")
    
    try:
        s3.head_bucket(Bucket=bucket_name)
        print("Bucket already exists.")
    except BaseException:
        print("Creating bucket...")
        # create_bucket in us-east-1 doesn't require LocationConstraint
        s3.create_bucket(Bucket=bucket_name)
        print("Bucket created successfully!")
        
    print("Enforcing Block Public Access...")
    s3.put_public_access_block(
        Bucket=bucket_name,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': True,
            'IgnorePublicAcls': True,
            'BlockPublicPolicy': True,
            'RestrictPublicBuckets': True
        }
    )
    
    # Configure CORS for local development React frontend
    print("Setting CORS policy...")
    cors_configuration = {
        'CORSRules': [{
            'AllowedHeaders': ['*'],
            'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            'AllowedOrigins': ['*'],
            'ExposeHeaders': ['ETag']
        }]
    }
    s3.put_bucket_cors(Bucket=bucket_name, CORSConfiguration=cors_configuration)
    
    print("Writing bucket name to config file...")
    with open("s3_config.json", "w") as f:
        json.dump({"BUCKET_NAME": bucket_name}, f)
        
    print(f"\n[OK] Setup complete! Bucket name: {bucket_name}")

if __name__ == '__main__':
    setup_s3()
