"""
Jobs API – query and manage transcoding job status.
"""

from flask import Blueprint, request, jsonify
from app import db
from app.models import TranscodeJob, Video

jobs_bp = Blueprint("jobs", __name__)


@jobs_bp.route("/", methods=["GET"])
def list_jobs():
    """List transcoding jobs with optional filters."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 30, type=int)
    status = request.args.get("status")
    job_type = request.args.get("job_type")

    query = TranscodeJob.query.order_by(TranscodeJob.created_at.desc())
    if status:
        query = query.filter(TranscodeJob.status == status)
    if job_type:
        query = query.filter(TranscodeJob.job_type == job_type)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "jobs": [j.to_dict() for j in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


@jobs_bp.route("/<string:job_id>", methods=["GET"])
def get_job(job_id: str):
    """Get live status for a specific job, polling Celery if still running."""
    job = TranscodeJob.query.get_or_404(job_id)
    data = job.to_dict()

    # Live progress from Celery
    if job.status == "running" and job.celery_task_id:
        try:
            from app.workers.tasks import celery_app
            result = celery_app.AsyncResult(job.celery_task_id)
            if result.state == "PROGRESS":
                data["celery_progress"] = result.info.get("progress", job.progress)
        except Exception:
            pass

    return jsonify(data)


@jobs_bp.route("/<string:job_id>/cancel", methods=["POST"])
def cancel_job(job_id: str):
    """Cancel a pending or running job."""
    job = TranscodeJob.query.get_or_404(job_id)
    if job.status not in ("pending", "running"):
        return jsonify({"error": f"Cannot cancel job in state '{job.status}'"}), 400

    if job.celery_task_id:
        try:
            from app.workers.tasks import celery_app
            celery_app.control.revoke(job.celery_task_id, terminate=True)
        except Exception:
            pass

    job.status = "cancelled"
    db.session.commit()
    return jsonify({"message": "Job cancelled", "job": job.to_dict()})


@jobs_bp.route("/stats", methods=["GET"])
def job_stats():
    """Aggregate job statistics for the dashboard."""
    from sqlalchemy import func

    counts = db.session.query(
        TranscodeJob.status, func.count(TranscodeJob.id)
    ).group_by(TranscodeJob.status).all()

    avg_time = db.session.query(
        func.avg(TranscodeJob.processing_time)
    ).filter(TranscodeJob.status == "completed").scalar()

    total_output = db.session.query(
        func.sum(TranscodeJob.output_file_size)
    ).filter(TranscodeJob.status == "completed").scalar()

    return jsonify({
        "by_status": {row[0]: row[1] for row in counts},
        "avg_processing_time_seconds": round(avg_time or 0, 1),
        "total_output_bytes": total_output or 0,
        "total_output_gb": round((total_output or 0) / (1024 ** 3), 2),
    })
