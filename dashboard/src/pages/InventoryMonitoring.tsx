import { useState, useRef, useEffect } from 'react'
import { Play, X } from 'lucide-react'
import { api, type InventoryData, type DetectionProgressEvent } from '../lib/api'
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
    <div className="bg-white border-2 border-violet-200 rounded-2xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {/* Animated radar pulse */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-violet-500 opacity-20 animate-ping" />
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
          </div>
          <div>
            <div className="font-heading font-bold text-[14px] text-gray-900">YOLO + ByteTrack Running</div>
            <div className="text-[11px] text-gray-400 font-medium mt-0.5">Analyzing shelf frames...</div>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-400 transition-colors"
          title="Cancel detection"
        >
          <X size={13} />
        </button>
      </div>

      {/* Frame counter row */}
      <div className="flex items-end justify-between mb-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono-custom text-[28px] font-bold text-violet-600 leading-none tabular-nums">
            {frame.toLocaleString()}
          </span>
          <span className="text-[13px] text-gray-400 font-medium">
            / {total > 0 ? total.toLocaleString() : '?'} frames
          </span>
        </div>
        <div className="font-mono-custom text-[20px] font-bold text-gray-700 tabular-nums">
          {pct.toFixed(1)}%
        </div>
      </div>

      {/* Progress bar track */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3 relative">
        {/* Shimmer overlay */}
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-violet-600 transition-all duration-300 relative overflow-hidden"
          style={{ width: `${Math.max(2, pct)}%` }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ animation: 'shimmer 1.5s ease-in-out infinite', backgroundSize: '200% 100%' }}
          />
        </div>
      </div>

      {/* Mini frame strip visualizer */}
      <FrameStrip pct={pct} />

      {/* Stats row */}
      <div className="flex gap-3 mt-3">
        <div className="flex-1 bg-violet-50 rounded-xl p-2.5 text-center">
          <div className="font-mono-custom font-bold text-violet-700 text-[13px]">{frame.toLocaleString()}</div>
          <div className="text-[9px] text-violet-400 font-bold uppercase tracking-wider mt-0.5">Processed</div>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl p-2.5 text-center">
          <div className="font-mono-custom font-bold text-gray-600 text-[13px]">
            {total > 0 ? (total - frame).toLocaleString() : '—'}
          </div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Remaining</div>
        </div>
        <div className="flex-1 bg-emerald-50 rounded-xl p-2.5 text-center">
          <div className="font-mono-custom font-bold text-emerald-600 text-[13px]">{total > 0 ? total.toLocaleString() : '—'}</div>
          <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">Total</div>
        </div>
      </div>
    </div>
  )
}

