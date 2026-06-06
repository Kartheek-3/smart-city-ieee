import os
import boto3
import mimetypes

def deploy_to_s3():
    print("🚀 Deploying React App to AWS S3 Static Website Hosting...")
    
    bucket_name = "smartcity-frontend-demo-aws" # Change if needed or ensure uniqueness
    region = "us-east-1"
    
    s3 = boto3.client('s3', region_name=region)
    s3_resource = boto3.resource('s3', region_name=region)
    
    # 1. Create Bucket
    print(f"   → Creating bucket: {bucket_name}")
    try:
        s3.create_bucket(Bucket=bucket_name)
    except s3.exceptions.BucketAlreadyOwnedByYou:
        print("      Bucket already exists and owned by you.")
    except Exception as e:
        print(f"      Bucket creation error or already exists: {e}")
        # Append a random string to ensure uniqueness
        import random
        import string
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        bucket_name = f"smartcity-frontend-demo-{suffix}"
        print(f"   → Retrying with bucket: {bucket_name}")
        s3.create_bucket(Bucket=bucket_name)

    # 2. Disable Public Access Block so we can make the website public
    print("   → Updating Public Access Block...")
    s3.put_public_access_block(
        Bucket=bucket_name,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': False,
            'IgnorePublicAcls': False,
            'BlockPublicPolicy': False,
            'RestrictPublicBuckets': False
        }
    )

    # 3. Apply Bucket Policy for Public Read Access
    print("   → Setting Bucket Policy for public read...")
    bucket_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket_name}/*"
            }
        ]
    }
    import json
    s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(bucket_policy))

    # 4. Enable Static Website Hosting
    print("   → Enabling Static Website Hosting...")
    s3.put_bucket_website(
        Bucket=bucket_name,
        WebsiteConfiguration={
            'ErrorDocument': {'Key': 'index.html'},
            'IndexDocument': {'Suffix': 'index.html'},
        }
    )

    # 5. Upload files from build/ directory
    print("   → Uploading build files to S3...")
    build_dir = 'build'
    if not os.path.exists(build_dir):
        print("❌ Error: build/ directory not found. Please run 'npm run build' first.")
        return

    for root, dirs, files in os.walk(build_dir):
        for file in files:
            local_path = os.path.join(root, file)
            s3_key = os.path.relpath(local_path, build_dir).replace('\\', '/')
            
            content_type, _ = mimetypes.guess_type(local_path)
            if content_type is None:
                content_type = 'application/octet-stream'
                
            s3.upload_file(
                local_path, 
                bucket_name, 
                s3_key,
                ExtraArgs={'ContentType': content_type}
            )
            print(f"      Uploaded: {s3_key}")

    website_url = f"http://{bucket_name}.s3-website-{region}.amazonaws.com"
    print(f"\n✅ Deployment Complete!")
    print(f"🌐 Your Smart City App is LIVE at: {website_url}")

if __name__ == "__main__":
    deploy_to_s3()
