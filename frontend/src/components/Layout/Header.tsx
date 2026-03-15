import { useLocation } from 'react-router-dom'
import { Bell, RefreshCw } from 'lucide-react'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':          { title: 'Dashboard', subtitle: 'Platform overview and live metrics' },
  '/upload':    { title: 'Upload Video', subtitle: 'Upload master files and configure transcoding' },
  '/videos':    { title: 'Video Library', subtitle: 'Manage your uploaded videos' },
  '/jobs':      { title: 'Jobs Queue', subtitle: 'Monitor transcoding job status' },
  '/analytics': { title: 'Analytics', subtitle: 'Performance metrics and usage statistics' },
}

export default function Header() {
  const { pathname } = useLocation()
  const meta = PAGE_TITLES[pathname] ?? { title: 'TranscodeCloud', subtitle: '' }

  return (
    <header className="h-16 px-8 flex items-center justify-between"
      style={{ borderBottom: '1px solid #1c2540', background: '#0a0d14' }}>
      <div>
        <h1 className="font-display font-semibold text-white text-lg leading-tight">
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p className="text-xs mt-0.5" style={{ color: '#4a5680' }}>{meta.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: '#0d2535', color: '#22d3ee', border: '1px solid #0e3a50' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
          Live
        </div>
      </div>
    </header>
  )
}
