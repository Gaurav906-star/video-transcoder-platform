import { useState } from 'react'
import { Link } from 'react-router-dom'
import { XCircle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useJobs, usePolling } from '../hooks/useApi'
import { jobsApi } from '../services/api'
import StatusBadge from '../components/Jobs/StatusBadge'
import ProgressBar from '../components/Jobs/ProgressBar'
import { formatDate, formatSecondsToTime, PROFILE_COLORS } from '../utils/helpers'

const STATUS_TABS = ['', 'pending', 'running', 'completed', 'failed', 'cancelled']
const TYPE_TABS = ['', 'video', 'audio', 'hls']

export default function JobsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { data, loading, refetch } = useJobs(page, statusFilter || undefined, typeFilter || undefined)

  const hasRunning = data?.jobs?.some(j => j.status === 'running') ?? false
  usePolling(refetch, 3000, hasRunning)

  const handleCancel = async (id: string) => {
    try {
      await jobsApi.cancel(id)
      toast.success('Job cancelled')
      refetch()
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to cancel')
    }
  }

  const jobs = data?.jobs ?? []

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs mr-1" style={{ color: '#4a5680' }}>Status:</span>
          {STATUS_TABS.map(s => (
            <button key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: statusFilter === s ? 'rgba(59,110,246,0.15)' : '#0f1420',
                border: `1px solid ${statusFilter === s ? 'rgba(59,110,246,0.4)' : '#1c2540'}`,
                color: statusFilter === s ? '#e8edf8' : '#8899bb',
              }}>
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-4">
          <span className="text-xs mr-1" style={{ color: '#4a5680' }}>Type:</span>
          {TYPE_TABS.map(t => (
            <button key={t}
              onClick={() => { setTypeFilter(t); setPage(1) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: typeFilter === t ? 'rgba(34,211,238,0.1)' : '#0f1420',
                border: `1px solid ${typeFilter === t ? 'rgba(34,211,238,0.3)' : '#1c2540'}`,
                color: typeFilter === t ? '#22d3ee' : '#8899bb',
              }}>
              {t || 'All'}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs font-mono" style={{ color: '#4a5680' }}>
          {data?.total ?? 0} jobs total
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1c2540' }}>
              {['Profile', 'Type', 'Video', 'Status', 'Progress', 'Time', 'Output', 'Created', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: '#4a5680' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm" style={{ color: '#4a5680' }}>Loading…</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm" style={{ color: '#4a5680' }}>No jobs found</td></tr>
            ) : jobs.map(job => (
              <tr key={job.id}
                style={{ borderBottom: '1px solid #0f1420' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#151c2e')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                <td className="px-5 py-3">
                  <span className="font-mono text-xs px-2 py-1 rounded"
                    style={{ background: `${PROFILE_COLORS[job.profile] ?? '#3b6ef6'}18`,
                             color: PROFILE_COLORS[job.profile] ?? '#3b6ef6' }}>
                    {job.profile}
                  </span>
                </td>

                <td className="px-5 py-3 font-mono text-xs" style={{ color: '#8899bb' }}>
                  {job.job_type}
                </td>

                <td className="px-5 py-3">
                  <Link to={`/videos/${job.video_id}`}
                    className="flex items-center gap-1 text-xs transition-colors"
                    style={{ color: '#4a5680' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#3b6ef6')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#4a5680')}>
                    <ExternalLink size={11} />
                    {job.video_id.slice(0, 8)}…
                  </Link>
                </td>

                <td className="px-5 py-3">
                  <StatusBadge status={job.status} />
                </td>

                <td className="px-5 py-3 w-36">
                  <ProgressBar progress={job.progress} status={job.status} height={4} />
                </td>

                <td className="px-5 py-3 font-mono text-xs" style={{ color: '#8899bb' }}>
                  {formatSecondsToTime(job.processing_time)}
                </td>

                <td className="px-5 py-3 text-xs font-mono" style={{ color: '#4a5680' }}>
                  {job.output_file_size_mb ? `${job.output_file_size_mb} MB` : '—'}
                </td>

                <td className="px-5 py-3 text-xs" style={{ color: '#4a5680' }}>
                  {formatDate(job.created_at)}
                </td>

                <td className="px-5 py-3">
                  {(job.status === 'pending' || job.status === 'running') && (
                    <button
                      onClick={() => handleCancel(job.id)}
                      className="p-1.5 rounded transition-colors"
                      title="Cancel job"
                      style={{ color: '#4a5680' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#4a5680')}>
                      <XCircle size={14} />
                    </button>
                  )}
                  {job.status === 'completed' && job.download_url && (
                    <a href={job.download_url} target="_blank" rel="noreferrer"
                      className="text-xs transition-colors"
                      style={{ color: '#3b6ef6' }}>
                      ↓
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(data?.pages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: data!.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className="w-8 h-8 rounded-lg text-sm font-mono transition-all"
              style={{
                background: page === p ? 'rgba(59,110,246,0.2)' : '#0f1420',
                border: `1px solid ${page === p ? 'rgba(59,110,246,0.4)' : '#1c2540'}`,
                color: page === p ? '#3b6ef6' : '#8899bb',
              }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
