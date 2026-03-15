import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Upload, Film, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { videosApi } from '../../services/api'
import { formatBytes } from '../../utils/helpers'

const VIDEO_PROFILES = ['1080p', '720p', '480p', '360p']

export default function UploadZone() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [selectedProfiles, setSelectedProfiles] = useState(['720p', '480p', '360p'])
  const [extractAudio, setExtractAudio] = useState(true)
  const [generateHls, setGenerateHls] = useState(true)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  const toggleProfile = (p: string) =>
    setSelectedProfiles(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )

  const handleUpload = async () => {
    if (!file || selectedProfiles.length === 0) return
    setUploading(true)
    setUploadPct(0)
    try {
      const res = await videosApi.upload(
        file,
        { profiles: selectedProfiles, extract_audio: extractAudio, generate_hls: generateHls },
        setUploadPct
      )
      setDone(true)
      toast.success(`Video uploaded! ${res.data.jobs.length} jobs queued.`)
      setTimeout(() => navigate(`/videos/${res.data.video.id}`), 1500)
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Upload failed')
      setUploading(false)
    }
  }

  // ── Dropzone area ────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">

      {/* Drop area */}
      <div
        {...getRootProps()}
        className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${isDragActive ? '#3b6ef6' : '#1c2540'}`,
          background: isDragActive ? 'rgba(59,110,246,0.06)' : '#0f1420',
        }}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,110,246,0.12)', border: '1px solid rgba(59,110,246,0.3)' }}>
              <Film size={24} style={{ color: '#3b6ef6' }} />
            </div>
            <div>
              <p className="font-display font-semibold text-white">{file.name}</p>
              <p className="text-sm mt-1" style={{ color: '#8899bb' }}>{formatBytes(file.size)}</p>
            </div>
            <button
              className="text-xs px-3 py-1 rounded-lg mt-1"
              style={{ color: '#8899bb', background: '#1c2540' }}
              onClick={e => { e.stopPropagation(); setFile(null) }}
            >
              Change file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: '#151c2e', border: '1px solid #1c2540' }}>
              <Upload size={22} style={{ color: '#4a5680' }} />
            </div>
            <div>
              <p className="font-display font-medium text-white">
                {isDragActive ? 'Drop it here!' : 'Drag & drop a video'}
              </p>
              <p className="text-sm mt-1" style={{ color: '#4a5680' }}>
                MP4, MOV, AVI, MKV, WebM — up to 10 GB
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full"
              style={{ background: '#1c2540', color: '#8899bb' }}>
              or click to browse
            </span>
          </div>
        )}
      </div>

      {/* Transcode profiles */}
      <div className="rounded-xl p-5" style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
        <h3 className="font-display font-semibold text-white text-sm mb-4">Video Resolutions</h3>
        <div className="grid grid-cols-4 gap-2">
          {VIDEO_PROFILES.map(p => {
            const active = selectedProfiles.includes(p)
            return (
              <button
                key={p}
                onClick={() => toggleProfile(p)}
                className="py-2.5 rounded-lg text-sm font-mono font-medium transition-all"
                style={{
                  background: active ? 'rgba(59,110,246,0.15)' : '#151c2e',
                  border: `1px solid ${active ? 'rgba(59,110,246,0.4)' : '#1c2540'}`,
                  color: active ? '#e8edf8' : '#4a5680',
                }}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Extra options */}
        <div className="mt-4 space-y-2">
          {[
            { label: 'Extract audio (AAC + MP3)', state: extractAudio, toggle: () => setExtractAudio(v => !v) },
            { label: 'Generate HLS streaming package', state: generateHls, toggle: () => setGenerateHls(v => !v) },
          ].map(({ label, state, toggle }) => (
            <label key={label} className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={toggle}
                className="w-9 h-5 rounded-full relative transition-all cursor-pointer"
                style={{ background: state ? 'rgba(59,110,246,0.5)' : '#1c2540', border: `1px solid ${state ? '#3b6ef6' : '#243052'}` }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{ background: state ? '#3b6ef6' : '#4a5680', left: state ? '17px' : '1px' }}
                />
              </div>
              <span className="text-sm" style={{ color: '#8899bb' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="rounded-xl p-4" style={{ background: '#0f1420', border: '1px solid #1c2540' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Uploading to cloud storage…</span>
            <span className="text-sm font-mono" style={{ color: '#22d3ee' }}>{uploadPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1c2540' }}>
            <div
              className="h-full progress-bar rounded-full transition-all"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading || done || selectedProfiles.length === 0}
        className="w-full py-4 rounded-xl font-display font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2"
        style={{
          background: done
            ? 'linear-gradient(135deg, #22c55e, #4ade80)'
            : (!file || uploading || selectedProfiles.length === 0)
              ? '#151c2e'
              : 'linear-gradient(135deg, #3b6ef6, #22d3ee)',
          opacity: (!file || uploading || selectedProfiles.length === 0) && !done ? 0.5 : 1,
          cursor: (!file || uploading || selectedProfiles.length === 0) ? 'not-allowed' : 'pointer',
        }}
      >
        {done ? (
          <><CheckCircle size={18} /> Uploaded! Redirecting…</>
        ) : uploading ? (
          <><Loader2 size={18} className="animate-spin" /> Uploading…</>
        ) : (
          <><Upload size={18} /> Upload & Start Transcoding</>
        )}
      </button>
    </div>
  )
}
