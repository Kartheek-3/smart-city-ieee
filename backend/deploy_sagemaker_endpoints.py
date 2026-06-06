"""
SageMaker Endpoint Deployment — SmartCity Platform
Deploys two endpoints:
  1. traffic-xgboost-endpoint  (traffic_xgboost_model.pkl)
  2. fake-report-endpoint      (fake_report_model.pkl)
Uses boto3 directly for maximum compatibility.
"""

import boto3
import json
import tarfile
import os
import time

REGION = "us-east-1"
BUCKET = "models12312"
PREFIX = "models"

s3 = boto3.client("s3", region_name=REGION)
sm = boto3.client("sagemaker", region_name=REGION)
iam = boto3.client("iam", region_name=REGION)

# The official AWS-managed SKLearn container for us-east-1
SKLEARN_IMAGE = "683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-scikit-learn:1.2-1-cpu-py3"


# ── IAM Role ──────────────────────────────────────────────────────────
def get_or_create_role():
    role_name = "SageMakerExecutionRole"
    try:
        role = iam.get_role(RoleName=role_name)
        print(f"✅ Using existing role: {role['Role']['Arn']}")
        return role["Role"]["Arn"]
    except iam.exceptions.NoSuchEntityException:
        print("Creating SageMaker Execution Role...")
        trust = json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "sagemaker.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        })
        role = iam.create_role(RoleName=role_name, AssumeRolePolicyDocument=trust)
        iam.attach_role_policy(RoleName=role_name,
            PolicyArn="arn:aws:iam::aws:policy/AmazonSageMakerFullAccess")
        iam.attach_role_policy(RoleName=role_name,
            PolicyArn="arn:aws:iam::aws:policy/AmazonS3FullAccess")
        print("⏳ Waiting 15s for IAM propagation...")
        time.sleep(15)
        print(f"✅ Created role: {role['Role']['Arn']}")
        return role["Role"]["Arn"]


# ── Package .pkl + inference.py → model.tar.gz ────────────────────────
def package_and_upload(pkl_name, inference_script, tar_name):
    print(f"\n📦 Packaging {pkl_name}...")

    # Download .pkl from S3 if not available locally
    if not os.path.exists(pkl_name):
        print(f"   ↓ Downloading {pkl_name} from s3://{BUCKET}/{PREFIX}/{pkl_name}")
        s3.download_file(BUCKET, f"{PREFIX}/{pkl_name}", pkl_name)

    # Create a requirements.txt file for SageMaker to install xgboost
    req_file = "requirements.txt"
    with open(req_file, "w") as f:
        f.write("xgboost\n")

    # Create model.tar.gz with the .pkl, inference.py, and requirements.txt inside
    with tarfile.open(tar_name, "w:gz") as tar:
        tar.add(pkl_name)
        tar.add(inference_script, arcname="inference.py")
        tar.add(req_file)
        
    os.remove(req_file)

    # Upload to S3
    s3_key = f"{PREFIX}/{tar_name}"
    s3_uri = f"s3://{BUCKET}/{s3_key}"
    print(f"   ↑ Uploading → {s3_uri}")
    s3.upload_file(tar_name, BUCKET, s3_key)
    os.remove(tar_name)
    print(f"   ✅ Packaged and uploaded successfully")
    return s3_uri


# ── Deploy Endpoint ───────────────────────────────────────────────────
def deploy_endpoint(model_name, endpoint_name, s3_uri, role_arn):
    print(f"\n🚀 Deploying: {endpoint_name}")

    # Clean up any existing resources with these names
    for fn, kwargs in [
        (sm.delete_endpoint, {"EndpointName": endpoint_name}),
        (sm.delete_endpoint_config, {"EndpointConfigName": endpoint_name}),
        (sm.delete_model, {"ModelName": model_name}),
    ]:
        try:
            fn(**kwargs)
            print(f"   🗑️ Removed old: {list(kwargs.values())[0]}")
            time.sleep(3)
        except Exception:
            pass

    # Create Model
    print(f"   → Creating model: {model_name}")
    sm.create_model(
        ModelName=model_name,
        PrimaryContainer={
            "Image": SKLEARN_IMAGE,
            "ModelDataUrl": s3_uri,
            "Environment": {
                "SAGEMAKER_PROGRAM": "inference.py",
                "SAGEMAKER_SUBMIT_DIRECTORY": s3_uri,
            }
        },
        ExecutionRoleArn=role_arn
    )

    # Create Endpoint Config
    print(f"   → Creating endpoint config: {endpoint_name}")
    sm.create_endpoint_config(
        EndpointConfigName=endpoint_name,
        ProductionVariants=[{
            "VariantName": "AllTraffic",
            "ModelName": model_name,
            "InitialInstanceCount": 1,
            "InstanceType": "ml.t2.medium",
        }]
    )

    # Create Endpoint
    print(f"   → Creating endpoint: {endpoint_name}")
    sm.create_endpoint(
        EndpointName=endpoint_name,
        EndpointConfigName=endpoint_name
    )

    # Wait for InService
    print(f"   ⏳ Waiting for InService (5-10 minutes)...")
    while True:
        desc = sm.describe_endpoint(EndpointName=endpoint_name)
        status = desc["EndpointStatus"]
        if status == "InService":
            print(f"   ✅ {endpoint_name} is LIVE!")
            return
        elif status == "Failed":
            print(f"   ❌ FAILED: {desc.get('FailureReason', 'Unknown')}")
            return
        else:
            print(f"      Status: {status}...")
            time.sleep(30)


# ── Test Endpoint ─────────────────────────────────────────────────────
def test_endpoint(endpoint_name, sample):
    print(f"\n🧪 Testing: {endpoint_name}")
    runtime = boto3.client("sagemaker-runtime", region_name=REGION)
    resp = runtime.invoke_endpoint(
        EndpointName=endpoint_name,
        ContentType="application/json",
        Body=json.dumps(sample)
    )
    result = json.loads(resp["Body"].read())
    print(f"   ✅ Result: {result}")
    return result


# ── Main ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  SmartCity — SageMaker Endpoint Deployment")
    print("=" * 60)

    role_arn = get_or_create_role()

    # ── 1. Traffic XGBoost ──
    traffic_uri = package_and_upload(
        "traffic_xgboost_model.pkl",
        "inference_traffic.py",
        "traffic_model.tar.gz"
    )
    deploy_endpoint(
        "traffic-xgboost-model",
        "traffic-xgboost-endpoint",
        traffic_uri,
        role_arn
    )

    # ── 2. Fake Report XGBoost ──
    fake_uri = package_and_upload(
        "fake_report_model.pkl",
        "inference_fake.py",
        "fake_report_model.tar.gz"
    )
    deploy_endpoint(
        "fake-report-model",
        "fake-report-endpoint",
        fake_uri,
        role_arn
    )

    # ── Test Both ──
    print("\n" + "=" * 60)
    print("  Testing Deployed Endpoints")
    print("=" * 60)

    # Traffic: [hour, day, month, year, holiday, weekday, temp, rain, snow, clouds, weather_main, weather_desc]
    test_endpoint("traffic-xgboost-endpoint",
        [[12, 2, 5, 2018, 0, 3, 289.5, 0, 0, 75, 4, 12]])

    # Fake Report: [trust_score, reports_submitted, valid_reports, fake_reports, confirmations, account_age_days]
    test_endpoint("fake-report-endpoint",
        [[85, 10, 8, 1, 5, 120]])

    print("\n🎉 All endpoints deployed and tested!")
