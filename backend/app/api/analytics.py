"""
Analytics API – platform-level metrics for the dashboard.
"""

from flask import Blueprint, jsonify
from app import db
from app.models import Video, TranscodeJob, PlaybackLog
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta, timezone

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/overview", methods=["GET"])
def overview():
    """High-level platform statistics."""
    total_videos = Video.query.count()
    total_jobs = TranscodeJob.query.count()
    completed_jobs = TranscodeJob.query.filter_by(status="completed").count()
    running_jobs = TranscodeJob.query.filter_by(status="running").count()
    failed_jobs = TranscodeJob.query.filter_by(status="failed").count()

    total_raw_bytes = db.session.query(func.sum(Video.file_size)).scalar() or 0
    total_processed_bytes = db.session.query(
        func.sum(TranscodeJob.output_file_size)
    ).filter(TranscodeJob.status == "completed").scalar() or 0

    avg_time = db.session.query(
        func.avg(TranscodeJob.processing_time)
    ).filter(TranscodeJob.status == "completed").scalar() or 0

    return jsonify({
        "total_videos": total_videos,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "running_jobs": running_jobs,
        "failed_jobs": failed_jobs,
        "success_rate": round(completed_jobs / total_jobs * 100, 1) if total_jobs else 0,
        "total_raw_gb": round(total_raw_bytes / (1024 ** 3), 2),
        "total_processed_gb": round(total_processed_bytes / (1024 ** 3), 2),
        "avg_processing_seconds": round(avg_time, 1),
    })


@analytics_bp.route("/jobs-over-time", methods=["GET"])
def jobs_over_time():
    """Jobs completed per day over the past 30 days."""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    rows = (
        db.session.query(
            cast(TranscodeJob.completed_at, Date).label("day"),
            func.count(TranscodeJob.id).label("count"),
        )
        .filter(
            TranscodeJob.status == "completed",
            TranscodeJob.completed_at >= since,
        )
        .group_by("day")
        .order_by("day")
        .all()
    )
    return jsonify([{"date": str(r.day), "count": r.count} for r in rows])


@analytics_bp.route("/profile-distribution", methods=["GET"])
def profile_distribution():
    """Breakdown of completed jobs by transcoding profile."""
    rows = (
        db.session.query(
            TranscodeJob.profile,
            func.count(TranscodeJob.id).label("count"),
        )
        .filter(TranscodeJob.status == "completed")
        .group_by(TranscodeJob.profile)
        .all()
    )
    return jsonify([{"profile": r.profile, "count": r.count} for r in rows])


@analytics_bp.route("/processing-times", methods=["GET"])
def processing_times():
    """Average processing time per profile for performance monitoring."""
    rows = (
        db.session.query(
            TranscodeJob.profile,
            func.avg(TranscodeJob.processing_time).label("avg_seconds"),
            func.min(TranscodeJob.processing_time).label("min_seconds"),
            func.max(TranscodeJob.processing_time).label("max_seconds"),
        )
        .filter(TranscodeJob.status == "completed", TranscodeJob.processing_time.isnot(None))
        .group_by(TranscodeJob.profile)
        .all()
    )
    return jsonify([
        {
            "profile": r.profile,
            "avg_seconds": round(r.avg_seconds or 0, 1),
            "min_seconds": round(r.min_seconds or 0, 1),
            "max_seconds": round(r.max_seconds or 0, 1),
        }
        for r in rows
    ])
