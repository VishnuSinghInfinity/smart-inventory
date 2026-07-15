import { useState, useRef, useEffect } from 'react'
import { Play, X, Video, Settings, AlertCircle, CheckCircle2, Loader2, Package } from 'lucide-react'
import { api, type DetectionProgressEvent } from '../lib/api'
import { useInventoryStore } from '../hooks/useInventoryStore'
import { Card, CardTitle } from '../components/ui/Card'
import { Button, EmptyState, StatCard } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Badge'
import { fmt, getStockClass } from '../lib/utils'
import { cn } from '../lib/utils'

// ── Frame Progress Component ──────────────────────────────────────────────────
interface FrameProgressProps {
  frame: number
  total: number
  pct: number
  onCancel: () => void
}

function FrameProgress({ frame, total, pct, onCancel }: FrameProgressProps) {
  return (
    <div className="bg-white border border-indigo-200/60 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="relative w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
              <Loader2 size={16} className="text-white spinner" />
            </div>
          </div>
          <div>
            <div className="font-semibold text-[13px] text-gray-900">YOLO + ByteTrack Running</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Analyzing shelf frames…</div>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400 transition-colors"
          title="Cancel detection"
        >
          <X size={13} />
        </button>
      </div>

      {/* Frame counter */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono-custom text-[28px] font-bold text-gray-900 leading-none tabular-nums">
            {frame.toLocaleString()}
          </span>
          <span className="text-[12px] text-gray-400">
            / {total > 0 ? total.toLocaleString() : '—'} frames
          </span>
        </div>
        <span className="font-mono-custom text-[16px] font-semibold text-indigo-600 tabular-nums">
          {pct.toFixed(1)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full progress-fill transition-all duration-300"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>

      {/* Frame strip */}
      <FrameStrip pct={pct} />

      {/* Stats row */}
      <div className="flex gap-3 mt-4">
        {[
          { label: 'Processed', value: frame.toLocaleString(), color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Remaining', value: total > 0 ? (total - frame).toLocaleString() : '—', color: 'bg-gray-50 text-gray-600' },
          { label: 'Total', value: total > 0 ? total.toLocaleString() : '—', color: 'bg-emerald-50 text-emerald-700' },
        ].map(s => (
          <div key={s.label} className={`flex-1 rounded-lg p-2.5 text-center ${s.color}`}>
            <div className="font-mono-custom font-bold text-[12px]">{s.value}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider mt-0.5 opacity-60">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FrameStrip({ pct }: { pct: number }) {
  const COLS = 20
  const filled = Math.round((pct / 100) * COLS)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: COLS }, (_, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 rounded-sm transition-all duration-150',
            i < filled
              ? 'bg-indigo-500'
              : i === filled
                ? 'bg-indigo-300 animate-pulse'
                : 'bg-gray-100'
          )}
          style={{ height: i % 3 === 0 ? '14px' : i % 3 === 1 ? '10px' : '12px' }}
        />
      ))}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryMonitoring() {
  const { inventory, setInventory } = useInventoryStore()
  const [threshold, setThreshold] = useState(70)
  const [conf, setConf] = useState(0.75)
  const [weights, setWeights] = useState('final_best.pt')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    if (!inventory) {
      api.getInventory().then(res => {
        if (res.inventory) {
          setInventory(res.inventory)
        }
      })
    }
  }, [inventory, setInventory])

  const [detecting, setDetecting] = useState(false)
  const [totalFrames, setTotalFrames] = useState(0)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [pct, setPct] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const items = inventory
    ? Object.entries(inventory).filter(([k]) => k !== 'grand_total')
    : []
  const grandTotal = inventory?.grand_total ?? items.reduce((s, [, v]) => s + v, 0)
  const lowCount = items.filter(([, v]) => v < threshold).length

  useEffect(() => {
    setCurrentFrame(0)
    setPct(0)
    setTotalFrames(0)
  }, [videoFile])

  function cancelDetection() {
    abortRef.current?.abort()
    setDetecting(false)
    setCurrentFrame(0)
    setPct(0)
    setMessage({ type: 'info', text: 'Detection cancelled.' })
  }

  function runDetection() {
    if (!videoFile || detecting) return

    setDetecting(true)
    setCurrentFrame(0)
    setPct(0)
    setTotalFrames(0)
    setMessage({ type: 'info', text: 'Uploading video and starting YOLO analysis…' })

    const controller = api.detectVideoStream(
      videoFile,
      conf,
      weights,
      (event: DetectionProgressEvent) => {
        if (event.type === 'start') {
          setTotalFrames(event.total_frames)
          setMessage({ type: 'info', text: `Scanning ${event.total_frames.toLocaleString()} frames…` })
        } else if (event.type === 'progress') {
          setCurrentFrame(event.frame)
          setPct(event.pct)
          setTotalFrames(event.total)
        }
      },
      (inv) => {
        setInventory(inv)
        setDetecting(false)
        setPct(100)
        const skuCount = Object.keys(inv).filter(k => k !== 'grand_total').length
        setMessage({
          type: 'success',
          text: `Detection complete! Found ${skuCount} SKUs with ${inv.grand_total} total units.`,
        })
      },
      (detail) => {
        setDetecting(false)
        setMessage({ type: 'error', text: `Detection failed: ${detail}` })
      }
    )

    abortRef.current = controller
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Inventory Monitoring</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Upload a shelf video for YOLO + ByteTrack frame-by-frame analysis of your live product inventory.
        </p>
      </div>

      {message && !detecting && (
        <Alert variant={message.type === 'error' ? 'error' : message.type === 'success' ? 'success' : 'info'}>
          {message.text}
        </Alert>
      )}

      {detecting && (
        <FrameProgress
          frame={currentFrame}
          total={totalFrames}
          pct={pct}
          onCancel={cancelDetection}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Video upload card */}
        <Card>
          <CardTitle icon={<Video size={14} />}>Upload Shelf Video</CardTitle>

          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150',
              dragOver
                ? 'border-indigo-400 bg-indigo-50/60'
                : videoFile
                  ? 'border-indigo-300 bg-indigo-50/30'
                  : 'border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/20'
            )}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) setVideoFile(f)
            }}
            onClick={() => !detecting && videoInputRef.current?.click()}
          >
            <input
              ref={videoInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv"
              className="hidden"
              onChange={e => e.target.files?.[0] && setVideoFile(e.target.files[0])}
            />
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              {videoFile
                ? <CheckCircle2 size={22} className="text-emerald-500" />
                : <Video size={22} className="text-gray-400" />
              }
            </div>
            <div className="font-semibold text-[14px] text-gray-800 mb-1">
              {videoFile ? videoFile.name : 'Drop shelf video here'}
            </div>
            <div className="text-[12px] text-gray-400">
              {videoFile
                ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB · Click to change`
                : 'MP4, MOV, AVI, MKV — YOLO + ByteTrack will count every SKU'}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  Detection Confidence
                </label>
                <span className="font-mono-custom text-[12px] font-bold text-indigo-600">{conf}</span>
              </div>
              <input
                type="range" min={0.1} max={0.95} step={0.05} value={conf}
                onChange={e => setConf(+e.target.value)}
                disabled={detecting}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
                YOLO Weights Path
              </label>
              <input
                value={weights}
                onChange={e => setWeights(e.target.value)}
                disabled={detecting}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-40 disabled:bg-gray-50 font-mono-custom"
              />
            </div>

            {detecting ? (
              <button
                onClick={cancelDetection}
                className="w-full py-2.5 rounded-lg bg-white border border-red-200 text-red-600 font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
              >
                <X size={14} /> Cancel Detection
              </button>
            ) : (
              <Button
                variant="primary"
                className="w-full justify-center"
                disabled={!videoFile}
                icon={<Play size={14} />}
                onClick={runDetection}
              >
                Run YOLO Detection
              </Button>
            )}
          </div>
        </Card>

        {/* Settings card */}
        <Card>
          <CardTitle icon={<Settings size={14} />}>Detection Settings</CardTitle>
          <p className="text-[12px] text-gray-500 mb-5 leading-relaxed">
            Products with detected counts below this threshold will be flagged for restocking and competitor analysis.
          </p>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                Low-Stock Threshold
              </label>
              <span className="font-mono-custom text-[12px] font-bold text-indigo-600">{threshold} units</span>
            </div>
            <input
              type="range" min={10} max={150} step={5} value={threshold}
              onChange={e => setThreshold(+e.target.value)}
              className="w-full"
            />
            <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
              <span>10</span>
              <span>150</span>
            </div>
          </div>

          {/* Info boxes */}
          <div className="mt-6 space-y-2">
            {[
              { icon: <Video size={13} className="text-indigo-500" />, label: 'YOLO v8 Object Detection', desc: 'Frame-level product counting' },
              { icon: <Settings size={13} className="text-gray-500" />, label: 'ByteTrack Tracking', desc: 'Robust multi-object tracker' },
              { icon: <AlertCircle size={13} className="text-amber-500" />, label: 'Confidence Threshold', desc: `Minimum ${conf} for valid detection` },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-shrink-0">{item.icon}</div>
                <div>
                  <div className="text-[12px] font-semibold text-gray-700">{item.label}</div>
                  <div className="text-[11px] text-gray-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Shelf grid */}
      <Card>
        <CardTitle icon={<Package size={14} />}>Shelf Overview</CardTitle>

        {!inventory ? (
          <EmptyState
            icon="📷"
            title="No Inventory Data"
            sub="Upload a shelf video to perform a YOLO + ByteTrack live frame analysis."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <StatCard icon={<Package size={16} />} label="Total Units" value={fmt(grandTotal)} color="green" />
              <StatCard icon={<CheckCircle2 size={16} />} label="SKUs Tracked" value={items.length} color="violet" />
              <StatCard
                icon={<AlertCircle size={16} />}
                label="Low-Stock SKUs"
                value={lowCount}
                color={lowCount > 0 ? 'orange' : 'cyan'}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {items.sort(([, a], [, b]) => a - b).map(([name, count]) => {
                const cls = getStockClass(count, threshold)
                const maxVal = Math.max(...items.map(([, v]) => v), 1)
                const barPct = Math.max(6, Math.min(100, (count / maxVal) * 100))
                const colors = {
                  ok:       { bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-400', badge: 'green' as const, label: 'OK' },
                  low:      { bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-amber-400',   badge: 'orange' as const, label: 'LOW' },
                  critical: { bg: 'bg-red-50',     border: 'border-red-200',     bar: 'bg-red-400',     badge: 'red' as const,    label: 'CRIT' },
                }[cls]

                return (
                  <div key={name} className={`rounded-xl p-3 border transition-all duration-150 hover:-translate-y-0.5 ${colors.bg} ${colors.border}`}>
                    <div className="text-[10px] font-semibold text-gray-500 capitalize truncate mb-1.5">{name}</div>
                    <div className="font-mono-custom text-[20px] font-bold text-gray-900 leading-none mb-2">{count}</div>
                    <div className="h-1 bg-white/60 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${colors.bar} transition-all`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <Badge variant={colors.badge}>{colors.label}</Badge>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
