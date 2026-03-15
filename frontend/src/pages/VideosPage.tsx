import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Film, Trash2, Eye, Clock, HardDrive, ChevronRight, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVideos, usePolling } from '../hooks/useApi'
import { videosApi } from '../services/api'
import StatusBadge from '../components/Jobs/StatusBadge'
import { formatDate, formatBytes } from '../utils/helpers'

export default function VideosPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const { data, loading, refetch } = useVideos(page, statusFilter || undefined)

  usePolling(refetch, 6000, true)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its transcoded outputs?`)) return
    try {
      await videosApi.delete(id)
      toast.success('Video deleted')
      refetch()
    } catch {
      toast.error('Delete failed')
    }
  }

  const videos = data?.videos ?? []
  const filtered = search
    ? videos.filter(v => v.filename.toLowerCase().includes(search.toLowerCase()))
    : videos

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#4a5680' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search videos…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#0f1420', border: '1px solid #1c2540', color: '#e8edf8' }}
          />
        </div>

        {['', 'queued', 'processing', 'completed', 'failed'].map(s => (
          <button key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: statusFilter === s ? 'rgba(59,110,246,0.15)' : '#0f1420',
              border: `1px solid ${statusFilter === s ? 'rgba(59,110,246,0.4)' : '#1c2540'}`,
              color: statusFilter === s ? '#e8edf8' : '#8899bb',
            }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Videos grid */}
      {loading ? (
        <div className="text-center py-16" style={{ color: '#4a5680' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
          <Film size={40} className="mx-auto mb-3" style={{ color: '#1c2540' }} />
          <p className="text-sm" style={{ color: '#4a5680' }}>No videos found</p>
          <Link to="/upload" className="inline-block mt-4 px-4 py-2 rounded-lg text-sm text-white font-medium"
            style={{ background: 'rgba(59,110,246,0.2)', border: '1px solid rgba(59,110,246,0.3)' }}>
            Upload your first video
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(video => (
            <div key={video.id}
              className="rounded-xl p-5 flex items-center gap-5 transition-all card-glow"
              style={{ background: '#0f1420', border: '1px solid #1c2540' }}>

              {/* Thumbnail placeholder */}
              <div className="w-20 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#151c2e', border: '1px solid #1c2540' }}>
                <Film size={20} style={{ color: '#4a5680' }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{video.filename}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#4a5680' }}>
                    <HardDrive size={11} />
                    {video.file_size_mb} MB
                  </span>
                  {video.duration_formatted && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#4a5680' }}>
                      <Clock size={11} />
                      {video.duration_formatted}
                    </span>
                  )}
                  {video.resolution && (
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                      style={{ background: '#151c2e', color: '#8899bb' }}>
                      {video.resolution}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: '#4a5680' }}>
                    {formatDate(video.uploaded_at)}
                  </span>
                </div>
              </div>

              {/* Jobs summary */}
              {video.jobs_summary && (
                <div className="text-xs font-mono text-right" style={{ color: '#4a5680' }}>
                  <div style={{ color: '#4ade80' }}>{video.jobs_summary.completed} done</div>
                  {video.jobs_summary.running > 0 && (
                    <div style={{ color: '#22d3ee' }}>{video.jobs_summary.running} running</div>
                  )}
                </div>
              )}

              <StatusBadge status={video.status} />

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link to={`/videos/${video.id}`}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#8899bb' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#3b6ef6')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#8899bb')}>
                  <Eye size={15} />
                </Link>
                <button
                  onClick={() => handleDelete(video.id, video.filename)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#8899bb' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#8899bb')}>
                  <Trash2 size={15} />
                </button>
                <Link to={`/videos/${video.id}`}
                  className="p-2 rounded-lg"
                  style={{ color: '#4a5680' }}>
                  <ChevronRight size={15} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(data?.pages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
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
