import { useState } from 'react'
import { api } from '../lib/api'
import { useHealth } from '../hooks/useHealth'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Badge'

export default function Settings() {
  const { data: health } = useHealth()
  const [thresholds, setThresholds] = useState({ near_expiry_days: 14, low_stock_days: 5, trend_up_pct: 25 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success'|'error'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    try {
      await api.updateThresholds(thresholds)
      setMsg({ type: 'success', text: '✅ Thresholds saved successfully!' })
    } catch { setMsg({ type: 'error', text: '❌ Failed to save thresholds.' }) }
    finally { setSaving(false); setTimeout(() => setMsg(null), 3000) }
  }

  const sliders = [
    { key: 'near_expiry_days', label: 'Near Expiry Window (days)', hint: 'Products expiring within this window get flagged for discount.', min: 3, max: 30, suffix: 'd' },
    { key: 'low_stock_days', label: 'Low Stock Threshold (days of stock left)', hint: 'Products with fewer days of stock get flagged for restock.', min: 1, max: 14, suffix: 'd' },
    { key: 'trend_up_pct', label: 'Trending Up Threshold (%)', hint: 'Sales must have grown by this % week-over-week to be "trending up".', min: 5, max: 100, suffix: '%' },
  ]

  const sysInfo = [
    { label: 'YOLO MODEL', value: 'YOLOv8 + ByteTrack', sub: 'final_best.pt' },
    { label: 'LLM',        value: 'Groq OpenAI OSS 120B', sub: 'openai/gpt-oss-120b' },
    { label: 'SCRAPER',    value: 'Playwright + BS4', sub: 'Headless Chromium + JSON-LD' },
    { label: 'BACKEND',    value: 'FastAPI + Uvicorn', sub: 'localhost:8000' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-[24px] tracking-tight" style={{ color: '#F1F5F9' }}>
          ⚙️ Settings
        </h1>
        <p className="text-[13px] mt-1" style={{ color: '#475569' }}>Configure rule thresholds, API status, and system preferences.</p>
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* API Status */}
        <Card hover>
          <CardTitle icon={<span>🔑</span>}>API Key Status</CardTitle>
          <div className="space-y-3">
            {[
              {
                name: 'GROQ_API_KEY',
                desc: 'Used for AI agent, chatbot & recommendations',
                statusText: health ? (health.groq_api_key ? 'Connected' : 'Missing') : 'Offline',
                variant: health ? (health.groq_api_key ? 'green' : 'red') : 'gray' as const,
                ping: !!(health && health.groq_api_key),
                color: health ? (health.groq_api_key ? '#10B981' : '#EF4444') : '#94A3B8',
                bg: health ? (health.groq_api_key ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)') : 'rgba(255,255,255,0.02)',
                border: health ? (health.groq_api_key ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.07)',
              },
              {
                name: 'TAVILY_API_KEY',
                desc: 'Used for web search in restock pipeline',
                statusText: health ? (health.tavily_api_key ? 'Connected' : 'Missing') : 'Offline',
                variant: health ? (health.tavily_api_key ? 'green' : 'red') : 'gray' as const,
                ping: !!(health && health.tavily_api_key),
                color: health ? (health.tavily_api_key ? '#10B981' : '#EF4444') : '#94A3B8',
                bg: health ? (health.tavily_api_key ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)') : 'rgba(255,255,255,0.02)',
                border: health ? (health.tavily_api_key ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.07)',
              },
              {
                name: 'FastAPI Backend',
                desc: 'http://localhost:8000',
                statusText: health ? 'Connected' : 'Disconnected',
                variant: health ? 'green' : 'red' as const,
                ping: !!health,
                color: health ? '#10B981' : '#EF4444',
                bg: health ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                border: health ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              },
            ].map(item => (
              <div
                key={item.name}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                }}
              >
                <div>
                  <div className="font-semibold text-[13px]" style={{ color: '#E2E8F0' }}>{item.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#475569' }}>{item.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="relative w-2 h-2 flex-shrink-0"
                  >
                    {item.ping && (
                      <div
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: item.color, opacity: 0.4 }}
                      />
                    )}
                    <div
                      className="relative w-2 h-2 rounded-full"
                      style={{ background: item.color }}
                    />
                  </div>
                  <Badge variant={item.variant as any}>
                    {item.statusText}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Alert variant="info" icon="💡">
              Add missing keys to your{' '}
              <code
                className="font-mono-custom text-[11px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}
              >
                .env
              </code>{' '}
              file and restart with{' '}
              <code
                className="font-mono-custom text-[11px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}
              >
                uvicorn api:app --reload
              </code>
              .
            </Alert>
          </div>
        </Card>

        {/* Thresholds */}
        <Card hover>
          <CardTitle icon={<span>📐</span>}>Rule Engine Thresholds</CardTitle>
          <div className="space-y-5">
            {sliders.map(s => (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#475569' }}>{s.label}</label>
                  <span className="font-mono-custom text-sm font-bold" style={{ color: '#10B981' }}>
                    {thresholds[s.key as keyof typeof thresholds]}{s.suffix}
                  </span>
                </div>
                <input
                  type="range" min={s.min} max={s.max}
                  value={thresholds[s.key as keyof typeof thresholds]}
                  onChange={e => setThresholds(t => ({ ...t, [s.key]: +e.target.value }))}
                  className="w-full"
                />
                <p className="text-[11px] mt-1.5" style={{ color: '#374151' }}>{s.hint}</p>
              </div>
            ))}
          </div>
          <Button variant="primary" className="mt-5" loading={saving} onClick={save}>
            💾 Save Thresholds
          </Button>
        </Card>
      </div>

      {/* System info */}
      <Card>
        <CardTitle icon={<span>ℹ️</span>}>System Information</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sysInfo.map(s => (
            <div
              key={s.label}
              className="p-4 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>{s.label}</div>
              <div className="font-bold text-[13px]" style={{ color: '#E2E8F0' }}>{s.value}</div>
              <div className="text-[11px] mt-0.5 font-mono-custom" style={{ color: '#374151' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
