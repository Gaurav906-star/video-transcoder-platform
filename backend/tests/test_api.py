"""
Test suite for the Video Transcoding Platform API.
Run with: pytest tests/ -v
"""

import pytest
import json
import io
from unittest.mock import patch, MagicMock
from app import create_app, db
from app.models import Video, TranscodeJob


@pytest.fixture(scope="session")
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    """Wipe tables between tests."""
    with app.app_context():
        db.session.query(TranscodeJob).delete()
        db.session.query(Video).delete()
        db.session.commit()
    yield


# ── Health ───────────────────────────────────────────────────────

class TestHealth:
    def test_liveness(self, client):
        r = client.get("/api/health/")
        assert r.status_code == 200
        assert r.get_json()["status"] == "ok"


# ── Videos ──────────────────────────────────────────────────────

class TestVideosList:
    def test_empty(self, client):
        r = client.get("/api/videos/")
        assert r.status_code == 200
        data = r.get_json()
        assert data["videos"] == []
        assert data["total"] == 0

    def test_list_returns_videos(self, app, client):
        with app.app_context():
            v = Video(
                original_filename="test.mp4", filename="test.mp4",
                file_size=1024 * 1024, s3_raw_key="raw/test.mp4",
                status="queued",
            )
            db.session.add(v)
            db.session.commit()

        r = client.get("/api/videos/")
        data = r.get_json()
        assert data["total"] == 1
        assert data["videos"][0]["filename"] == "test.mp4"

    def test_status_filter(self, app, client):
        with app.app_context():
            for status in ["queued", "completed", "failed"]:
                db.session.add(Video(
                    original_filename=f"{status}.mp4", filename=f"{status}.mp4",
                    file_size=1024, s3_raw_key=f"raw/{status}.mp4", status=status,
                ))
            db.session.commit()

        r = client.get("/api/videos/?status=completed")
        data = r.get_json()
        assert data["total"] == 1
        assert data["videos"][0]["status"] == "completed"


class TestVideoUpload:
    @patch("app.api.videos.storage")
    @patch("app.api.videos.VideoProbeService.probe")
    @patch("app.api.videos.transcode_video")
    @patch("app.api.videos.extract_audio")
    @patch("app.api.videos.generate_hls")
    def test_upload_success(self, mock_hls, mock_audio, mock_transcode, mock_probe, mock_storage, client):
        mock_storage.upload_raw_video.return_value = ("raw/uuid.mp4", 10 * 1024 * 1024)
        mock_probe.return_value = {"duration": 120.0, "width": 1920, "height": 1080, "fps": 30.0, "codec": "h264"}
        mock_transcode.delay.return_value = MagicMock(id="celery-task-1")
        mock_audio.delay.return_value = MagicMock(id="celery-task-2")
        mock_hls.delay.return_value = MagicMock(id="celery-task-3")

        data = {
            "file": (io.BytesIO(b"fake video bytes"), "movie.mp4"),
            "profiles": "720p,480p",
            "extract_audio": "true",
            "generate_hls": "false",
        }
        r = client.post("/api/videos/upload", data=data, content_type="multipart/form-data")
        assert r.status_code == 201
        resp = r.get_json()
        assert resp["video"]["filename"] == "movie.mp4"
        assert len(resp["jobs"]) > 0

    def test_upload_no_file(self, client):
        r = client.post("/api/videos/upload", data={}, content_type="multipart/form-data")
        assert r.status_code == 400

    def test_upload_invalid_extension(self, client):
        data = {"file": (io.BytesIO(b"data"), "malware.exe")}
        r = client.post("/api/videos/upload", data=data, content_type="multipart/form-data")
        assert r.status_code == 400


class TestVideoDelete:
    @patch("app.api.videos.storage")
    def test_delete_existing(self, mock_storage, app, client):
        with app.app_context():
            v = Video(original_filename="d.mp4", filename="d.mp4",
                      file_size=100, s3_raw_key="raw/d.mp4", status="completed")
            db.session.add(v)
            db.session.commit()
            vid = v.id

        r = client.delete(f"/api/videos/{vid}")
        assert r.status_code == 200

    def test_delete_nonexistent(self, client):
        r = client.delete("/api/videos/nonexistent-id")
        assert r.status_code == 404


# ── Jobs ────────────────────────────────────────────────────────

class TestJobs:
    def _seed_video_and_job(self, app, status="running"):
        with app.app_context():
            v = Video(original_filename="v.mp4", filename="v.mp4",
                      file_size=512, s3_raw_key="raw/v.mp4", status="processing")
            db.session.add(v)
            db.session.flush()
            j = TranscodeJob(video_id=v.id, job_type="video",
                             profile="720p", output_format="mp4", status=status)
            db.session.add(j)
            db.session.commit()
            return v.id, j.id

    def test_list_jobs(self, app, client):
        self._seed_video_and_job(app)
        r = client.get("/api/jobs/")
        assert r.status_code == 200
        assert r.get_json()["total"] == 1

    def test_job_stats(self, app, client):
        self._seed_video_and_job(app, status="completed")
        r = client.get("/api/jobs/stats")
        assert r.status_code == 200
        data = r.get_json()
        assert "by_status" in data

    def test_cancel_running_job(self, app, client):
        _, job_id = self._seed_video_and_job(app, status="running")
        with patch("app.api.jobs.celery_app") as mock_celery:
            r = client.post(f"/api/jobs/{job_id}/cancel")
        assert r.status_code == 200

    def test_cancel_completed_job_fails(self, app, client):
        _, job_id = self._seed_video_and_job(app, status="completed")
        r = client.post(f"/api/jobs/{job_id}/cancel")
        assert r.status_code == 400


# ── Analytics ────────────────────────────────────────────────────

class TestAnalytics:
    def test_overview_empty(self, client):
        r = client.get("/api/analytics/overview")
        assert r.status_code == 200
        data = r.get_json()
        assert data["total_videos"] == 0
        assert data["success_rate"] == 0

    def test_profile_distribution(self, client):
        r = client.get("/api/analytics/profile-distribution")
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)

    def test_jobs_over_time(self, client):
        r = client.get("/api/analytics/jobs-over-time")
        assert r.status_code == 200
        assert isinstance(r.get_json(), list)
