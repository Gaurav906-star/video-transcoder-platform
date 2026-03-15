# 🎬 Cloud-Based Video Transcoding Platform

**Module:** Scalable Cloud Programming — MSc in Cloud Computing
**Student:** Gaurav Kumar | **Roll No:** 24250279

---

## Project Overview

A production-grade, cloud-native video transcoding platform that converts high-resolution master video files into multiple output formats, resolutions, and streaming packages. Built to demonstrate scalable cloud architecture using message queues, distributed workers, object storage, and real-time monitoring.

### Key Capabilities

| Feature | Details |
|---|---|
| **Multi-resolution transcoding** | 1080p · 720p · 480p · 360p MP4 via FFmpeg |
| **HLS streaming** | Adaptive bitrate `.m3u8` + `.ts` segments (ABR ladder) |
| **Audio extraction** | AAC (M4A) and MP3 formats |
| **Cloud storage** | AWS S3 (or MinIO locally) for raw + processed files |
| **Task queue** | Redis + Celery for async, distributed job processing |
| **Auto-scaling** | Multiple Celery worker replicas via Docker Compose |
| **Live monitoring** | Flower dashboard + Prometheus metrics |
| **Analytics** | Recharts dashboards for job throughput and performance |

---

## Architecture

```
Production House / Users
         │
         ▼
      Nginx  (reverse proxy, 10 GB upload limit)
         │
         ▼
    Flask API  (REST — /api/videos, /api/jobs, /api/analytics)
         │
         ▼
  Cloud Storage (S3 / MinIO — raw videos)
         │
         ▼
    Redis Queue  (Celery broker)
         │
         ▼
  Celery Workers  (FFmpeg)
  ├─ transcode_video  → 1080p / 720p / 480p / 360p MP4
  ├─ generate_hls     → ABR m3u8 + TS segments
  └─ extract_audio    → AAC / MP3
         │
         ▼
  Processed Storage  (S3 / MinIO — outputs)
         │
         ▼
  CDN / Streaming  → End Users
         │
         ▼
  PostgreSQL  ← PlaybackLogs → Analytics → Grafana / Recharts
```

---

## Project Structure

```
video-transcoding-platform/
├── backend/                        # Flask API + Celery workers
│   ├── app/
│   │   ├── __init__.py             # App factory (Flask + extensions)
│   │   ├── config.py               # Dev / Prod / Test config
│   │   ├── api/
│   │   │   ├── videos.py           # Upload, list, delete endpoints
│   │   │   ├── jobs.py             # Job status, cancel, stats
│   │   │   ├── analytics.py        # Metrics endpoints
│   │   │   └── health.py           # Liveness + readiness probes
│   │   ├── models/
│   │   │   └── __init__.py         # SQLAlchemy models (Video, TranscodeJob, PlaybackLog)
│   │   ├── services/
│   │   │   └── storage.py          # S3 upload/download + FFprobe
│   │   └── workers/
│   │       └── tasks.py            # Celery tasks: transcode, audio, HLS
│   ├── tests/
│   │   └── test_api.py             # Pytest test suite
│   ├── run.py                      # Flask entry point
│   ├── celery_worker.py            # Celery entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                       # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx                 # Router + layout
│   │   ├── main.tsx
│   │   ├── index.css               # Dark theme CSS variables
│   │   ├── services/
│   │   │   └── api.ts              # Axios API client + TypeScript types
│   │   ├── hooks/
│   │   │   └── useApi.ts           # Data-fetching + polling hooks
│   │   ├── utils/
│   │   │   └── helpers.ts          # Formatters, colour maps
│   │   ├── components/
│   │   │   ├── Layout/             # Sidebar, Header
│   │   │   ├── Dashboard/          # StatCard
│   │   │   ├── Upload/             # UploadZone (drag-and-drop)
│   │   │   └── Jobs/               # StatusBadge, ProgressBar
│   │   └── pages/
│   │       ├── DashboardPage.tsx   # KPIs + live jobs feed
│   │       ├── UploadPage.tsx      # Upload UI
│   │       ├── VideosPage.tsx      # Video library
│   │       ├── VideoDetailPage.tsx # Per-video job breakdown
│   │       ├── JobsPage.tsx        # Full jobs queue table
│   │       └── AnalyticsPage.tsx   # Recharts analytics
│   ├── Dockerfile
│   ├── nginx.conf                  # SPA routing
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── docker-compose.yml              # Full stack: Postgres, Redis, MinIO, API, Worker, Frontend, Nginx
└── nginx.conf                      # Reverse proxy config
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose v2+
- (Optional for local dev) Python 3.12+, Node.js 20+, FFmpeg

### 1. Quick Start (Docker Compose)

```bash
# Clone / copy the project
cd video-transcoding-platform

