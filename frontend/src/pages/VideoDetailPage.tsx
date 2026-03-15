import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Play, Film, Clock, HardDrive, Cpu, RefreshCw } from 'lucide-react'
import { useVideo, usePolling } from '../hooks/useApi'
import StatusBadge from '../components/Jobs/StatusBadge'
import ProgressBar from '../components/Jobs/ProgressBar'
import { formatDate, formatSecondsToTime, PROFILE_COLORS } from '../utils/helpers'

const JOB_TYPE_ICON: Record<string, string> = {
  video: '🎬',
  audio: '🎵',
  hls:   '📡',
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: video, loading, refetch } = useVideo(id!)

  // Refresh while any job is still running
  const hasRunning = video?.jobs?.some(j => j.status === 'running' || j.status === 'pending') ?? false
  usePolling(refetch, 3000, hasRunning)

  if (loading) return (
    <div className="text-center py-24" style={{ color: '#4a5680' }}>Loading video details…</div>
  )
  if (!video) return (
    <div className="text-center py-24" style={{ color: '#f87171' }}>Video not found</div>
  )

  const videoJobs  = video.jobs?.filter(j => j.job_type === 'video')  ?? []
  const audioJobs  = video.jobs?.filter(j => j.job_type === 'audio')  ?? []
  const hlsJobs    = video.jobs?.filter(j => j.job_type === 'hls')    ?? []

  const renderJobRow = (job: any) => (
    <div key={job.id}
      className="rounded-lg p-4 transition-all"
      style={{ background: '#151c2e', border: '1px solid #1c2540' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>{JOB_TYPE_ICON[job.job_type]}</span>
          <span className="font-mono text-sm font-semibold"
            style={{ color: PROFILE_COLORS[job.profile] ?? '#3b6ef6' }}>
            {job.profile.toUpperCase()}
          </span>
          {job.output_format && (
            <span className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: '#1c2540', color: '#4a5680' }}>
              .{job.output_format}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {job.processing_time && (
            <span className="text-xs font-mono" style={{ color: '#4a5680' }}>
              {formatSecondsToTime(job.processing_time)}
            </span>
          )}
          <StatusBadge status={job.status} />
        </div>
      </div>

      <ProgressBar progress={job.progress} status={job.status} height={4} />

      {job.error_message && (
        <p className="text-xs mt-2 px-2 py-1.5 rounded" style={{ background: '#2a1010', color: '#f87171' }}>
          {job.error_message}
        </p>
      )}

      {job.status === 'completed' && (job.download_url || job.streaming_url) && (
        <div className="flex items-center gap-2 mt-3">
          {job.download_url && (
            <a href={job.download_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(59,110,246,0.12)', color: '#3b6ef6', border: '1px solid rgba(59,110,246,0.25)' }}>
              <Download size={12} />
              Download
              {job.output_file_size_mb && ` (${job.output_file_size_mb} MB)`}
            </a>
          )}
          {job.streaming_url && job.job_type === 'hls' && (
            <a href={job.streaming_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
              <Play size={12} />
              HLS Stream URL
            </a>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Back + header */}
      <div>
        <Link to="/videos" className="flex items-center gap-2 text-sm mb-4 transition-colors"
          style={{ color: '#8899bb' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e8edf8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8899bb')}>
          <ArrowLeft size={14} />
          Back to Videos
        </Link>

        <div className="rounded-xl p-5 flex gap-5" style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
          <div className="w-20 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#151c2e' }}>
            <Film size={22} style={{ color: '#3b6ef6' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-white text-lg truncate">{video.filename}</h2>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs" style={{ color: '#8899bb' }}>
                <HardDrive size={12} /> {video.file_size_mb} MB
              </span>
              {video.duration_formatted && (
                <span className="flex items-center gap-1 text-xs" style={{ color: '#8899bb' }}>
                  <Clock size={12} /> {video.duration_formatted}
                </span>
              )}
              {video.resolution && (
                <span className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ background: '#151c2e', color: '#22d3ee' }}>
                  {video.resolution}
                </span>
              )}
              {video.fps && (
                <span className="font-mono text-xs" style={{ color: '#4a5680' }}>{video.fps} fps</span>
              )}
              {video.codec && (
                <span className="font-mono text-xs" style={{ color: '#4a5680' }}>{video.codec}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={video.status} />
            <span className="text-xs" style={{ color: '#4a5680' }}>{formatDate(video.uploaded_at)}</span>
            {hasRunning && (
              <button onClick={refetch} className="flex items-center gap-1 text-xs"
                style={{ color: '#8899bb' }}>
                <RefreshCw size={11} className="animate-spin" /> Live
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Jobs */}
      {videoJobs.length > 0 && (
        <section>
          <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#8899bb' }}>
            🎬 <span>Video Transcodes</span>
            <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: '#1c2540', color: '#4a5680' }}>
              {videoJobs.length}
            </span>
          </h3>
          <div className="space-y-2">{videoJobs.map(renderJobRow)}</div>
        </section>
      )}

      {/* Audio Jobs */}
      {audioJobs.length > 0 && (
        <section>
          <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#8899bb' }}>
            🎵 <span>Audio Extraction</span>
          </h3>
          <div className="space-y-2">{audioJobs.map(renderJobRow)}</div>
        </section>
      )}

      {/* HLS Jobs */}
      {hlsJobs.length > 0 && (
        <section>
          <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: '#8899bb' }}>
            📡 <span>HLS Streaming Package</span>
          </h3>
          <div className="space-y-2">{hlsJobs.map(renderJobRow)}</div>
        </section>
      )}

      {(!video.jobs || video.jobs.length === 0) && (
        <div className="text-center py-12 rounded-xl" style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
          <Cpu size={32} className="mx-auto mb-3" style={{ color: '#1c2540' }} />
          <p className="text-sm" style={{ color: '#4a5680' }}>No transcoding jobs found for this video</p>
        </div>
      )}
    </div>
  )
}
