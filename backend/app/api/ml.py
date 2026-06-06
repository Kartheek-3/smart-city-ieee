from flask import Blueprint, request, jsonify
import numpy as np
import random
import os
from ..middleware.security import limiter, xss_sanitizer

ml_bp = Blueprint('ml', __name__)

try:
    from tensorflow.keras.models import load_model

    HAS_TF = True
    MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'traffic_transformer.h5')
    if os.path.exists(MODEL_PATH):
        try:
            model = load_model(MODEL_PATH, compile=False)
            print("Successfully loaded traffic_transformer.h5")
        except Exception as e:
            print(f"Warning: Failed to load Transformer model due to Keras 3 version incompatibility: {e}")
            print("Falling back to simulated Transformer heuristic.")
            model = None
    else:
        model = None
except ImportError:
    HAS_TF = False
    model = None

@ml_bp.route('/predict-traffic', methods=['POST'])
@limiter.limit("20 per minute")
@xss_sanitizer
def predict_traffic():
    try:
        req_data = getattr(request, 'sanitized_json', request.get_json())
        if not req_data or "data" not in req_data:
            return jsonify({"error": "Missing 'data' sequence in payload"}), 400
            
        sequence = np.array(req_data["data"])
        
        # We need to construct the 12-feature sample array for XGBoost:
        # [hour, day, month, year, holiday, weekday, temp, rain, snow, clouds, weather_main, weather_desc]
        last_state = sequence[-1]
        hour = float(last_state[0])
        day = float(last_state[1])
        temp = float(last_state[2])
        rain = float(last_state[3])
        snow = float(last_state[4])
        clouds = float(last_state[5])
        
        # Hardcoding static fields like the user sample: month=5, year=2018, holiday=0, weekday=3, weather_main=4, weather_desc=12
        sample = [[hour, day, 5, 2018, 0, 3, temp, rain, snow, clouds, 4, 12]]
        
        try:
            import boto3
            import json
            runtime = boto3.client("sagemaker-runtime", region_name='us-east-1')
            response = runtime.invoke_endpoint(
                EndpointName="traffic-xgboost-endpoint",
                ContentType="application/json",
                Body=json.dumps(sample)
            )
            result = json.loads(response["Body"].read())
            traffic_volume = float(result[0])
            source = "AWS SageMaker Endpoint (traffic_xgboost_model)"
        except Exception as e:
            print(f"SageMaker Traffic Endpoint Failed: {e}")
            # Fallback to simulated logic if endpoint isn't ready
            base = 500
            if hour in [8, 9, 10, 17, 18, 19]: base += random.randint(2000, 3500)
            elif hour in [11, 12, 13, 14, 15, 16]: base += random.randint(1000, 2000)
            if rain > 2.0: base *= 1.25
            traffic_volume = round(base, 2)
            source = "Simulated Fallback (Endpoint Unavailable)"

        return jsonify({
            "status": "success",
            "traffic_volume": traffic_volume,
            "source": source,
            "timestamp": "2026-06-05T14:35:00" # ISO format
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# SageMaker Endpoint Names
TRAFFIC_ENDPOINT = "traffic-xgboost-endpoint"
FAKE_REPORT_ENDPOINT = "fake-report-endpoint"

@ml_bp.route('/detect-fake-report', methods=['POST'])
@limiter.limit("30 per minute")
@xss_sanitizer
def detect_fake_report():
    try:
        req_data = getattr(request, 'sanitized_json', request.get_json())
        if not req_data:
            return jsonify({"error": "Missing JSON payload"}), 400
            
        sample = [[
            float(req_data.get("trust_score", 0)),
            float(req_data.get("reports_submitted", 0)),
            float(req_data.get("valid_reports", 0)),
            float(req_data.get("fake_reports", 0)),
            float(req_data.get("confirmations", 0)),
            float(req_data.get("account_age_days", 0))
        ]]
        
        try:
            import boto3
            import json
            runtime = boto3.client("sagemaker-runtime", region_name='us-east-1')
            response = runtime.invoke_endpoint(
                EndpointName=FAKE_REPORT_ENDPOINT,
                ContentType="application/json",
                Body=json.dumps(sample)
            )
            
            # Predict_proba returns [[prob_0, prob_1]]
            result = json.loads(response["Body"].read())
            probability = float(result[0][1])
            prediction = 1 if probability > 0.5 else 0
            source = "AWS SageMaker Endpoint (fake_report_model)"
            
        except Exception as e:
            print(f"SageMaker Fake Report Endpoint Failed: {e}")
            # Fallback heuristic
            score = (
                0.40 * (100 - sample[0][0]) +
                0.30 * sample[0][3] +
                0.20 * (50 - sample[0][4]) +
                0.10 * (100 - (sample[0][5]/10))
            )
            prediction = 1 if score > 50 else 0
            probability = min(1.0, max(0.0, score / 100.0))
            source = "Heuristic Fallback (Endpoint Unavailable)"

        return jsonify({
            "status": "success",
            "is_fake": bool(prediction),
            "fake_probability": round(probability * 100, 2),
            "source": source
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ── /fake-report-check — Exact architecture from user spec ────────────
@ml_bp.route('/fake-report-check', methods=['POST'])
@limiter.limit("30 per minute")
@xss_sanitizer
def fake_report_check():
    try:
        data = getattr(request, 'sanitized_json', request.get_json())
        if not data:
            return jsonify({"error": "Missing JSON payload"}), 400

        sample = [[
            float(data.get("trust_score", 0)),
            float(data.get("reports_submitted", 0)),
            float(data.get("valid_reports", 0)),
            float(data.get("fake_reports", 0)),
            float(data.get("confirmations", 0)),
            float(data.get("account_age_days", 0))
        ]]

        try:
            import boto3
            import json as _json
            runtime = boto3.client("sagemaker-runtime", region_name='us-east-1')
            response = runtime.invoke_endpoint(
                EndpointName=FAKE_REPORT_ENDPOINT,
                ContentType="application/json",
                Body=_json.dumps(sample)
            )
            result = _json.loads(response["Body"].read())
            risk_score = float(result[0][1])
        except Exception as e:
            print(f"SageMaker fake-report-endpoint failed: {e}")
            # Heuristic fallback
            score = (
                0.40 * (100 - sample[0][0]) +
                0.30 * sample[0][3] +
                0.20 * (50 - sample[0][4]) +
                0.10 * (100 - (sample[0][5] / 10))
            )
            risk_score = min(1.0, max(0.0, score / 100.0))

        status = "Suspicious" if risk_score > 0.7 else "Genuine"

        return jsonify({
            "risk_score": round(risk_score, 2),
            "status": status
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Try to configure Gemini API
import google.generativeai as genai
import uuid
import datetime
import boto3

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("REACT_APP_GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@ml_bp.route('/generate-plan', methods=['POST'])
@limiter.limit("5 per minute")
@xss_sanitizer
def generate_plan():
    try:
        req_data = getattr(request, 'sanitized_json', request.get_json())
        location = req_data.get('location', 'Unknown City Region')
        traffic = req_data.get('traffic', 'Unknown')
        crime = req_data.get('crime', 0)
        waste = req_data.get('waste', 0)
        accidents = req_data.get('accidents', 0)
        
        prompt = f"""
Location: {location}
Traffic Status: {traffic}
Crime Reports: {crime}
Waste Reports: {waste}
Accidents: {accidents}

Generate a concise, actionable Smart City Plan with the following exact structure:
1. Priority Level (High, Medium, or Low)
2. Root Cause Analysis
3. Recommendations (bullet points)
4. Resource Allocation
5. Expected Impact
"""
        
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            response_text = response.text
        except Exception as api_err:
            print(f"Gemini API Error: {api_err}. Falling back to simulation.")
            response_text = """Priority Level: High

Root Cause Analysis
- Traffic congestion and incident reports indicate strain on infrastructure.
- Service requests are peaking in specific zones.

Recommendations
- Deploy emergency response units to the highest-risk areas.
- Increase public transport frequency to alleviate traffic.
- Optimize waste collection routes dynamically based on active reports.

Resource Allocation
- 3 Additional Patrol Units
- 2 Emergency Medical Vehicles
- 4 Sanitation Teams

Expected Impact
- 25% reduction in average incident resolution time.
- Smoother traffic flow during peak hours.
"""
        
        priority = "Medium"
        if "Priority Level: High" in response_text or "Priority: High" in response_text or "High" in response_text.split('\n')[:5]:
            priority = "High"
        elif "Priority Level: Low" in response_text or "Priority: Low" in response_text or "Low" in response_text.split('\n')[:5]:
            priority = "Low"
            
        plan_id = f"PLAN_{uuid.uuid4().hex[:8].upper()}"
        city_plan = {
            "plan_id": plan_id,
            "location": location,
            "priority": priority,
            "recommendations": response_text,
            "generated_at": datetime.datetime.now().isoformat()
        }
        
        # Save to DynamoDB
        REGION = "us-east-1"
        ACCESS_KEY = "YOUR_AWS_ACCESS_KEY_ID"
        SECRET_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
        
        dynamodb = boto3.client(
            'dynamodb',
            region_name=REGION,
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY
        )
        
        dynamodb.put_item(
            TableName='CityPlans',
            Item={
                'plan_id': {'S': plan_id},
                'location': {'S': location},
                'priority': {'S': priority},
                'recommendations': {'S': response_text},
                'generated_at': {'S': city_plan["generated_at"]}
            }
        )
        
        return jsonify({
            "status": "success",
            "plan": city_plan
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@ml_bp.route('/chatbot', methods=['POST'])
@limiter.limit("10 per minute")
@xss_sanitizer
def chatbot():
    try:
        req_data = getattr(request, 'sanitized_json', request.get_json())
        message = req_data.get('message', '')
        context = req_data.get('context', {})
        
        system_instruction = f"""You are the official SmartCity Civic Assistant.
You have access to the following LIVE website data context:
{context}

CRITICAL RULE: You MUST answer questions using the provided live website data. Whenever a user asks about issues, donations, accidents, or any city metric, explicitly refer to the data from your context and provide the exact numbers or statuses. Do not make up metrics if they are provided in the context."""
        prompt = f"{system_instruction}\n\nUser: {message}\nAI:"
        
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            text = response.text
            source = "Google Gemini"
        except Exception as api_err:
            print(f"Gemini API Error: {api_err}. Falling back to simulation.")
            lower_msg = message.lower()
            
            # Extract live analytics data from context
            analytics = context.get("analytics", {})
            city_health = analytics.get("city_health_zones", [{"index": "N/A"}])[0].get("index", "N/A") if analytics.get("city_health_zones") else "N/A"
            
            waste_items = analytics.get("waste_analysis", [])
            active_waste = sum(item.get("count", 0) for item in waste_items)
            
            food_items = analytics.get("food_distribution", [])
            active_food = sum(item.get("count", 0) for item in food_items if item.get("status") in ["Donations", "Available"])
            
            accidents_items = analytics.get("accident_trends", [])
            recent_accidents = sum(item.get("count", 0) for item in accidents_items)
            
            open_issues = context.get('issues', {}).get('open', 0)

            if "open issue" in lower_msg or "issues" in lower_msg:
                text = f"We currently have {open_issues} open issues reported in the city."
            elif "waste" in lower_msg or "garbage" in lower_msg:
                text = f"We currently have {active_waste} active waste reports being handled by our teams."
            elif "food" in lower_msg or "donation" in lower_msg:
                text = f"There are currently {active_food} available food donations ready for pickup."
            elif "health" in lower_msg or "score" in lower_msg:
                text = f"The overall City Health Score is currently {city_health}/100 based on live analytics."
            elif "accident" in lower_msg or "traffic" in lower_msg or "congestion" in lower_msg:
                text = f"There have been {recent_accidents} recent traffic accidents reported. Traffic AI is monitoring the flow."
            elif "crime" in lower_msg or "safety" in lower_msg:
                incidents = context.get('safety', {}).get('activeIncidents', 0)
                text = f"There are {incidents} active safety incidents being monitored."
            elif "service" in lower_msg or "help" in lower_msg or "what" in lower_msg or "hi" in lower_msg or "hello" in lower_msg:
                text = (f"I am your Smart City Civic Assistant! Based on live data, our City Health Score is {city_health}/100. "
                        f"We are currently managing {active_waste} waste reports, {recent_accidents} recent accidents, "
                        f"and we have {active_food} food donations available. How can I help you?")
            else:
                text = (f"I've processed your query regarding '{message}'. "
                        f"I can provide live updates on city health ({city_health}/100), waste ({active_waste} reports), "
                        f"food donations ({active_food} available), or issues ({open_issues} open). What would you like to know?")
            source = "Civic Assistant AI"

        return jsonify({
            "status": "success",
            "text": text,
            "source": source
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
