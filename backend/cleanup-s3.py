import boto3

def empty_and_delete_bucket(bucket_name):
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket_name)
    
    print(f"\nCleaning up bucket: {bucket_name}")
    try:
        # Check if bucket exists
        s3.meta.client.head_bucket(Bucket=bucket_name)
        
        # Empty all objects
        print("  Emptying objects...")
        bucket.objects.all().delete()
        
        # Empty all object versions (if versioning was enabled)
        print("  Emptying object versions...")
        bucket.object_versions.all().delete()
        
        # Delete the bucket itself
        print("  Deleting bucket...")
        bucket.delete()
        print(f"  [SUCCESS] {bucket_name} deleted!")
        
    except Exception as e:
        print(f"  [SKIPPED] {bucket_name}: {e}")

if __name__ == '__main__':
    buckets_to_delete = [
        "smartcity-media-896080425592",
        "smartcity-storage-896080425592-us-east-1"
    ]
    
    for b in buckets_to_delete:
        empty_and_delete_bucket(b)
