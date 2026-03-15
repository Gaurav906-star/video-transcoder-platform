import os
from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_UPLOAD_SIZE_GB", 10)) * 1024 * 1024 * 1024

    # Redis / Celery
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

    # AWS S3
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
    AWS_REGION = os.environ.get("AWS_REGION", "eu-west-1")
    S3_RAW_BUCKET = os.environ.get("S3_RAW_BUCKET", "transcoding-raw-videos")
    S3_PROCESSED_BUCKET = os.environ.get("S3_PROCESSED_BUCKET", "transcoding-processed-videos")
    CDN_BASE_URL = os.environ.get("CDN_BASE_URL", "")

    # FFmpeg
    FFMPEG_PATH = os.environ.get("FFMPEG_PATH", "ffmpeg")
    FFPROBE_PATH = os.environ.get("FFPROBE_PATH", "ffprobe")

    # Allowed video extensions
    ALLOWED_EXTENSIONS = set(
        os.environ.get("ALLOWED_EXTENSIONS", "mp4,mov,avi,mkv,wmv,flv,webm,m4v").split(",")
    )

    # Transcoding profiles
    TRANSCODE_PROFILES = {
        "1080p": {"width": 1920, "height": 1080, "video_bitrate": "5000k", "audio_bitrate": "192k", "crf": 22},
        "720p":  {"width": 1280, "height": 720,  "video_bitrate": "2500k", "audio_bitrate": "128k", "crf": 23},
        "480p":  {"width": 854,  "height": 480,  "video_bitrate": "1000k", "audio_bitrate": "96k",  "crf": 24},
        "360p":  {"width": 640,  "height": 360,  "video_bitrate": "600k",  "audio_bitrate": "64k",  "crf": 25},
    }

    AUDIO_PROFILES = {
        "aac": {"codec": "aac", "bitrate": "192k", "ext": "m4a"},
        "mp3": {"codec": "libmp3lame", "bitrate": "320k", "ext": "mp3"},
    }


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://postgres:password@localhost:5432/transcoding_db"
    )


class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
