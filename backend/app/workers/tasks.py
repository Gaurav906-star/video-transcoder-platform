"""
Celery application and transcoding worker tasks using FFmpeg.
Workers consume jobs from the Redis queue and process videos.
"""

import os
import time
import subprocess
import logging
from datetime import datetime, timezone
from celery import Celery
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


def make_celery(app=None):
    """Create Celery instance, optionally bound to Flask app."""
    broker = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
    backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

    celery = Celery(
        "transcoding_platform",
        broker=broker,
        backend=backend,
        include=["app.workers.tasks"],
    )

    celery.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_acks_late=True,
        worker_prefetch_multiplier=1,   # One job at a time per worker (CPU-bound)
        task_soft_time_limit=3600,
        task_time_limit=4000,
        beat_schedule={},
    )

    if app is not None:
        class ContextTask(celery.Task):
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)
        celery.Task = ContextTask

    return celery


celery_app = make_celery()


# ──────────────────────────────────────────────
# Helper utilities
# ──────────────────────────────────────────────

def _run_ffmpeg(cmd: list, job_id: str) -> None:
    """Execute an FFmpeg command, raising on non-zero exit."""
    logger.info(f"[Job {job_id}] FFmpeg command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"[Job {job_id}] FFmpeg stderr:\n{result.stderr}")
        raise RuntimeError(f"FFmpeg failed (code {result.returncode}): {result.stderr[-500:]}")
    return result


def _update_job(job_id: str, **kwargs):
    """Update a TranscodeJob record inside a Flask app context."""
    try:
        from app import db
        from app.models import TranscodeJob
        job = TranscodeJob.query.get(job_id)
        if job:
            for k, v in kwargs.items():
                setattr(job, k, v)
            db.session.commit()
    except Exception as e:
        logger.warning(f"Could not update job {job_id}: {e}")


def _upload_to_s3(local_path: str, bucket: str, key: str) -> str:
    """Upload a local file to S3 and return the public URL."""
    import boto3
    region = os.environ.get("AWS_REGION", "eu-west-1")
    cdn_base = os.environ.get("CDN_BASE_URL", "")
    s3 = boto3.client("s3", region_name=region)
    s3.upload_file(
        local_path,
        bucket,
        key,
        ExtraArgs={"ContentType": _content_type(local_path)}
    )
    if cdn_base:
        return f"{cdn_base.rstrip('/')}/{key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


def _content_type(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return {
        ".mp4": "video/mp4",
        ".m4a": "audio/mp4",
        ".mp3": "audio/mpeg",
        ".m3u8": "application/x-mpegURL",
        ".ts": "video/MP2T",
    }.get(ext, "application/octet-stream")


# ──────────────────────────────────────────────
# Celery Tasks
# ──────────────────────────────────────────────

@celery_app.task(bind=True, name="tasks.transcode_video", max_retries=2)
def transcode_video(self, job_id: str, video_id: str, profile: str):
    """
    Transcode a video to a specific resolution profile.
    Downloads from S3 → FFmpeg → uploads output back to S3.
    """
    import boto3
    import tempfile

    start = time.time()
    profiles = {
        "1080p": {"width": 1920, "height": 1080, "video_bitrate": "5000k", "audio_bitrate": "192k"},
        "720p":  {"width": 1280, "height": 720,  "video_bitrate": "2500k", "audio_bitrate": "128k"},
        "480p":  {"width": 854,  "height": 480,  "video_bitrate": "1000k", "audio_bitrate": "96k"},
        "360p":  {"width": 640,  "height": 360,  "video_bitrate": "600k",  "audio_bitrate": "64k"},
    }

    _update_job(job_id, status="running", started_at=datetime.now(timezone.utc), progress=5)
    self.update_state(state="PROGRESS", meta={"progress": 5, "profile": profile})

    try:
        from app.models import Video
        from app import db

        video = Video.query.get(video_id)
        if not video:
            raise ValueError(f"Video {video_id} not found")

        cfg = profiles[profile]
        raw_bucket = os.environ.get("S3_RAW_BUCKET", "transcoding-raw-videos")
        processed_bucket = os.environ.get("S3_PROCESSED_BUCKET", "transcoding-processed-videos")
        region = os.environ.get("AWS_REGION", "eu-west-1")
        s3 = boto3.client("s3", region_name=region)

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input_video")
            output_path = os.path.join(tmpdir, f"output_{profile}.mp4")

            # Step 1 – Download source video
            logger.info(f"[Job {job_id}] Downloading s3://{raw_bucket}/{video.s3_raw_key}")
            s3.download_file(raw_bucket, video.s3_raw_key, input_path)
            _update_job(job_id, progress=20)
            self.update_state(state="PROGRESS", meta={"progress": 20})

            # Step 2 – FFmpeg transcode
            scale_filter = f"scale={cfg['width']}:{cfg['height']}:force_original_aspect_ratio=decrease,pad={cfg['width']}:{cfg['height']}:(ow-iw)/2:(oh-ih)/2"
            cmd = [
                os.environ.get("FFMPEG_PATH", "ffmpeg"), "-y",
                "-i", input_path,
                "-vf", scale_filter,
                "-c:v", "libx264",
                "-b:v", cfg["video_bitrate"],
                "-c:a", "aac",
                "-b:a", cfg["audio_bitrate"],
                "-movflags", "+faststart",
                "-preset", "medium",
                output_path,
            ]
            _run_ffmpeg(cmd, job_id)
            _update_job(job_id, progress=80)
            self.update_state(state="PROGRESS", meta={"progress": 80})

            # Step 3 – Upload to S3
            s3_key = f"processed/{video_id}/{profile}.mp4"
            download_url = _upload_to_s3(output_path, processed_bucket, s3_key)
            output_size = os.path.getsize(output_path)

        processing_time = time.time() - start
        _update_job(
            job_id,
            status="completed",
            progress=100,
            s3_output_key=s3_key,
            download_url=download_url,
            streaming_url=download_url,
            output_file_size=output_size,
            processing_time=processing_time,
            completed_at=datetime.now(timezone.utc),
        )
        logger.info(f"[Job {job_id}] Completed in {processing_time:.1f}s → {download_url}")
        return {"status": "completed", "download_url": download_url}

    except Exception as exc:
        logger.exception(f"[Job {job_id}] Failed: {exc}")
        _update_job(job_id, status="failed", error_message=str(exc), progress=0)
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, name="tasks.extract_audio", max_retries=2)
def extract_audio(self, job_id: str, video_id: str, audio_format: str):
    """Extract audio track from source video in AAC or MP3 format."""
    import boto3
    import tempfile

    audio_profiles = {
        "aac": {"codec": "aac",          "bitrate": "192k", "ext": "m4a"},
        "mp3": {"codec": "libmp3lame",   "bitrate": "320k", "ext": "mp3"},
    }

    _update_job(job_id, status="running", started_at=datetime.now(timezone.utc), progress=5)
    start = time.time()

    try:
        from app.models import Video

        video = Video.query.get(video_id)
        cfg = audio_profiles[audio_format]
        raw_bucket = os.environ.get("S3_RAW_BUCKET")
        processed_bucket = os.environ.get("S3_PROCESSED_BUCKET")
        region = os.environ.get("AWS_REGION", "eu-west-1")
        s3 = boto3.client("s3", region_name=region)

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input_video")
            output_path = os.path.join(tmpdir, f"audio.{cfg['ext']}")

            s3.download_file(raw_bucket, video.s3_raw_key, input_path)
            _update_job(job_id, progress=30)

            cmd = [
                os.environ.get("FFMPEG_PATH", "ffmpeg"), "-y",
                "-i", input_path,
                "-vn",                          # No video
                "-c:a", cfg["codec"],
                "-b:a", cfg["bitrate"],
                output_path,
            ]
            _run_ffmpeg(cmd, job_id)
            _update_job(job_id, progress=75)

            s3_key = f"processed/{video_id}/audio.{cfg['ext']}"
            download_url = _upload_to_s3(output_path, processed_bucket, s3_key)
            output_size = os.path.getsize(output_path)

        _update_job(
            job_id,
            status="completed", progress=100,
            s3_output_key=s3_key,
            download_url=download_url,
            output_file_size=output_size,
            processing_time=time.time() - start,
            completed_at=datetime.now(timezone.utc),
        )
        return {"status": "completed", "download_url": download_url}

    except Exception as exc:
        _update_job(job_id, status="failed", error_message=str(exc))
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, name="tasks.generate_hls", max_retries=2)
def generate_hls(self, job_id: str, video_id: str):
    """
    Generate HLS (HTTP Live Streaming) package with adaptive bitrate:
    master.m3u8 + per-rendition .m3u8 + .ts segments.
    """
    import boto3
    import tempfile
    import glob

    _update_job(job_id, status="running", started_at=datetime.now(timezone.utc), progress=5)
    start = time.time()

    try:
        from app.models import Video

        video = Video.query.get(video_id)
        raw_bucket = os.environ.get("S3_RAW_BUCKET")
        processed_bucket = os.environ.get("S3_PROCESSED_BUCKET")
        region = os.environ.get("AWS_REGION", "eu-west-1")
        s3 = boto3.client("s3", region_name=region)

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input_video")
            hls_dir = os.path.join(tmpdir, "hls")
            os.makedirs(hls_dir)

            s3.download_file(raw_bucket, video.s3_raw_key, input_path)
            _update_job(job_id, progress=20)

            # Multi-bitrate HLS with ABR ladder
            cmd = [
                os.environ.get("FFMPEG_PATH", "ffmpeg"), "-y",
                "-i", input_path,
                "-filter_complex",
                "[0:v]split=3[v1][v2][v3];"
                "[v1]scale=1280:720[v1out];"
                "[v2]scale=854:480[v2out];"
                "[v3]scale=640:360[v3out]",
                # 720p
                "-map", "[v1out]", "-map", "0:a",
                "-c:v:0", "libx264", "-b:v:0", "2500k",
                "-c:a:0", "aac", "-b:a:0", "128k",
                # 480p
                "-map", "[v2out]", "-map", "0:a",
                "-c:v:1", "libx264", "-b:v:1", "1000k",
                "-c:a:1", "aac", "-b:a:1", "96k",
                # 360p
                "-map", "[v3out]", "-map", "0:a",
                "-c:v:2", "libx264", "-b:v:2", "600k",
                "-c:a:2", "aac", "-b:a:2", "64k",
                "-f", "hls",
                "-hls_time", "6",
                "-hls_playlist_type", "vod",
                "-hls_flags", "independent_segments",
                "-hls_segment_filename", os.path.join(hls_dir, "stream_%v_%03d.ts"),
                "-master_pl_name", "master.m3u8",
                "-var_stream_map", "v:0,a:0 v:1,a:1 v:2,a:2",
                os.path.join(hls_dir, "stream_%v.m3u8"),
            ]
            _run_ffmpeg(cmd, job_id)
            _update_job(job_id, progress=75)

            # Upload all HLS files to S3
            all_files = glob.glob(os.path.join(hls_dir, "**"), recursive=True)
            for local_file in all_files:
                if os.path.isfile(local_file):
                    rel = os.path.relpath(local_file, hls_dir)
                    key = f"processed/{video_id}/hls/{rel}"
                    s3.upload_file(local_file, processed_bucket, key,
                                   ExtraArgs={"ContentType": _content_type(local_file)})

            master_key = f"processed/{video_id}/hls/master.m3u8"
            cdn_base = os.environ.get("CDN_BASE_URL", "")
            if cdn_base:
                streaming_url = f"{cdn_base.rstrip('/')}/{master_key}"
            else:
                streaming_url = f"https://{processed_bucket}.s3.{region}.amazonaws.com/{master_key}"

        _update_job(
            job_id,
            status="completed", progress=100,
            s3_output_key=master_key,
            download_url=streaming_url,
            streaming_url=streaming_url,
            processing_time=time.time() - start,
            completed_at=datetime.now(timezone.utc),
        )
        return {"status": "completed", "streaming_url": streaming_url}

    except Exception as exc:
        _update_job(job_id, status="failed", error_message=str(exc))
        raise self.retry(exc=exc, countdown=60)
