export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatSecondsToTime(s: number | null): string {
  if (!s) return '—'
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

export const STATUS_COLORS: Record<string, string> = {
  pending:    'text-[#8899bb] bg-[#1c2540]',
  running:    'text-[#22d3ee] bg-[#0d2535]',
  completed:  'text-[#4ade80] bg-[#0d2518]',
  failed:     'text-[#f87171] bg-[#2a1010]',
  cancelled:  'text-[#a78bfa] bg-[#1a1030]',
  queued:     'text-[#fbbf24] bg-[#2a2010]',
  uploaded:   'text-[#8899bb] bg-[#1c2540]',
  processing: 'text-[#22d3ee] bg-[#0d2535]',
}

export const PROFILE_COLORS: Record<string, string> = {
  '1080p':  '#3b6ef6',
  '720p':   '#22d3ee',
  '480p':   '#4ade80',
  '360p':   '#fbbf24',
  'aac':    '#a78bfa',
  'mp3':    '#f87171',
  'hls':    '#fb923c',
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
