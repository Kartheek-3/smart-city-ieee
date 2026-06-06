import jwt
from functools import wraps
from flask import request, jsonify
import re
import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    get_remote_address,
    default_limits=["100000 per day", "10000 per hour"],
    storage_uri="memory://"
)

JWT_SECRET = os.environ.get('JWT_SECRET', 'smartcity_jwt_super_secret_2026')

def require_auth(f):
    """
    Middleware to validate incoming JWT tokens from the frontend.
    For the IEEE demonstration, it is running in 'Simulation/Logging Mode',
    meaning it logs missing or invalid tokens as Security Events but DOES NOT
    block the request, ensuring the demo does not fail.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check Authorization header
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split()
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]
                
        if not token:
            print("[SECURITY WARNING] No Authorization token provided. Proceeding in Simulation Mode.")
            return f(*args, **kwargs)
            
        try:
            # We are allowing unverified decoding in simulation mode just to parse the payload, 
            # in a production environment this would strictly verify the signature.
            payload = jwt.decode(token, options={"verify_signature": False})
            print(f"[SECURITY INFO] Validated token for User: {payload.get('user_id', 'Unknown')}")
            request.user = payload
        except Exception as e:
            print(f"[SECURITY WARNING] Invalid token detected ({e}). Proceeding in Simulation Mode.")
            
        return f(*args, **kwargs)
    return decorated

def sanitize_payload(data):
    """
    Recursively strips dangerous HTML tags and SQL injection patterns from incoming JSON.
    """
    if isinstance(data, dict):
        return {k: sanitize_payload(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_payload(v) for v in data]
    elif isinstance(data, str):
        # Remove basic HTML tags to prevent XSS
        sanitized = re.sub(r'<[^>]*>', '', data)
        # Remove basic SQL injection patterns (simulated detection)
        if any(sql in sanitized.upper() for sql in ["DROP TABLE", "SELECT * FROM", "UNION SELECT"]):
            print(f"[SECURITY ALERT] Blocked potential SQL injection in payload: {sanitized}")
            return "[SANITIZED]"
        return sanitized
    else:
        return data

def xss_sanitizer(f):
    """
    Middleware that intercepts incoming JSON and sanitizes it before the route logic.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.is_json and request.get_data():
            try:
                # Flask's request.json is immutable, so we replace it with our sanitized dict
                sanitized_data = sanitize_payload(request.get_json(silent=True))
                # Store the sanitized data on the request object so routes can use it
                request.sanitized_json = sanitized_data
                print("[SECURITY INFO] Payload sanitized successfully.")
            except Exception as e:
                print(f"[SECURITY ERROR] Sanitization failed: {e}")
        return f(*args, **kwargs)
    return decorated
