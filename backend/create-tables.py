import subprocess
import json
import sys

REGION = "us-east-1"
ACCESS_KEY = "YOUR_AWS_ACCESS_KEY_ID"
SECRET_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"

def aws(args):
    cmd = [
        sys.executable, "-m", "awscli"
    ] + args + [
        "--region", REGION,
        "--output", "json"
    ]
    env = {
        "AWS_ACCESS_KEY_ID": ACCESS_KEY,
        "AWS_SECRET_ACCESS_KEY": SECRET_KEY,
        "AWS_DEFAULT_REGION": REGION,
    }
    import os
    full_env = {**os.environ, **env}
    result = subprocess.run(cmd, capture_output=True, text=True, env=full_env)
    if result.returncode != 0:
        err = result.stderr.strip()
        if "ResourceInUseException" in err:
            print(f"  [SKIP] Table already exists - skipping")
        else:
            print(f"  [ERR] ERROR: {err[:200]}")
        return None
    return result.stdout.strip()

def create_table(name, attrs, key_schema, gsi=None, stream=False):
    print(f"\n[CREATE] {name}...")
    args = [
        "dynamodb", "create-table",
        "--table-name", name,
        "--attribute-definitions"
    ] + attrs + [
        "--key-schema"
    ] + key_schema + [
        "--billing-mode", "PAY_PER_REQUEST"
    ]
    if gsi:
        args += ["--global-secondary-indexes", json.dumps(gsi)]
    if stream:
        args += ["--stream-specification", "StreamEnabled=true,StreamViewType=NEW_IMAGE"]
    
    result = aws(args)
    if result:
        print(f"  [OK] {name} created successfully")
    return result

