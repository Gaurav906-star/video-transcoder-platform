import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Types ───────────────────────────────────────────────────
export interface Video {
  id: string
  filename: string
  file_size_mb: number
  duration: number | null
  duration_formatted: string | null
  resolution: string | null
  fps: number | null
  codec: string | null
  status: 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed'
  uploaded_at: string
  completed_at: string | null
  jobs_summary?: { total: number; completed: number; running: number; failed: number }
  jobs?: TranscodeJob[]
}

export interface TranscodeJob {
  id: string
  video_id: string
  celery_task_id: string | null
  job_type: 'video' | 'audio' | 'hls'
  profile: string
  output_format: string | null
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  download_url: string | null
  streaming_url: string | null
  error_message: string | null
  output_file_size_mb: number | null
  processing_time: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface AnalyticsOverview {
  total_videos: number
  total_jobs: number
  completed_jobs: number
  running_jobs: number
  failed_jobs: number
  success_rate: number
  total_raw_gb: number
  total_processed_gb: number
  avg_processing_seconds: number
}

export interface JobStats {
  by_status: Record<string, number>
  avg_processing_time_seconds: number
  total_output_gb: number
}

// ── Videos ──────────────────────────────────────────────────
export const videosApi = {
  list: (page = 1, status?: string) =>
    api.get('/videos/', { params: { page, per_page: 20, status } }),

  get: (id: string) => api.get(`/videos/${id}`),

  upload: (
    file: File,
    options: { profiles: string[]; extract_audio: boolean; generate_hls: boolean },
    onProgress?: (pct: number) => void
  ) => {
    const form = new FormData()
    form.append('file', file)
    form.append('profiles', options.profiles.join(','))
    form.append('extract_audio', String(options.extract_audio))
    form.append('generate_hls', String(options.generate_hls))
    return api.post('/videos/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
  },

  delete: (id: string) => api.delete(`/videos/${id}`),
}

// ── Jobs ────────────────────────────────────────────────────
export const jobsApi = {
  list: (page = 1, status?: string, job_type?: string) =>
    api.get('/jobs/', { params: { page, per_page: 30, status, job_type } }),

  get: (id: string) => api.get(`/jobs/${id}`),

  cancel: (id: string) => api.post(`/jobs/${id}/cancel`),

  stats: () => api.get('/jobs/stats'),
}

// ── Analytics ───────────────────────────────────────────────
export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  jobsOverTime: () => api.get('/analytics/jobs-over-time'),
  profileDistribution: () => api.get('/analytics/profile-distribution'),
  processingTimes: () => api.get('/analytics/processing-times'),
}

// ── Health ──────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health/ready'),
}

export default api
