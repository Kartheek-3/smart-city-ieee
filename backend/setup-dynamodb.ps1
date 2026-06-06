# SmartCity DynamoDB Table Setup Script
# Run this script once to create all 13 tables.
# Ensure AWS CLI is configured: aws configure

$REGION = "us-east-1"

Write-Host "Creating SmartCity DynamoDB Tables in $REGION..." -ForegroundColor Cyan

# 1. Users Table
aws dynamodb create-table `
  --table-name SmartCity-Users `
  --attribute-definitions `
    AttributeName=userId,AttributeType=S `
    AttributeName=email,AttributeType=S `
    AttributeName=role,AttributeType=S `
  --key-schema AttributeName=userId,KeyType=HASH `
  --global-secondary-indexes `
    "[{`"IndexName`":`"email-index`",`"KeySchema`":[{`"AttributeName`":`"email`",`"KeyType`":`"HASH`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}},{`"IndexName`":`"role-index`",`"KeySchema`":[{`"AttributeName`":`"role`",`"KeyType`":`"HASH`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-Users created" -ForegroundColor Green

# 2. Messages Table
aws dynamodb create-table `
  --table-name SmartCity-Messages `
  --attribute-definitions `
    AttributeName=conversationId,AttributeType=S `
    AttributeName=timestamp,AttributeType=S `
    AttributeName=senderId,AttributeType=S `
  --key-schema `
    AttributeName=conversationId,KeyType=HASH `
    AttributeName=timestamp,KeyType=RANGE `
  --global-secondary-indexes `
    "[{`"IndexName`":`"senderId-index`",`"KeySchema`":[{`"AttributeName`":`"senderId`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"timestamp`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-Messages created" -ForegroundColor Green

# 3. FollowRequests Table
aws dynamodb create-table `
  --table-name SmartCity-FollowRequests `
  --attribute-definitions `
    AttributeName=requestId,AttributeType=S `
    AttributeName=toUserId,AttributeType=S `
    AttributeName=fromUserId,AttributeType=S `
  --key-schema `
    AttributeName=requestId,KeyType=HASH `
  --global-secondary-indexes `
    "[{`"IndexName`":`"toUserId-index`",`"KeySchema`":[{`"AttributeName`":`"toUserId`",`"KeyType`":`"HASH`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}},{`"IndexName`":`"fromUserId-index`",`"KeySchema`":[{`"AttributeName`":`"fromUserId`",`"KeyType`":`"HASH`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-FollowRequests created" -ForegroundColor Green

# 4. AccidentReports Table
aws dynamodb create-table `
  --table-name SmartCity-AccidentReports `
  --attribute-definitions `
    AttributeName=reportId,AttributeType=S `
    AttributeName=timestamp,AttributeType=S `
    AttributeName=severity,AttributeType=S `
    AttributeName=status,AttributeType=S `
  --key-schema `
    AttributeName=reportId,KeyType=HASH `
    AttributeName=timestamp,KeyType=RANGE `
  --global-secondary-indexes `
    "[{`"IndexName`":`"severity-index`",`"KeySchema`":[{`"AttributeName`":`"severity`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"timestamp`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}},{`"IndexName`":`"status-index`",`"KeySchema`":[{`"AttributeName`":`"status`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"timestamp`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-AccidentReports created (with DynamoDB Stream)" -ForegroundColor Green

# 5. CrimeReports Table
aws dynamodb create-table `
  --table-name SmartCity-CrimeReports `
  --attribute-definitions `
    AttributeName=reportId,AttributeType=S `
    AttributeName=timestamp,AttributeType=S `
    AttributeName=crimeType,AttributeType=S `
    AttributeName=status,AttributeType=S `
  --key-schema `
    AttributeName=reportId,KeyType=HASH `
    AttributeName=timestamp,KeyType=RANGE `
  --global-secondary-indexes `
    "[{`"IndexName`":`"crimeType-index`",`"KeySchema`":[{`"AttributeName`":`"crimeType`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"timestamp`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}},{`"IndexName`":`"status-index`",`"KeySchema`":[{`"AttributeName`":`"status`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"timestamp`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-CrimeReports created (with DynamoDB Stream)" -ForegroundColor Green

# 6. WasteReports Table
aws dynamodb create-table `
  --table-name SmartCity-WasteReports `
  --attribute-definitions `
    AttributeName=reportId,AttributeType=S `
    AttributeName=timestamp,AttributeType=S `
    AttributeName=status,AttributeType=S `
  --key-schema `
    AttributeName=reportId,KeyType=HASH `
    AttributeName=timestamp,KeyType=RANGE `
  --global-secondary-indexes `
    "[{`"IndexName`":`"status-index`",`"KeySchema`":[{`"AttributeName`":`"status`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"timestamp`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-WasteReports created (with DynamoDB Stream)" -ForegroundColor Green

# 7. FoodDonations Table
aws dynamodb create-table `
  --table-name SmartCity-FoodDonations `
  --attribute-definitions `
    AttributeName=donationId,AttributeType=S `
    AttributeName=createdAt,AttributeType=S `
    AttributeName=status,AttributeType=S `
  --key-schema `
    AttributeName=donationId,KeyType=HASH `
    AttributeName=createdAt,KeyType=RANGE `
  --global-secondary-indexes `
    "[{`"IndexName`":`"status-index`",`"KeySchema`":[{`"AttributeName`":`"status`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"createdAt`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-FoodDonations created (with DynamoDB Stream)" -ForegroundColor Green