# ── 1. Users ──────────────────────────────────────────────────────────────────
create_table(
    "SmartCity-Users",
    ["AttributeName=userId,AttributeType=S", "AttributeName=email,AttributeType=S", "AttributeName=role,AttributeType=S"],
    ["AttributeName=userId,KeyType=HASH"],
    gsi=[
        {"IndexName": "email-index", "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "role-index", "KeySchema": [{"AttributeName": "role", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}}
    ]
)

# ── 2. Messages ───────────────────────────────────────────────────────────────
create_table(
    "SmartCity-Messages",
    ["AttributeName=conversationId,AttributeType=S", "AttributeName=timestamp,AttributeType=S", "AttributeName=senderId,AttributeType=S"],
    ["AttributeName=conversationId,KeyType=HASH", "AttributeName=timestamp,KeyType=RANGE"],
    gsi=[
        {"IndexName": "senderId-index", "KeySchema": [{"AttributeName": "senderId", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
    ]
)

# ── 3. FollowRequests ─────────────────────────────────────────────────────────
create_table(
    "SmartCity-FollowRequests",
    ["AttributeName=requestId,AttributeType=S", "AttributeName=toUserId,AttributeType=S", "AttributeName=fromUserId,AttributeType=S"],
    ["AttributeName=requestId,KeyType=HASH"],
    gsi=[
        {"IndexName": "toUserId-index", "KeySchema": [{"AttributeName": "toUserId", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "fromUserId-index", "KeySchema": [{"AttributeName": "fromUserId", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}}
    ]
)

# ── 4. AccidentReports ────────────────────────────────────────────────────────
create_table(
    "SmartCity-AccidentReports",
    ["AttributeName=reportId,AttributeType=S", "AttributeName=timestamp,AttributeType=S", "AttributeName=severity,AttributeType=S", "AttributeName=status,AttributeType=S"],
    ["AttributeName=reportId,KeyType=HASH", "AttributeName=timestamp,KeyType=RANGE"],
    gsi=[
        {"IndexName": "severity-index", "KeySchema": [{"AttributeName": "severity", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "status-index", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
    ],
    stream=True
)

# ── 5. CrimeReports ───────────────────────────────────────────────────────────
create_table(
    "SmartCity-CrimeReports",
    ["AttributeName=reportId,AttributeType=S", "AttributeName=timestamp,AttributeType=S", "AttributeName=crimeType,AttributeType=S", "AttributeName=status,AttributeType=S"],
    ["AttributeName=reportId,KeyType=HASH", "AttributeName=timestamp,KeyType=RANGE"],
    gsi=[
        {"IndexName": "crimeType-index", "KeySchema": [{"AttributeName": "crimeType", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "status-index", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
    ],
    stream=True
)

# ── 6. WasteReports ───────────────────────────────────────────────────────────
create_table(
    "SmartCity-WasteReports",
    ["AttributeName=reportId,AttributeType=S", "AttributeName=timestamp,AttributeType=S", "AttributeName=status,AttributeType=S"],
    ["AttributeName=reportId,KeyType=HASH", "AttributeName=timestamp,KeyType=RANGE"],
    gsi=[
        {"IndexName": "status-index", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
    ],
    stream=True
)

# ── 7. FoodDonations ──────────────────────────────────────────────────────────
create_table(
    "SmartCity-FoodDonations",
    ["AttributeName=donationId,AttributeType=S", "AttributeName=createdAt,AttributeType=S", "AttributeName=status,AttributeType=S"],
    ["AttributeName=donationId,KeyType=HASH", "AttributeName=createdAt,KeyType=RANGE"],
    gsi=[
        {"IndexName": "status-index", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "createdAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
    ],
    stream=True
)

# ── 8. TrustScores ────────────────────────────────────────────────────────────
create_table(
    "SmartCity-TrustScores",
    ["AttributeName=userId,AttributeType=S", "AttributeName=updatedAt,AttributeType=S"],
    ["AttributeName=userId,KeyType=HASH", "AttributeName=updatedAt,KeyType=RANGE"]
)

# ── 9. Notifications ──────────────────────────────────────────────────────────
create_table(
    "SmartCity-Notifications",
    ["AttributeName=notificationId,AttributeType=S", "AttributeName=timestamp,AttributeType=S", "AttributeName=userId,AttributeType=S"],
    ["AttributeName=notificationId,KeyType=HASH", "AttributeName=timestamp,KeyType=RANGE"],
    gsi=[
        {"IndexName": "userId-index", "KeySchema": [{"AttributeName": "userId", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
    ]
)

# ── 10. EmergencyDispatch ────────────────────────────────────────────────────
create_table(
    "SmartCity-EmergencyDispatch",
    ["AttributeName=dispatchId,AttributeType=S", "AttributeName=timestamp,AttributeType=S"],
    ["AttributeName=dispatchId,KeyType=HASH", "AttributeName=timestamp,KeyType=RANGE"]
)

# ── 11. PoliceDispatch ───────────────────────────────────────────────────────
create_table(
    "SmartCity-PoliceDispatch",
    ["AttributeName=dispatchId,AttributeType=S", "AttributeName=timestamp,AttributeType=S"],
    ["AttributeName=dispatchId,KeyType=HASH", "AttributeName=timestamp,KeyType=RANGE"]
)

# ── 12. CityPlans ─────────────────────────────────────────────────────────────
create_table(
    "SmartCity-CityPlans",
    ["AttributeName=planId,AttributeType=S", "AttributeName=createdAt,AttributeType=S", "AttributeName=status,AttributeType=S"],
    ["AttributeName=planId,KeyType=HASH", "AttributeName=createdAt,KeyType=RANGE"],
    gsi=[
        {"IndexName": "status-index", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "createdAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
    ],
    stream=True
)

# ── 13. AuditLogs (Blockchain) ────────────────────────────────────────────────
create_table(
    "SmartCity-AuditLogs",
    ["AttributeName=logId,AttributeType=S", "AttributeName=timestamp,AttributeType=S", "AttributeName=entityType,AttributeType=S"],
    ["AttributeName=logId,KeyType=HASH", "AttributeName=timestamp,KeyType=RANGE"],
    gsi=[
        {"IndexName": "entityType-index", "KeySchema": [{"AttributeName": "entityType", "KeyType": "HASH"}, {"AttributeName": "timestamp", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
    ]
)

# ── Enable TTL on Notifications ───────────────────────────────────────────────
print("\n[TTL] Enabling TTL on SmartCity-Notifications...")
aws(["dynamodb", "update-time-to-live",
     "--table-name", "SmartCity-Notifications",
     "--time-to-live-specification", "Enabled=true,AttributeName=ttl"])
print("  [OK] TTL enabled")

# ── Final verification ────────────────────────────────────────────────────────
print("\n[VERIFY] Verifying all tables...")
result = aws(["dynamodb", "list-tables", "--query", "TableNames"])
if result:
    tables = json.loads(result)
    smartcity_tables = [t for t in tables if t.startswith("SmartCity")]
    print(f"\n[DONE] {len(smartcity_tables)}/13 SmartCity tables found:")
    for t in sorted(smartcity_tables):
        print(f"   • {t}")

print("\n[COMPLETE] Phase 1 Done! All DynamoDB tables are ready.")
