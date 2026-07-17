import { useState, useRef, useEffect } from 'react'
import { Play, X } from 'lucide-react'
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
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(16,185,129,0.06)',
        border: '1px solid rgba(16,185,129,0.2)',
        boxShadow: '0 0 32px rgba(16,185,129,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Animated radar pulse */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: '#10B981', opacity: 0.2 }}
            />
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
          </div>
          <div>
            <div className="font-heading font-bold text-[14px]" style={{ color: '#E2E8F0' }}>YOLO + ByteTrack Running</div>
            <div className="text-[11px] font-medium mt-0.5" style={{ color: '#10B981' }}>Analyzing shelf frames...</div>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#F87171'
          }}
          title="Cancel detection"
        >
          <X size={12} />
        </button>
      </div>

      {/* Frame counter row */}
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono-custom text-[28px] font-bold leading-none tabular-nums" style={{ color: '#10B981' }}>
            {frame.toLocaleString()}
          </span>
          <span className="text-[13px] font-medium" style={{ color: '#475569' }}>
            / {total > 0 ? total.toLocaleString() : '?'} frames
          </span>
        </div>
        <div className="font-mono-custom text-[20px] font-bold tabular-nums" style={{ color: '#94A3B8' }}>
          {pct.toFixed(1)}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-300 relative overflow-hidden"
          style={{
            width: `${Math.max(2, pct)}%`,
            background: 'linear-gradient(90deg, #10B981, #06B6D4)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
              animation: 'shimmer 1.5s ease-in-out infinite',
              backgroundSize: '200% 100%'
            }}
          />
        </div>
      </div>

      {/* Mini frame strip */}
      <FrameStrip pct={pct} />

      {/* Stats row */}
      <div className="flex gap-3 mt-3">
        {[
          { label: 'PROCESSED', value: frame.toLocaleString(), color: 'rgba(16,185,129,0.12)', textColor: '#10B981' },
          { label: 'REMAINING', value: total > 0 ? (total - frame).toLocaleString() : '—', color: 'rgba(255,255,255,0.04)', textColor: '#94A3B8' },
          { label: 'TOTAL',     value: total > 0 ? total.toLocaleString() : '—', color: 'rgba(6,182,212,0.12)', textColor: '#06B6D4' },
        ].map(s => (
          <div key={s.label} className="flex-1 rounded-xl p-2.5 text-center" style={{ background: s.color }}>
            <div className="font-mono-custom font-bold text-[13px]" style={{ color: s.textColor }}>{s.value}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#475569' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Animated mini frame strip
function FrameStrip({ pct }: { pct: number }) {
  const COLS = 20
  const filled = Math.round((pct / 100) * COLS)
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: COLS }, (_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-150"
          style={{
            height: i % 3 === 0 ? '14px' : i % 3 === 1 ? '10px' : '12px',
            background: i < filled
              ? 'linear-gradient(180deg, #10B981, #06B6D4)'
              : i === filled
                ? 'rgba(16,185,129,0.5)'
                : 'rgba(255,255,255,0.05)',
          }}
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
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-[24px] tracking-tight" style={{ color: '#F1F5F9' }}>
          📦 Inventory Monitoring
        </h1>
        <p className="text-[13px] mt-1" style={{ color: '#475569' }}>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ── VIDEO UPLOAD CARD ── */}
        <Card hover>
          <CardTitle icon={<span>🎥</span>}>Upload Shelf Video</CardTitle>

          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
            )}
            style={{
              borderColor: dragOver
                ? 'rgba(16,185,129,0.6)'
                : videoFile
                  ? 'rgba(16,185,129,0.35)'
                  : 'rgba(255,255,255,0.1)',
              background: dragOver
                ? 'rgba(16,185,129,0.08)'
                : videoFile
                  ? 'rgba(16,185,129,0.04)'
                  : 'rgba(255,255,255,0.02)',
            }}
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
            <div className="font-heading font-bold mb-1" style={{ color: '#E2E8F0' }}>
              {videoFile ? videoFile.name : 'Drop shelf video here'}
            </div>
            <div className="text-[12px]" style={{ color: '#475569' }}>
              {videoFile
                ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB · Click to change`
                : 'MP4, MOV, AVI, MKV — YOLO + ByteTrack will count every SKU'}
            </div>
          </div>

          {/* Sliders */}
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
                Detection Confidence
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0.1} max={0.95} step={0.05} value={conf}
                  onChange={e => setConf(+e.target.value)}
                  disabled={detecting}
                  className="flex-1 disabled:opacity-40"
                />
                <span className="font-mono-custom text-sm font-bold w-10 text-right" style={{ color: '#10B981' }}>{conf}</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>
                YOLO Weights Path
              </label>
              <input
                value={weights}
                onChange={e => setWeights(e.target.value)}
                disabled={detecting}
                className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#E2E8F0',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              />
            </div>

            {/* Run / Cancel button */}
            {detecting ? (
              <button
                onClick={cancelDetection}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#F87171'
                }}
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
          <CardTitle icon={<span>⚙️</span>}>Low-Stock Threshold</CardTitle>
          <p className="text-[13px] mb-4" style={{ color: '#475569' }}>
            Products with detected counts below this threshold will be flagged for bulk restocking and competitor analysis.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range" min={10} max={150} step={5} value={threshold}
              onChange={e => setThreshold(+e.target.value)}
              className="flex-1"
            />
            <span className="font-mono-custom text-sm font-bold w-12 text-right" style={{ color: '#10B981' }}>{threshold} u</span>
          </div>

          {/* Quick status summary */}
          {inventory && (
            <div className="mt-6 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                Current Status
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div className="font-mono-custom font-bold text-lg" style={{ color: '#10B981' }}>{items.length - lowCount}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#10B981' }}>In Stock</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <div className="font-mono-custom font-bold text-lg" style={{ color: '#F87171' }}>{lowCount}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#F87171' }}>Low Stock</div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── SHELF GRID ── */}
      <Card>
        <CardTitle icon={<span>🗂️</span>}>Shelf Overview</CardTitle>

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
                  ok:       { border: 'rgba(16,185,129,0.35)',  bar: 'linear-gradient(90deg,#10B981,#059669)', badge: 'green'  as const, label: 'IN STOCK', bg: 'rgba(16,185,129,0.05)' },
                  low:      { border: 'rgba(245,158,11,0.35)',  bar: 'linear-gradient(90deg,#F59E0B,#D97706)', badge: 'orange' as const, label: 'LOW',      bg: 'rgba(245,158,11,0.05)' },
                  critical: { border: 'rgba(239,68,68,0.4)',    bar: 'linear-gradient(90deg,#EF4444,#DC2626)', badge: 'red'    as const, label: 'CRITICAL',  bg: 'rgba(239,68,68,0.05)'  },
                }[cls]

                return (
                  <div
                    key={name}
                    className="rounded-xl p-3 card-hover"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                  >
                    <div className="text-[11px] font-semibold capitalize truncate mb-1.5" style={{ color: '#64748B' }}>{name}</div>
                    <div className="font-mono-custom text-[22px] font-bold mb-2 leading-none" style={{ color: '#F1F5F9' }}>{count}</div>
                    <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barPct}%`, background: colors.bar }}
                      />
                    </div>
                    <Badge variant={colors.badge} className="text-[8px]">{colors.label}</Badge>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
