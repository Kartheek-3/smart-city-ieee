from flask import Blueprint, jsonify
import boto3
import os
from collections import defaultdict

analytics_bp = Blueprint('analytics', __name__)

REGION = os.environ.get('AWS_REGION', 'us-east-1')
dynamodb = boto3.resource('dynamodb', region_name=REGION)

@analytics_bp.route('/summary', methods=['GET'])
def get_summary():
    try:
        print("Executing Amazon DynamoDB Analytics Queries...")
        
        # 1. Accident Trends
        accidents_table = dynamodb.Table('SmartCity-AccidentReports')
        try:
            accidents = accidents_table.scan().get('Items', [])
        except Exception:
            accidents = []
            
        date_counts = defaultdict(int)
        for a in accidents:
            # Extract YYYY-MM-DD from timestamp
            ts = a.get('timestamp', '')[:10]
            if ts:
                date_counts[ts] += 1
                
        # Sort dates descending and take top 7
        sorted_dates = sorted(date_counts.items(), key=lambda x: x[0], reverse=True)[:7]
        accident_trends = [{"date": k, "count": v} for k, v in sorted_dates]

        # 2. Crime Hotspots
        crimes_table = dynamodb.Table('SmartCity-CrimeReports')
        try:
            crimes = crimes_table.scan().get('Items', [])
        except Exception:
            crimes = []
            
        location_counts = defaultdict(int)
        for c in crimes:
            loc = c.get('location', 'Unknown')
            if loc:
                location_counts[loc] += 1
                
        # Sort locations by count descending and take top 5
        sorted_locations = sorted(location_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        crime_hotspots = [{"location": k, "count": v} for k, v in sorted_locations]

        # 3. Waste Analysis
        waste_table = dynamodb.Table('SmartCity-WasteReports')
        try:
            wastes = waste_table.scan().get('Items', [])
        except Exception:
            wastes = []
            
        severity_counts = defaultdict(int)
        for w in wastes:
            sev = w.get('severity', 'Unknown')
            if sev:
                severity_counts[sev] += 1
                
        waste_analysis = [{"severity": k.title(), "count": v} for k, v in severity_counts.items()]

        # 4. Food Distribution Analysis
        food_table = dynamodb.Table('SmartCity-FoodDonations')
        try:
            foods = food_table.scan().get('Items', [])
        except Exception:
            foods = []
            
        import time
        from datetime import datetime
        current_ms = int(time.time() * 1000)
        
        food_status_qty = defaultdict(int)
        for f in foods:
            status = f.get('status', 'available')
            expiry_str = f.get('expiry_time')
            
            # Check for expiry dynamically
            if status != 'delivered' and expiry_str:
                try:
                    # Handle typical ISO strings
                    clean_str = expiry_str.replace('Z', '+00:00')
                    expiry_time = datetime.fromisoformat(clean_str).timestamp() * 1000
                    if current_ms > expiry_time:
                        status = 'expired'
                except Exception:
                    pass
                    
            # Map status to UI label exactly as requested: Donated, Accepted, Expired
            if status == 'available': label = 'Donated'
            elif status in ['pending', 'delivered']: label = 'Accepted'
            elif status == 'expired': label = 'Expired'
            else: label = status.title()
            
            qty = int(f.get('quantity', 0))
            if qty > 0:
                food_status_qty[label] += qty
                
        # Format for Recharts
        food_distribution = [{"status": k, "quantity": v, "count": v} for k, v in food_status_qty.items()]

        # 5. Basic counts for Health Index
        waste_count = len(wastes)
        crime_count = len(crimes)
        accident_count = len(accidents)

        overall_score = max(0, min(100, 100 - (crime_count * 3 + accident_count * 2 + waste_count * 1)))
        
        # 6. City Health Index
        city_health_zones = [
            {"area": "Overall City", "safety": max(50, 100-crime_count), "cleanliness": max(50, 100-waste_count), "food": 90, "emergency": 88, "index": overall_score},
        ]
        
        # 7. Trust Distribution — Live from SmartCity-Users table
        try:
            users_table = dynamodb.Table('SmartCity-Users')
            user_resp = users_table.scan(ProjectionExpression='trustScore')
            all_users = user_resp.get('Items', [])
            while 'LastEvaluatedKey' in user_resp:
                user_resp = users_table.scan(ExclusiveStartKey=user_resp['LastEvaluatedKey'], ProjectionExpression='trustScore')
                all_users.extend(user_resp.get('Items', []))
            
            buckets = {'90-100': 0, '70-89': 0, '50-69': 0, '0-49': 0}
            for u in all_users:
                score = int(u.get('trustScore', 50))
                if score >= 90: buckets['90-100'] += 1
                elif score >= 70: buckets['70-89'] += 1
                elif score >= 50: buckets['50-69'] += 1
                else: buckets['0-49'] += 1
            
            trust_distribution = [{"range": k, "users": v} for k, v in buckets.items()]
        except Exception as te:
            print(f"Trust distribution error: {te}")
            trust_distribution = [
                {"range": "90-100", "users": 0},
                {"range": "70-89", "users": 0},
                {"range": "50-69", "users": 0},
                {"range": "0-49", "users": 0}
            ]

        return jsonify({
            "success": True,
            "source": "Amazon DynamoDB (Free Tier)",
            "data": {
                "accident_trends": accident_trends,
                "crime_hotspots": crime_hotspots,
                "waste_analysis": waste_analysis,
                "food_distribution": food_distribution,
                "city_health_zones": city_health_zones,
                "trust_distribution": trust_distribution
            }
        }), 200

    except Exception as e:
        print(f"Error in analytics summary: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
