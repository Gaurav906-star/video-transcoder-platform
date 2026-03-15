"""
Cloud-Based Video Transcoding Platform
MSc Cloud Computing - Scalable Cloud Programming
Student: Gaurav Kumar | Roll No: 24250279
"""

from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from prometheus_flask_exporter import PrometheusMetrics

db = SQLAlchemy()
migrate = Migrate()
metrics = PrometheusMetrics.for_app_factory()


def create_app(config_name: str = "development") -> Flask:
    """Application factory pattern for Flask app creation."""
    app = Flask(__name__)

    # Load configuration
    from app.config import config_map
    app.config.from_object(config_map[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    metrics.init_app(app)

    # Enable CORS for the React frontend
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://localhost:3000"],
            "methods": ["GET", "POST", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Register blueprints
    from app.api.videos import videos_bp
    from app.api.jobs import jobs_bp
    from app.api.analytics import analytics_bp
    from app.api.health import health_bp

    app.register_blueprint(health_bp, url_prefix="/api/health")
    app.register_blueprint(videos_bp, url_prefix="/api/videos")
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")

    return app
