from flask import Flask, request
from flask_cors import CORS
from .middleware.security import limiter

def create_app():
    app = Flask(__name__)
    CORS(app)
    limiter.init_app(app)

    # Attach Global Security Headers
    @app.after_request
    def apply_caching(response):
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:5000;"
        return response

    from .api.reports import reports_bp
    from .api.analytics import analytics_bp
    from .api.users import users_bp
    from .api.storage import storage_bp
    from .api.ml import ml_bp
    from .api.messages import messages_bp
    from .api.social import social_bp
    from .api.alerts import alerts_bp
    
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(storage_bp, url_prefix='/api/storage')
    app.register_blueprint(ml_bp, url_prefix='/api/ml')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(social_bp, url_prefix='/api/social')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')

    @app.route('/health', methods=['GET'])
    @limiter.exempt
    def health_check():
        return {'status': 'healthy', 'cloud': 'aws', 'security': 'active'}, 200

    return app
