"""
AWS S3 storage service for uploading raw and processed video files.
"""

import os
import uuid
import boto3
import ffmpeg
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class StorageService:
    """Handles all S3 interactions for the transcoding platform."""

    def __init__(self):
        region = os.environ.get("AWS_REGION", "eu-west-1")
        self.s3 = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        )
        self.raw_bucket = os.environ.get("S3_RAW_BUCKET", "transcoding-raw-videos")
        self.processed_bucket = os.environ.get("S3_PROCESSED_BUCKET", "transcoding-processed-videos")
        self.region = region

    def upload_raw_video(self, file_obj, original_filename: str) -> tuple[str, int]:
        """
        Upload a raw master video to S3.
        Returns (s3_key, file_size_bytes).
        """
        ext = os.path.splitext(original_filename)[1].lower()
        unique_key = f"raw/{uuid.uuid4()}{ext}"
        file_obj.seek(0, 2)
        file_size = file_obj.tell()
        file_obj.seek(0)

        self.s3.upload_fileobj(
            file_obj,
            self.raw_bucket,
            unique_key,
            ExtraArgs={"ContentType": self._content_type(ext)},
        )
        logger.info(f"Uploaded raw video → s3://{self.raw_bucket}/{unique_key} ({file_size} bytes)")
        return unique_key, file_size

    def generate_presigned_download(self, bucket: str, key: str, expiry: int = 3600) -> str:
        """Generate a time-limited pre-signed download URL."""
        try:
            return self.s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=expiry,
            )
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise

    def delete_video_assets(self, video_id: str):
        """Delete all S3 objects associated with a video (raw + processed)."""
        for bucket in [self.raw_bucket, self.processed_bucket]:
            paginator = self.s3.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=bucket, Prefix=f"processed/{video_id}/"):
                objects = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
                if objects:
                    self.s3.delete_objects(Bucket=bucket, Delete={"Objects": objects})

    @staticmethod
    def _content_type(ext: str) -> str:
        return {
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".mkv": "video/x-matroska",
            ".webm": "video/webm",
        }.get(ext, "application/octet-stream")


class VideoProbeService:
    """Uses FFprobe to extract metadata from an uploaded video."""

    @staticmethod
    def probe(file_path: str) -> dict:
        """Return dict with duration, width, height, fps, codec."""
        try:
            probe = ffmpeg.probe(file_path)
            video_stream = next(
                (s for s in probe["streams"] if s["codec_type"] == "video"), None
            )
            if not video_stream:
                return {}

            fps_str = video_stream.get("r_frame_rate", "0/1")
            num, den = fps_str.split("/")
            fps = round(int(num) / int(den), 2) if int(den) else 0

            return {
                "duration": float(probe["format"].get("duration", 0)),
                "width": int(video_stream.get("width", 0)),
                "height": int(video_stream.get("height", 0)),
                "fps": fps,
                "codec": video_stream.get("codec_name"),
            }
        except Exception as e:
            logger.warning(f"FFprobe failed: {e}")
            return {}
