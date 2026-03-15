interface ProgressBarProps {
  progress: number
  status: string
  showLabel?: boolean
  height?: number
}

export default function ProgressBar({ progress, status, showLabel = true, height = 6 }: ProgressBarProps) {
  const getColor = () => {
    if (status === 'completed') return 'linear-gradient(90deg, #22c55e, #4ade80)'
    if (status === 'failed')    return 'linear-gradient(90deg, #dc2626, #f87171)'
    if (status === 'cancelled') return 'linear-gradient(90deg, #7c3aed, #a78bfa)'
    return 'linear-gradient(90deg, #3b6ef6, #22d3ee, #3b6ef6)'
  }

  const isAnimated = status === 'running' || status === 'processing'

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height, background: '#1c2540' }}
      >
        <div
          className={isAnimated ? 'progress-bar' : ''}
          style={{
            height: '100%',
            width: `${Math.max(progress, status === 'running' ? 5 : 0)}%`,
            background: isAnimated ? undefined : getColor(),
            backgroundSize: isAnimated ? '200% auto' : undefined,
            transition: 'width 0.4s ease',
            borderRadius: 'inherit',
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono w-10 text-right" style={{ color: '#8899bb' }}>
          {progress}%
        </span>
      )}
    </div>
  )
}
