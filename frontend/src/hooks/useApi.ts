import { useState, useEffect, useCallback, useRef } from 'react'
import { videosApi, jobsApi, analyticsApi, Video, TranscodeJob, AnalyticsOverview } from '../services/api'

// ── Generic fetch hook ──────────────────────────────────────
export function useFetch<T>(fetchFn: () => Promise<any>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchFn()
      setData(res.data)
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => { load() }, [load])
  return { data, loading, error, refetch: load }
}

// ── Videos list with polling ────────────────────────────────
export function useVideos(page = 1, status?: string) {
  return useFetch<{ videos: Video[]; total: number; pages: number }>(
    () => videosApi.list(page, status).then(r => r),
    [page, status]
  )
}

// ── Single video details ────────────────────────────────────
export function useVideo(id: string) {
  return useFetch<Video>(() => videosApi.get(id), [id])
}

// ── Jobs list ───────────────────────────────────────────────
export function useJobs(page = 1, status?: string, job_type?: string) {
  return useFetch<{ jobs: TranscodeJob[]; total: number; pages: number }>(
    () => jobsApi.list(page, status, job_type),
    [page, status, job_type]
  )
}

// ── Job stats ───────────────────────────────────────────────
export function useJobStats() {
  return useFetch(() => jobsApi.stats(), [])
}

// ── Analytics overview ──────────────────────────────────────
export function useAnalytics() {
  return useFetch<AnalyticsOverview>(() => analyticsApi.overview(), [])
}

// ── Jobs over time ──────────────────────────────────────────
export function useJobsOverTime() {
  return useFetch<{ date: string; count: number }[]>(() => analyticsApi.jobsOverTime(), [])
}

// ── Profile distribution ────────────────────────────────────
export function useProfileDistribution() {
  return useFetch<{ profile: string; count: number }[]>(() => analyticsApi.profileDistribution(), [])
}

// ── Processing times per profile ────────────────────────────
export function useProcessingTimes() {
  return useFetch<{ profile: string; avg_seconds: number; min_seconds: number; max_seconds: number }[]>(
    () => analyticsApi.processingTimes(), []
  )
}

// ── Polling hook for live job progress ──────────────────────
export function usePolling(callback: () => void, intervalMs = 4000, active = true) {
  const savedCallback = useRef(callback)
  useEffect(() => { savedCallback.current = callback })
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => savedCallback.current(), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])
}
