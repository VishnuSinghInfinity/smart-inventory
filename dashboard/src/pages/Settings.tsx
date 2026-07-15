import { useState } from 'react'
import { api } from '../lib/api'
import { useHealth } from '../hooks/useHealth'
import { Card, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Badge'
import { Settings2, Key, Info } from 'lucide-react'

export default function Settings() {
  const { data: health } = useHealth()
  const [thresholds, setThresholds] = useState({ near_expiry_days: 14, low_stock_days: 5, trend_up_pct: 25 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success'|'error'; text: string } | null>(null)

  async function save() {
    setSaving(true)
    try {
      await api.updateThresholds(thresholds)
      setMsg({ type: 'success', text: 'Thresholds saved successfully.' })
    } catch { setMsg({ type: 'error', text: 'Failed to save thresholds.' }) }
    finally { setSaving(false); setTimeout(() => setMsg(null), 3000) }
  }

  const sliders = [
    { key: 'near_expiry_days', label: 'Near Expiry Window', hint: 'Products expiring within this window get flagged for discount.', min: 3, max: 30, suffix: 'd' },
    { key: 'low_stock_days',   label: 'Low Stock Threshold', hint: 'Products with fewer days of stock get flagged for restock.', min: 1, max: 14, suffix: 'd' },
    { key: 'trend_up_pct',     label: 'Trending Up Threshold', hint: 'Sales must have grown by this % week-over-week to be "trending up".', min: 5, max: 100, suffix: '%' },
  ]

  const sysInfo = [
    { label: 'YOLO Model',  value: 'YOLOv8 + ByteTrack', sub: 'final_best.pt' },
    { label: 'LLM',         value: 'Groq OSS 120B',       sub: 'openai/gpt-oss-120b' },
    { label: 'Scraper',     value: 'Playwright + BS4',     sub: 'Headless Chromium + JSON-LD' },
    { label: 'Backend',     value: 'FastAPI + Uvicorn',    sub: 'localhost:8000' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Configure rule thresholds, review API status, and inspect system information.
        </p>
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* API Status */}
        <Card>
          <CardTitle icon={<Key size={14} />}>API Key Status</CardTitle>
          <div className="space-y-2">
            {[
              { name: 'GROQ_API_KEY', desc: 'AI agent, chatbot & recommendations', ok: health?.groq_api_key },
              { name: 'TAVILY_API_KEY', desc: 'Web search in restock pipeline', ok: health?.tavily_api_key },
              { name: 'FastAPI Backend', desc: 'http://localhost:8000', ok: true },
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between p-3.5 bg-gray-50/60 border border-gray-100 rounded-lg">
                <div>
                  <div className="font-semibold text-[13px] text-gray-800 font-mono-custom">{item.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{item.desc}</div>
                </div>
                <Badge variant={item.ok ? 'green' : 'red'}>
                  {item.ok ? 'Connected' : 'Missing'}
                </Badge>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Alert variant="info">
              Add missing keys to your{' '}
              <code className="font-mono-custom text-[11px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">.env</code>{' '}
              file and restart with{' '}
              <code className="font-mono-custom text-[11px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">uvicorn api:app --reload</code>.
            </Alert>
          </div>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardTitle icon={<Settings2 size={14} />}>Rule Engine Thresholds</CardTitle>
          <div className="space-y-5">
            {sliders.map(s => (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">{s.label}</label>
                  <span className="font-mono-custom text-[12px] font-bold text-indigo-600">
                    {thresholds[s.key as keyof typeof thresholds]}{s.suffix}
                  </span>
                </div>
                <input
                  type="range" min={s.min} max={s.max}
                  value={thresholds[s.key as keyof typeof thresholds]}
                  onChange={e => setThresholds(t => ({ ...t, [s.key]: +e.target.value }))}
                  className="w-full"
                />
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{s.hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-gray-100">
            <Button variant="primary" size="sm" loading={saving} onClick={save}>
              Save Thresholds
            </Button>
          </div>
        </Card>
      </div>

      {/* System info */}
      <Card>
        <CardTitle icon={<Info size={14} />}>System Information</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sysInfo.map(s => (
            <div key={s.label} className="p-4 bg-gray-50/60 border border-gray-100 rounded-lg">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</div>
              <div className="font-semibold text-[13px] text-gray-800 leading-snug">{s.value}</div>
              <div className="text-[10px] text-gray-400 mt-1 font-mono-custom">{s.sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Stack badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: 'React 18', color: 'cyan' as const },
          { label: 'TypeScript', color: 'indigo' as const },
          { label: 'FastAPI', color: 'green' as const },
          { label: 'YOLOv8', color: 'orange' as const },
          { label: 'Groq LLM', color: 'violet' as const },
          { label: 'Tavily', color: 'gray' as const },
          { label: 'Playwright', color: 'gray' as const },
        ].map(b => (
          <Badge key={b.label} variant={b.color}>{b.label}</Badge>
        ))}
      </div>
    </div>
  )
}
