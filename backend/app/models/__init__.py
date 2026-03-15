"""
SQLAlchemy models for the Video Transcoding Platform.
"""

import uuid
from datetime import datetime, timezone
from app import db


def utcnow():
    return datetime.now(timezone.utc)


class Video(db.Model):
    """Represents an uploaded master video file."""
    __tablename__ = "videos"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = db.Column(db.String(512), nullable=False)
    original_filename = db.Column(db.String(512), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False)         # bytes
    duration = db.Column(db.Float, nullable=True)               # seconds
    width = db.Column(db.Integer, nullable=True)
    height = db.Column(db.Integer, nullable=True)
    fps = db.Column(db.Float, nullable=True)
    codec = db.Column(db.String(64), nullable=True)
    s3_raw_key = db.Column(db.String(1024), nullable=False)
    status = db.Column(
        db.Enum("uploaded", "queued", "processing", "completed", "failed", name="video_status"),
        nullable=False,
        default="uploaded"
    )
    uploaded_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Relationships
    jobs = db.relationship("TranscodeJob", back_populates="video", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.original_filename,
            "file_size": self.file_size,
            "file_size_mb": round(self.file_size / (1024 * 1024), 2),
            "duration": self.duration,
            "duration_formatted": self._format_duration(self.duration),
            "resolution": f"{self.width}x{self.height}" if self.width else None,
            "fps": self.fps,
            "codec": self.codec,
            "status": self.status,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }

    @staticmethod
    def _format_duration(seconds):
        if seconds is None:
            return None
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        return f"{h:02d}:{m:02d}:{s:02d}"


class TranscodeJob(db.Model):
    """Represents a single transcoding job (one resolution / format / audio)."""
    __tablename__ = "transcode_jobs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = db.Column(db.String(36), db.ForeignKey("videos.id"), nullable=False, index=True)
    celery_task_id = db.Column(db.String(255), nullable=True, index=True)

    job_type = db.Column(
        db.Enum("video", "audio", "hls", name="job_type"),
        nullable=False,
        default="video"
    )
    profile = db.Column(db.String(64), nullable=False)   # e.g. "720p", "aac", "hls"
    output_format = db.Column(db.String(16), nullable=True)  # "mp4", "m3u8", "mp3", "m4a"

    status = db.Column(
        db.Enum("pending", "running", "completed", "failed", "cancelled", name="job_status"),
        nullable=False,
        default="pending"
    )

    progress = db.Column(db.Integer, default=0)          # 0-100
    s3_output_key = db.Column(db.String(1024), nullable=True)
    download_url = db.Column(db.String(2048), nullable=True)
    streaming_url = db.Column(db.String(2048), nullable=True)

    error_message = db.Column(db.Text, nullable=True)
    output_file_size = db.Column(db.BigInteger, nullable=True)
    processing_time = db.Column(db.Float, nullable=True)  # seconds

    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    started_at = db.Column(db.DateTime(timezone=True), nullable=True)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Relationships
    video = db.relationship("Video", back_populates="jobs")

    def to_dict(self):
        return {
            "id": self.id,
            "video_id": self.video_id,
            "celery_task_id": self.celery_task_id,
            "job_type": self.job_type,
            "profile": self.profile,
            "output_format": self.output_format,
            "status": self.status,
            "progress": self.progress,
            "download_url": self.download_url,
            "streaming_url": self.streaming_url,
            "error_message": self.error_message,
            "output_file_size": self.output_file_size,
            "output_file_size_mb": round(self.output_file_size / (1024 * 1024), 2) if self.output_file_size else None,
            "processing_time": self.processing_time,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class PlaybackLog(db.Model):
    """Tracks video playback events for analytics."""
    __tablename__ = "playback_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    video_id = db.Column(db.String(36), db.ForeignKey("videos.id"), nullable=False, index=True)
    job_id = db.Column(db.String(36), db.ForeignKey("transcode_jobs.id"), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    ip_address = db.Column(db.String(64), nullable=True)
    resolution = db.Column(db.String(16), nullable=True)
    bytes_served = db.Column(db.BigInteger, default=0)
    timestamp = db.Column(db.DateTime(timezone=True), default=utcnow, index=True)
