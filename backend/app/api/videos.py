"""
Videos API – upload, list, delete master video files and trigger transcoding.
"""

import os
import tempfile
from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models import Video, TranscodeJob
from app.services.storage import StorageService, VideoProbeService
from app.workers.tasks import transcode_video, extract_audio, generate_hls

videos_bp = Blueprint("videos", __name__)
storage = StorageService()


def allowed_file(filename: str) -> bool:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in current_app.config.get("ALLOWED_EXTENSIONS", set())


@videos_bp.route("/", methods=["GET"])
def list_videos():
    """List all uploaded videos with their jobs summary."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status")

    query = Video.query.order_by(Video.uploaded_at.desc())
    if status:
        query = query.filter(Video.status == status)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    videos = []
    for v in pagination.items:
        data = v.to_dict()
        data["jobs_summary"] = {
            "total": len(v.jobs),
            "completed": sum(1 for j in v.jobs if j.status == "completed"),
            "running": sum(1 for j in v.jobs if j.status == "running"),
            "failed": sum(1 for j in v.jobs if j.status == "failed"),
        }
        videos.append(data)

    return jsonify({
        "videos": videos,
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


@videos_bp.route("/upload", methods=["POST"])
def upload_video():
    """
    Upload a master video and automatically queue all transcoding jobs.
    Accepts multipart/form-data with:
      - file: the video file
      - profiles: comma-separated list (e.g. "1080p,720p,480p,360p")
      - extract_audio: "true"/"false"
      - generate_hls: "true"/"false"
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    profiles_raw = request.form.get("profiles", "720p,480p,360p")
    requested_profiles = [p.strip() for p in profiles_raw.split(",") if p.strip()]
    do_audio = request.form.get("extract_audio", "true").lower() == "true"
    do_hls = request.form.get("generate_hls", "true").lower() == "true"

    # Save to temp for FFprobe
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Upload to S3
        with open(tmp_path, "rb") as f:
            s3_key, file_size = storage.upload_raw_video(f, file.filename)

        # Probe video metadata
        meta = VideoProbeService.probe(tmp_path)
    finally:
        os.unlink(tmp_path)

    # Persist Video record
    video = Video(
        original_filename=file.filename,
        filename=s3_key.split("/")[-1],
        file_size=file_size,
        s3_raw_key=s3_key,
        status="queued",
        **meta,
    )
    db.session.add(video)
    db.session.flush()  # get video.id

    jobs_created = []

    # Create and dispatch video transcoding jobs
    valid_profiles = current_app.config.get("TRANSCODE_PROFILES", {})
    for profile in requested_profiles:
        if profile not in valid_profiles:
            continue
        job = TranscodeJob(
            video_id=video.id,
            job_type="video",
            profile=profile,
            output_format="mp4",
            status="pending",
        )
        db.session.add(job)
        db.session.flush()
        result = transcode_video.delay(job.id, video.id, profile)
        job.celery_task_id = result.id
        jobs_created.append(job.to_dict())

    # Audio extraction jobs
    if do_audio:
        for fmt in ["aac", "mp3"]:
            job = TranscodeJob(
                video_id=video.id,
                job_type="audio",
                profile=fmt,
                output_format=fmt,
                status="pending",
            )
            db.session.add(job)
            db.session.flush()
            result = extract_audio.delay(job.id, video.id, fmt)
            job.celery_task_id = result.id
            jobs_created.append(job.to_dict())

    # HLS generation job
    if do_hls:
        job = TranscodeJob(
            video_id=video.id,
            job_type="hls",
            profile="hls",
            output_format="m3u8",
            status="pending",
        )
        db.session.add(job)
        db.session.flush()
        result = generate_hls.delay(job.id, video.id)
        job.celery_task_id = result.id
        jobs_created.append(job.to_dict())

    db.session.commit()

    return jsonify({
        "video": video.to_dict(),
        "jobs": jobs_created,
        "message": f"Video uploaded and {len(jobs_created)} jobs queued",
    }), 201


@videos_bp.route("/<string:video_id>", methods=["GET"])
def get_video(video_id: str):
    """Get video details including all transcoding jobs."""
    video = Video.query.get_or_404(video_id)
    data = video.to_dict()
    data["jobs"] = [j.to_dict() for j in video.jobs]
    return jsonify(data)


@videos_bp.route("/<string:video_id>", methods=["DELETE"])
def delete_video(video_id: str):
    """Delete a video and all its S3 assets and job records."""
    video = Video.query.get_or_404(video_id)
    try:
        storage.delete_video_assets(video_id)
    except Exception as e:
        current_app.logger.warning(f"S3 cleanup failed for {video_id}: {e}")
    db.session.delete(video)
    db.session.commit()
    return jsonify({"message": "Video deleted"}), 200