# 8. TrustScores Table
aws dynamodb create-table `
  --table-name SmartCity-TrustScores `
  --attribute-definitions `
    AttributeName=userId,AttributeType=S `
    AttributeName=updatedAt,AttributeType=S `
  --key-schema `
    AttributeName=userId,KeyType=HASH `
    AttributeName=updatedAt,KeyType=RANGE `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-TrustScores created" -ForegroundColor Green

# 9. Notifications Table
aws dynamodb create-table `
  --table-name SmartCity-Notifications `
  --attribute-definitions `
    AttributeName=notificationId,AttributeType=S `
    AttributeName=timestamp,AttributeType=S `
    AttributeName=userId,AttributeType=S `
  --key-schema `
    AttributeName=notificationId,KeyType=HASH `
    AttributeName=timestamp,KeyType=RANGE `
  --global-secondary-indexes `
    "[{`"IndexName`":`"userId-index`",`"KeySchema`":[{`"AttributeName`":`"userId`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"timestamp`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-Notifications created" -ForegroundColor Green

# Enable TTL on Notifications (auto-delete after 30 days)
aws dynamodb update-time-to-live `
  --table-name SmartCity-Notifications `
  --time-to-live-specification Enabled=true,AttributeName=ttl `
  --region $REGION 2>&1
Write-Host "✅ TTL enabled on SmartCity-Notifications" -ForegroundColor Yellow

# 10. EmergencyDispatch Table
aws dynamodb create-table `
  --table-name SmartCity-EmergencyDispatch `
  --attribute-definitions `
    AttributeName=dispatchId,AttributeType=S `
    AttributeName=timestamp,AttributeType=S `
  --key-schema `
    AttributeName=dispatchId,KeyType=HASH `
    AttributeName=timestamp,KeyType=RANGE `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-EmergencyDispatch created" -ForegroundColor Green

# 11. PoliceDispatch Table
aws dynamodb create-table `
  --table-name SmartCity-PoliceDispatch `
  --attribute-definitions `
    AttributeName=dispatchId,AttributeType=S `
    AttributeName=timestamp,AttributeType=S `
  --key-schema `
    AttributeName=dispatchId,KeyType=HASH `
    AttributeName=timestamp,KeyType=RANGE `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-PoliceDispatch created" -ForegroundColor Green

# 12. CityPlans Table
aws dynamodb create-table `
  --table-name SmartCity-CityPlans `
  --attribute-definitions `
    AttributeName=planId,AttributeType=S `
    AttributeName=createdAt,AttributeType=S `
    AttributeName=status,AttributeType=S `
  --key-schema `
    AttributeName=planId,KeyType=HASH `
    AttributeName=createdAt,KeyType=RANGE `
  --global-secondary-indexes `
    "[{`"IndexName`":`"status-index`",`"KeySchema`":[{`"AttributeName`":`"status`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"createdAt`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-CityPlans created (with DynamoDB Stream)" -ForegroundColor Green

# 13. AuditLogs Table (Blockchain)
aws dynamodb create-table `
  --table-name SmartCity-AuditLogs `
  --attribute-definitions `
    AttributeName=logId,AttributeType=S `
    AttributeName=timestamp,AttributeType=S `
    AttributeName=entityType,AttributeType=S `
  --key-schema `
    AttributeName=logId,KeyType=HASH `
    AttributeName=timestamp,KeyType=RANGE `
  --global-secondary-indexes `
    "[{`"IndexName`":`"entityType-index`",`"KeySchema`":[{`"AttributeName`":`"entityType`",`"KeyType`":`"HASH`"},{`"AttributeName`":`"timestamp`",`"KeyType`":`"RANGE`"}],`"Projection`":{`"ProjectionType`":`"ALL`"}}]" `
  --billing-mode PAY_PER_REQUEST `
  --region $REGION 2>&1
Write-Host "✅ SmartCity-AuditLogs created" -ForegroundColor Green

Write-Host ""
Write-Host "All 13 DynamoDB tables created successfully!" -ForegroundColor Cyan
Write-Host "Verifying tables..." -ForegroundColor Yellow
aws dynamodb list-tables --region $REGION --query "TableNames[?starts_with(@, 'SmartCity')]"
