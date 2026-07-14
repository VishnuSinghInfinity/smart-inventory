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
      <div>
        <h1 className="font-heading font-extrabold text-[24px] tracking-tight text-gray-900">⚙️ Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure rule thresholds, API status, and system preferences.</p>
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* API Status */}
        <Card hover>
          <CardTitle icon={<span className="bg-green-50">🔑</span>}>API Key Status</CardTitle>
          <div className="space-y-3">
            {[
              { name: 'GROQ_API_KEY', desc: 'Used for AI agent, chatbot & recommendations', ok: health?.groq_api_key },
              { name: 'TAVILY_API_KEY', desc: 'Used for web search in restock pipeline', ok: health?.tavily_api_key },
              { name: 'FastAPI Backend', desc: 'http://localhost:8000', ok: true },
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div>
                  <div className="font-semibold text-[13px] text-gray-900">{item.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
                </div>
                <Badge variant={item.ok ? 'green' : 'red'}>
                  ● {item.ok ? 'Connected' : 'Missing'}
                </Badge>
              </div>
            ))}
          </div>
          <Alert variant="info" icon="💡" >
            Add missing keys to your <code className="font-mono-custom text-[11px] bg-violet-100 px-1 py-0.5 rounded">.env</code> file and restart the API server with <code className="font-mono-custom text-[11px] bg-violet-100 px-1 py-0.5 rounded">uvicorn api:app --reload</code>.
          </Alert>
        </Card>

        {/* Thresholds */}
        <Card hover>
          <CardTitle icon={<span className="bg-amber-50">📐</span>}>Rule Engine Thresholds</CardTitle>
          <div className="space-y-5">
            {sliders.map(s => (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</label>
                  <span className="font-mono-custom text-sm font-bold text-violet-600">
                    {thresholds[s.key as keyof typeof thresholds]}{s.suffix}
                  </span>
                </div>
                <input
                  type="range" min={s.min} max={s.max}
                  value={thresholds[s.key as keyof typeof thresholds]}
                  onChange={e => setThresholds(t => ({ ...t, [s.key]: +e.target.value }))}
                  className="w-full accent-violet-600"
                />
                <p className="text-[11px] text-gray-400 mt-1">{s.hint}</p>
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
        <CardTitle icon={<span className="bg-cyan-50">ℹ️</span>}>System Information</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sysInfo.map(s => (
            <div key={s.label} className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{s.label}</div>
              <div className="font-bold text-[13px] text-gray-900">{s.value}</div>
              <div className="text-[11px] text-gray-400 mt-0.5 font-mono-custom">{s.sub}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
