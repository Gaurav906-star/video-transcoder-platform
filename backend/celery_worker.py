"""
Celery worker entry point.
Run with:
    celery -A celery_worker.celery_app worker --loglevel=info --concurrency=4
"""

import os
from app import create_app
from app.workers.tasks import make_celery

flask_app = create_app(os.environ.get("FLASK_ENV", "development"))
celery_app = make_celery(flask_app)
