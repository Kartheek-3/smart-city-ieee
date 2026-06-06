"""
SmartCity Lambda Deployment Script
Creates IAM role + deploys all 6 Lambda functions to AWS
Run: python deploy-lambda.py
"""
import subprocess
import json
import sys
import os
import zipfile
import time

REGION       = "us-east-1"
ACCESS_KEY   = os.environ.get("AWS_ACCESS_KEY_ID", "YOUR_AWS_ACCESS_KEY_ID")
SECRET_KEY   = os.environ.get("AWS_SECRET_ACCESS_KEY", "YOUR_AWS_SECRET_ACCESS_KEY")
ACCOUNT_ID   = ""  # Will be auto-detected
ROLE_NAME    = "SmartCity-LambdaRole"
ROLE_ARN     = ""  # Will be auto-populated after role creation

LAMBDA_DIR   = os.path.join(os.path.dirname(__file__), "lambda")

env = {**os.environ, "AWS_ACCESS_KEY_ID": ACCESS_KEY, "AWS_SECRET_ACCESS_KEY": SECRET_KEY, "AWS_DEFAULT_REGION": REGION}


def aws(args, parse_json=True):
    cmd = [sys.executable, "-m", "awscli"] + args + ["--region", REGION, "--output", "json"]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if r.returncode != 0:
        err = r.stderr.strip()
        if "already exists" in err or "EntityAlreadyExists" in err:
            print(f"  [SKIP] Already exists")
            return None
        print(f"  [ERR] {err[:300]}")
        return None
    return json.loads(r.stdout) if parse_json and r.stdout.strip() else r.stdout.strip()


def zip_lambda(filename):
    src  = os.path.join(LAMBDA_DIR, filename)
    dest = os.path.join(LAMBDA_DIR, filename.replace(".py", ".zip"))
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(src, filename)
    print(f"  [ZIP] {dest}")
    return dest


# ── Step 1: Get Account ID ─────────────────────────────────────────────────────
print("\n[STEP 1] Detecting AWS Account ID...")
caller = aws(["sts", "get-caller-identity"])
if caller:
    ACCOUNT_ID = caller["Account"]
    print(f"  [OK] Account: {ACCOUNT_ID}")
else:
    print("  [ERR] Could not detect account. Check credentials.")
    sys.exit(1)

ROLE_ARN = f"arn:aws:iam::{ACCOUNT_ID}:role/{ROLE_NAME}"


# ── Step 2: Create IAM Role ────────────────────────────────────────────────────
print("\n[STEP 2] Creating IAM Role for Lambda...")

trust_policy = json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
})

aws(["iam", "create-role",
     "--role-name", ROLE_NAME,
     "--assume-role-policy-document", trust_policy,
     "--description", "SmartCity Lambda execution role"])

# Attach managed policies
policies = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
]
for p in policies:
    aws(["iam", "attach-role-policy", "--role-name", ROLE_NAME, "--policy-arn", p], parse_json=False)
    print(f"  [OK] Attached {p.split('/')[-1]}")

print("  [WAIT] Waiting for role to propagate...")
time.sleep(10)


# ── Step 3: Deploy Lambda Functions ───────────────────────────────────────────
print("\n[STEP 3] Deploying Lambda Functions...")

FUNCTIONS = [
    {
        "name": "smartcity-accident-trigger",
        "file": "accident_trigger.py",
        "handler": "accident_trigger.handler",
        "desc": "Triggered by DynamoDB Stream on AccidentReports -> SNS",
        "env_vars": {
            "ACCIDENT_ALERTS_TOPIC":    f"arn:aws:sns:{REGION}:{ACCOUNT_ID}:SmartCity-AccidentAlerts",
            "EMERGENCY_BROADCAST_TOPIC": f"arn:aws:sns:{REGION}:{ACCOUNT_ID}:SmartCity-EmergencyBroadcast",
        }
    },
    {
        "name": "smartcity-crime-trigger",
        "file": "crime_trigger.py",
        "handler": "crime_trigger.handler",
        "desc": "Triggered by DynamoDB Stream on CrimeReports -> SNS",
        "env_vars": {
            "CRIME_ALERTS_TOPIC": f"arn:aws:sns:{REGION}:{ACCOUNT_ID}:SmartCity-CrimeAlerts",
        }
    },
    {
        "name": "smartcity-waste-trigger",
        "file": "waste_trigger.py",
        "handler": "waste_trigger.handler",
        "desc": "Triggered by DynamoDB Stream on WasteReports -> SNS",
        "env_vars": {
            "WASTE_ALERTS_TOPIC": f"arn:aws:sns:{REGION}:{ACCOUNT_ID}:SmartCity-WasteAlerts",
        }
    },
    {
        "name": "smartcity-food-trigger",
        "file": "food_trigger.py",
        "handler": "food_trigger.handler",
        "desc": "Triggered by DynamoDB Stream on FoodDonations -> SNS",
        "env_vars": {
            "FOOD_DISTRIBUTION_TOPIC": f"arn:aws:sns:{REGION}:{ACCOUNT_ID}:SmartCity-FoodDistribution",
            "FOOD_TABLE": "SmartCity-FoodDonations",
        }
    },
    {
        "name": "smartcity-trust-updater",
        "file": "trust_updater.py",
        "handler": "trust_updater.handler",
        "desc": "API Gateway -> Update user trust score in DynamoDB",
        "env_vars": {}
    },
]

for fn in FUNCTIONS:
    print(f"\n  [DEPLOY] {fn['name']}...")
    zip_path = zip_lambda(fn["file"])

    env_str = ",".join(f"{k}={v}" for k, v in fn.get("env_vars", {}).items())
    env_arg = f"Variables={{{env_str}}}" if env_str else "Variables={}"

    # Try to create; if exists, update the code
    result = aws([
        "lambda", "create-function",
        "--function-name", fn["name"],
        "--runtime", "python3.11",
        "--role", ROLE_ARN,
        "--handler", fn["handler"],
        "--zip-file", f"fileb://{zip_path}",
        "--description", fn["desc"],
        "--timeout", "30",
        "--memory-size", "256",
        "--environment", env_arg,
    ])

    if result is None:
        # Try update if it already exists
        aws([
            "lambda", "update-function-code",
            "--function-name", fn["name"],
            "--zip-file", f"fileb://{zip_path}",
        ])
        print(f"  [UPDATE] {fn['name']} updated")
    else:
        print(f"  [OK] {fn['name']} created")

print("\n[COMPLETE] All Lambda functions deployed!")
print(f"\nRole ARN: {ROLE_ARN}")
print("\n[NEXT] Connect DynamoDB Streams to Lambda triggers via AWS Console:")
print("  1. DynamoDB -> Tables -> SmartCity-AccidentReports -> Exports and streams")
print("  2. Click 'Create trigger' -> Select 'smartcity-accident-trigger'")
print("  3. Repeat for CrimeReports, WasteReports, FoodDonations")