// Animated mini frame strip — shows "scanning" effect
function FrameStrip({ pct }: { pct: number }) {
  const COLS = 20
  const filled = Math.round((pct / 100) * COLS)
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: COLS }, (_, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 rounded-sm transition-all duration-150',
            i < filled
              ? 'bg-gradient-to-b from-violet-500 to-pink-500'
              : i === filled
                ? 'bg-violet-300 animate-pulse'
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

  // Detection progress state
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

  // Reset progress when video file changes
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
    setMessage({ type: 'info', text: '⏳ Uploading video and starting YOLO analysis…' })

    const controller = api.detectVideoStream(
      videoFile,
      conf,
      weights,
      // onEvent
      (event: DetectionProgressEvent) => {
        if (event.type === 'start') {
          setTotalFrames(event.total_frames)
          setMessage({ type: 'info', text: `📹 Scanning ${event.total_frames.toLocaleString()} frames…` })
        } else if (event.type === 'progress') {
          setCurrentFrame(event.frame)
          setPct(event.pct)
          setTotalFrames(event.total)
        }
      },
      // onDone
      (inv) => {
        setInventory(inv)
        setDetecting(false)
        setPct(100)
        const skuCount = Object.keys(inv).filter(k => k !== 'grand_total').length
        setMessage({
          type: 'success',
          text: `✅ Detection complete! Found ${skuCount} SKUs with ${inv.grand_total} total units.`,
        })
      },
      // onError
      (detail) => {
        setDetecting(false)
        setMessage({ type: 'error', text: `❌ Detection failed: ${detail}` })
      }
    )

    abortRef.current = controller
  }

  // Removed loadSample and loadJson as requested to restrict to live YOLO analysis only

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-[24px] tracking-tight text-gray-900">📦 Inventory Monitoring</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a shelf video for YOLO + ByteTrack frame-by-frame detection to analyze your live product inventory.
        </p>
      </div>

      {message && !detecting && (
        <Alert variant={message.type === 'error' ? 'error' : message.type === 'success' ? 'success' : 'info'}>
          {message.text}
        </Alert>
      )}

      {/* ── FRAME PROGRESS (shows while detecting) ── */}
      {detecting && (
        <FrameProgress
          frame={currentFrame}
          total={totalFrames}
          pct={pct}
          onCancel={cancelDetection}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── VIDEO UPLOAD CARD ── */}
        <Card hover>
          <CardTitle icon={<span className="bg-violet-50">🎥</span>}>Upload Shelf Video</CardTitle>

          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
              dragOver
                ? 'border-violet-400 bg-violet-50'
                : videoFile
                  ? 'border-violet-300 bg-violet-50/40'
                  : 'border-gray-200 bg-gray-50 hover:border-violet-300 hover:bg-violet-50/30'
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
            <div className="text-4xl mb-3">{videoFile ? '🎬' : '📹'}</div>
            <div className="font-heading font-bold text-gray-800 mb-1">
              {videoFile ? videoFile.name : 'Drop shelf video here'}
            </div>
            <div className="text-[12px] text-gray-400">
              {videoFile
                ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB · Click to change`
                : 'MP4, MOV, AVI, MKV — YOLO + ByteTrack will count every SKU'}
            </div>
          </div>

          {/* Sliders */}
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Detection Confidence
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0.1} max={0.95} step={0.05} value={conf}
                  onChange={e => setConf(+e.target.value)}
                  disabled={detecting}
                  className="flex-1 accent-violet-600 disabled:opacity-40"
                />
                <span className="font-mono-custom text-sm font-bold text-violet-600 w-10 text-right">{conf}</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                YOLO Weights Path
              </label>
              <input
                value={weights}
                onChange={e => setWeights(e.target.value)}
                disabled={detecting}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] bg-gray-50 outline-none focus:border-violet-400 disabled:opacity-40"
              />
            </div>

            {/* Run / Cancel button */}
            {detecting ? (
              <button
                onClick={cancelDetection}
                className="w-full py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <X size={15} /> Cancel Detection
              </button>
            ) : (
              <Button
                variant="primary"
                className="w-full justify-center"
                disabled={!videoFile}
                icon={<Play size={15} />}
                onClick={runDetection}
              >
                Run YOLO Detection
              </Button>
            )}
          </div>
        </Card>

        {/* ── SETTINGS CARD ── */}
        <Card hover>
          <CardTitle icon={<span className="bg-amber-50">⚙️</span>}>Low-Stock Threshold</CardTitle>
          <p className="text-[12px] text-gray-400 mb-4">
            Products with detected counts below this threshold will be flagged for bulk restocking and competitor analysis.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range" min={10} max={150} step={5} value={threshold}
              onChange={e => setThreshold(+e.target.value)}
              className="flex-1 accent-violet-600"
            />
            <span className="font-mono-custom text-sm font-bold text-violet-600 w-12 text-right">{threshold} u</span>
          </div>
        </Card>
      </div>

      {/* ── SHELF GRID ── */}
      <Card>
        <CardTitle icon={<span className="bg-emerald-50">🗂️</span>}>Shelf Overview</CardTitle>

        {!inventory ? (
          <EmptyState
            icon="📷"
            title="No Inventory Data"
            sub="Upload a shelf video to perform a YOLO + ByteTrack live frame analysis."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              <StatCard icon={<span>📦</span>} label="Total Units" value={fmt(grandTotal)} color="green" />
              <StatCard icon={<span>🏷️</span>} label="SKUs Tracked" value={items.length} color="violet" />
              <StatCard
                icon={<span>⚠️</span>}
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
                  ok:       { border: 'border-emerald-300', bar: 'from-emerald-400 to-green-500', badge: 'bg-emerald-50 text-emerald-700', label: 'IN STOCK' },
                  low:      { border: 'border-amber-300',   bar: 'from-amber-400 to-orange-400', badge: 'bg-amber-50 text-amber-700',    label: 'LOW STOCK' },
                  critical: { border: 'border-red-400',     bar: 'from-red-400 to-rose-500',     badge: 'bg-red-50 text-red-600',       label: 'CRITICAL' },
                }[cls]

                return (
                  <div key={name} className={cn('bg-white border-2 rounded-xl p-3 card-hover', colors.border)}>
                    <div className="text-[11px] font-semibold text-gray-500 capitalize truncate mb-1.5">{name}</div>
                    <div className="font-mono-custom text-[22px] font-bold text-gray-900 mb-2 leading-none">{count}</div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div
                        className={cn('h-full bg-gradient-to-r rounded-full transition-all', colors.bar)}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', colors.badge)}>
                      {colors.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* shimmer keyframes injected inline */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
