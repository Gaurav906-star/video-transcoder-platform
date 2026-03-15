import UploadZone from '../components/Upload/UploadZone'
import { Film, Zap, Music, Radio } from 'lucide-react'

const features = [
  { icon: Film,  color: '#3b6ef6', title: 'Multi-Resolution', desc: '1080p · 720p · 480p · 360p MP4' },
  { icon: Radio, color: '#22d3ee', title: 'HLS Streaming',    desc: 'Adaptive bitrate .m3u8 package' },
  { icon: Music, color: '#a78bfa', title: 'Audio Extraction', desc: 'AAC (M4A) and MP3 formats' },
  { icon: Zap,   color: '#fbbf24', title: 'Auto-Scale',       desc: 'Celery workers scale on demand' },
]

export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* Feature chips */}
      <div className="grid grid-cols-4 gap-3">
        {features.map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="rounded-xl p-4"
            style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-xs font-semibold text-white">{title}</p>
            <p className="text-xs mt-1" style={{ color: '#4a5680' }}>{desc}</p>
          </div>
        ))}
      </div>

      <UploadZone />
    </div>
  )
}
