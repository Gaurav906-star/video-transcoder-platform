import { STATUS_COLORS } from '../../utils/helpers'

interface StatusBadgeProps {
  status: string
  className?: string
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Pending',
  running:    'Running',
  completed:  'Completed',
  failed:     'Failed',
  cancelled:  'Cancelled',
  queued:     'Queued',
  uploaded:   'Uploaded',
  processing: 'Processing',
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? 'text-gray-400 bg-gray-800'
  const isRunning = status === 'running' || status === 'processing'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium font-mono ${colorClass} ${className}`}
    >
      {isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {!isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
