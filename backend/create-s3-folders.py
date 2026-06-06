import boto3
import json

def create_folders():
    try:
        with open('s3_config.json', 'r') as f:
            bucket_name = json.load(f).get('BUCKET_NAME')
    except:
        print("Could not load bucket name")
        return

    s3 = boto3.client('s3')
    
    folders = [
        "accidents/",
        "crimes/",
        "waste/",
        "food/",
        "users/",
        "cityplans/"
    ]
    
    print(f"Creating folders in bucket: {bucket_name}")
    for folder in folders:
        s3.put_object(Bucket=bucket_name, Key=folder)
        print(f"  [OK] Created {folder}")

if __name__ == '__main__':
    create_folders()
