"""Health check endpoints for load balancer and monitoring."""

from flask import Blueprint, jsonify
import redis
import os

health_bp = Blueprint("health", __name__)


@health_bp.route("/", methods=["GET"])
def health():
    """Basic liveness probe."""
    return jsonify({"status": "ok", "service": "video-transcoding-api"}), 200


@health_bp.route("/ready", methods=["GET"])
def readiness():
    """Readiness probe – checks DB and Redis connectivity."""
    checks = {}

    # Check DB
    try:
        from app import db
        db.session.execute(db.text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Check Redis
    try:
        r = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
        r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    all_ok = all(v == "ok" for v in checks.values())
    return jsonify({"status": "ready" if all_ok else "degraded", "checks": checks}), 200 if all_ok else 503
