import { Film, CheckCircle, Loader2, AlertCircle, HardDrive, Clock, Activity, Zap } from 'lucide-react'
import { useAnalytics, useJobStats, useJobs, usePolling } from '../hooks/useApi'
import StatCard from '../components/Dashboard/StatCard'
import StatusBadge from '../components/Jobs/StatusBadge'
import ProgressBar from '../components/Jobs/ProgressBar'
import { formatDate, formatSecondsToTime, PROFILE_COLORS } from '../utils/helpers'

export default function DashboardPage() {
  const { data: analytics, refetch: refetchAnalytics } = useAnalytics()
  const { data: stats } = useJobStats()
  const { data: jobsData, refetch: refetchJobs } = useJobs(1, undefined, undefined)

  // Poll for live updates every 5s
  usePolling(() => { refetchAnalytics(); refetchJobs() }, 5000, true)

  const recentJobs = jobsData?.jobs?.slice(0, 8) ?? []

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Videos"
          value={analytics?.total_videos ?? '—'}
          subtitle="Master files uploaded"
          icon={Film}
          color="#3b6ef6"
        />
        <StatCard
          title="Completed Jobs"
          value={analytics?.completed_jobs ?? '—'}
          subtitle={`${analytics?.success_rate ?? 0}% success rate`}
          icon={CheckCircle}
          color="#4ade80"
        />
        <StatCard
          title="Running Jobs"
          value={analytics?.running_jobs ?? 0}
          subtitle="Active worker tasks"
          icon={Loader2}
          color="#22d3ee"
        />
        <StatCard
          title="Avg. Process Time"
          value={formatSecondsToTime(analytics?.avg_processing_seconds ?? null)}
          subtitle="Per transcode job"
          icon={Clock}
          color="#fbbf24"
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Raw Storage"
          value={`${analytics?.total_raw_gb ?? 0} GB`}
          subtitle="Uploaded master files"
          icon={HardDrive}
          color="#a78bfa"
        />
        <StatCard
          title="Processed Output"
          value={`${analytics?.total_processed_gb ?? 0} GB`}
          subtitle="All transcoded outputs"
          icon={Zap}
          color="#fb923c"
        />
        <StatCard
          title="Failed Jobs"
          value={analytics?.failed_jobs ?? 0}
          subtitle="Require attention"
          icon={AlertCircle}
          color="#f87171"
        />
      </div>

      {/* Recent Jobs table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1c2540' }}>
          <div className="flex items-center gap-2">
            <Activity size={16} style={{ color: '#3b6ef6' }} />
            <h2 className="font-display font-semibold text-white text-sm">Recent Jobs</h2>
          </div>
          <span className="text-xs" style={{ color: '#4a5680' }}>Auto-refreshes every 5s</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #1c2540' }}>
              {['Profile', 'Type', 'Status', 'Progress', 'Processing Time', 'Started'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: '#4a5680' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: '#4a5680' }}>
                  No jobs yet — upload a video to get started
                </td>
              </tr>
            ) : recentJobs.map(job => (
              <tr key={job.id} className="transition-colors"
                style={{ borderBottom: '1px solid #0f1420' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#151c2e')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td className="px-6 py-3">
                  <span className="font-mono text-xs px-2 py-1 rounded"
                    style={{ background: `${PROFILE_COLORS[job.profile] ?? '#3b6ef6'}18`,
                             color: PROFILE_COLORS[job.profile] ?? '#3b6ef6' }}>
                    {job.profile}
                  </span>
                </td>
                <td className="px-6 py-3 font-mono text-xs" style={{ color: '#8899bb' }}>
                  {job.job_type}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-6 py-3 w-40">
                  <ProgressBar progress={job.progress} status={job.status} />
                </td>
                <td className="px-6 py-3 font-mono text-xs" style={{ color: '#8899bb' }}>
                  {formatSecondsToTime(job.processing_time)}
                </td>
                <td className="px-6 py-3 text-xs" style={{ color: '#4a5680' }}>
                  {formatDate(job.started_at ?? job.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Architecture diagram note */}
      <div className="rounded-xl p-5" style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
        <h3 className="font-display font-semibold text-sm mb-3" style={{ color: '#8899bb' }}>
          Platform Architecture
        </h3>
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap" style={{ color: '#4a5680' }}>
          {[
            'Nginx',
            '→',
            'Flask API',
            '→',
            'S3 Raw Storage',
            '→',
            'Redis Queue',
            '→',
            'Celery Workers (FFmpeg)',
            '→',
            'S3 Processed',
            '→',
            'CDN / HLS',
          ].map((node, i) => (
            <span key={i}
              style={node !== '→' ? { color: '#3b6ef6', background: 'rgba(59,110,246,0.1)',
                padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(59,110,246,0.2)' } : {}}>
              {node}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