# Copy environment template
cp backend/.env.example backend/.env

# Start all services
docker compose up --build

# Run DB migrations
docker compose exec api flask db upgrade
```

Services available at:

| Service | URL |
|---|---|
| Frontend (React) | http://localhost:3000 |
| API | http://localhost:5000/api |
| Flower (worker monitor) | http://localhost:5555 |
| MinIO Console | http://localhost:9001 |

### 2. Local Development (without Docker)

**Backend:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Start PostgreSQL and Redis first, then:
flask db upgrade
python run.py

# In a second terminal — start Celery worker:
celery -A celery_worker.celery_app worker --loglevel=info --concurrency=4
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

---

## API Reference

### Videos

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/videos/` | List all videos (paginated) |
| `POST` | `/api/videos/upload` | Upload master video + queue jobs |
| `GET` | `/api/videos/:id` | Video details + all jobs |
| `DELETE` | `/api/videos/:id` | Delete video + S3 assets |

**Upload body** (`multipart/form-data`):

```
file          – video file (mp4, mov, avi, mkv, webm…)
profiles      – "1080p,720p,480p,360p"  (comma-separated)
extract_audio – "true" / "false"
generate_hls  – "true" / "false"
```

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs/` | List jobs (filter by status, type) |
| `GET` | `/api/jobs/:id` | Get job + live Celery progress |
| `POST` | `/api/jobs/:id/cancel` | Cancel pending/running job |
| `GET` | `/api/jobs/stats` | Aggregate job stats |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/overview` | Platform KPIs |
| `GET` | `/api/analytics/jobs-over-time` | Daily job counts (30d) |
| `GET` | `/api/analytics/profile-distribution` | Jobs per profile |
| `GET` | `/api/analytics/processing-times` | Avg/min/max times per profile |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health/` | Liveness probe |
| `GET` | `/api/health/ready` | Readiness probe (DB + Redis) |

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v --tb=short
```

---

## Scaling Workers

To scale Celery workers (e.g. during high upload volume):

```bash
docker compose up --scale worker=5
```

Each worker processes one FFmpeg job at a time (`prefetch_multiplier=1`) to avoid CPU contention. Workers are stateless and connect to the shared Redis queue.

---

## Environment Variables

See `backend/.env.example` for the full list. Key variables:

```
DATABASE_URL          – PostgreSQL connection string
REDIS_URL             – Redis for Celery broker
AWS_ACCESS_KEY_ID     – S3 credentials
S3_RAW_BUCKET         – Bucket for uploaded master videos
S3_PROCESSED_BUCKET   – Bucket for transcoded outputs
CDN_BASE_URL          – Optional CDN prefix for output URLs
FFMPEG_PATH           – Path to ffmpeg binary (default: ffmpeg)
```

---

## Technologies Used

| Layer | Technology |
|---|---|
| API | Flask 3, Flask-SQLAlchemy, Flask-Migrate, Marshmallow |
| Task Queue | Celery 5, Redis 7 |
| Transcoding | FFmpeg (libx264, AAC, HLS) |
| Storage | AWS S3 / MinIO (boto3) |
| Database | PostgreSQL 16, SQLAlchemy 2 |
| Monitoring | Flower, Prometheus |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Charts | Recharts |
| Proxy | Nginx |
| Container | Docker, Docker Compose |

---

*MSc Cloud Computing — Scalable Cloud Programming — Gaurav Kumar (24250279)*
