import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { api, type SalesMetricsResponse, type ThresholdUpdate } from '../lib/api'
import { Card, CardTitle } from '../components/ui/Card'
import { StatCard, LoadingState, Button } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Badge'
import { fmtPct } from '../lib/utils'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, BarChart, Bar
} from 'recharts'

const COLORS = ['#7C3AED','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899']

export default function SalesPrediction() {
  const [data, setData] = useState<SalesMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [thresholds, setThresholds] = useState<ThresholdUpdate>({
    near_expiry_days: 14, low_stock_days: 5, trend_up_pct: 25
  })

  const load = () => {
    setLoading(true)
    api.getSalesMetrics()
      .then(d => { setData(d); setThresholds(d.thresholds) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function saveThresholds() {
    setSaving(true)
    try {
      await api.updateThresholds(thresholds)
      setMsg('✅ Thresholds saved!')
      load()
    } catch { setMsg('❌ Save failed') }
    finally { setSaving(false); setTimeout(() => setMsg(null), 3000) }
  }

  if (loading) return <LoadingState message="Loading sales data..." />

  const products = data ? Object.keys(data.history) : []
  const chartData = data ? Array.from({ length: 30 }, (_, i) => {
    const pt: Record<string, unknown> = { day: `D${i + 1}` }
    products.slice(0, 6).forEach(p => { pt[p] = data.history[p]?.[i] ?? 0 })
    return pt
  }) : []

  // Bar chart: trend %
  const trendData = data ? Object.entries(data.metrics)
    .map(([name, m]) => ({ name, trend: m.trend_pct, avg: m.avg_daily_sales_7d }))
    .sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend))
    .slice(0, 10) : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-[24px] tracking-tight text-gray-900">📈 Sales Prediction</h1>
          <p className="text-sm text-gray-500 mt-1">30-day simulated sales velocity, trend analysis, and days-of-stock-left forecasting.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={14}/>} onClick={load}>Refresh</Button>
      </div>

      {msg && <Alert variant={msg.startsWith('✅') ? 'success' : 'error'}>{msg}</Alert>}

      {/* Threshold controls */}
      <Card hover>
        <CardTitle icon={<span className="bg-amber-50">⚙️</span>}>Rule Engine Thresholds</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { key: 'near_expiry_days', label: 'Near Expiry (days)', min: 3, max: 30, suffix: 'd' },
            { key: 'low_stock_days',   label: 'Low Stock (days left)', min: 1, max: 14, suffix: 'd' },
            { key: 'trend_up_pct',     label: 'Trending Up (%)', min: 5, max: 100, suffix: '%' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">{f.label}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={f.min} max={f.max}
                  value={thresholds[f.key as keyof ThresholdUpdate] ?? f.min}
                  onChange={e => setThresholds(t => ({ ...t, [f.key]: +e.target.value }))}
                  className="flex-1 accent-violet-600"
                />
                <span className="font-mono-custom text-sm font-bold text-violet-600 w-12 text-right">
                  {thresholds[f.key as keyof ThresholdUpdate]}{f.suffix}
                </span>
              </div>
            </div>
          ))}
        </div>
        <Button variant="primary" size="sm" className="mt-4" loading={saving} onClick={saveThresholds}>
          Apply Thresholds
        </Button>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<span>📦</span>} label="Products Tracked" value={data ? Object.keys(data.metrics).length : '—'} color="green" />
        <StatCard icon={<span>🏷️</span>} label="Discount Candidates" value={data?.discount_triggers.length ?? '—'} color="orange" />
        <StatCard icon={<span>📥</span>} label="Restock Candidates" value={data?.restock_triggers.length ?? '—'} color="red" />
        <StatCard
          icon={<span>📅</span>}
          label="Avg Days of Stock"
          value={data ? (Object.values(data.metrics).reduce((s, m) => s + (m.days_of_stock_left === 999 ? 30 : m.days_of_stock_left), 0) / Object.keys(data.metrics).length).toFixed(1) : '—'}
          color="cyan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card hover>
          <CardTitle icon={<span className="bg-violet-50">📉</span>}>30-Day Sales Trend</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {products.slice(0, 6).map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} stroke={COLORS[i]} strokeWidth={2} dot={false} name={p} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card hover>
          <CardTitle icon={<span className="bg-orange-50">⚡</span>}>Sales Trend % (Top 10 SKUs)</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={trendData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6B7280' }} width={80} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmtPct(v)} contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: 11 }} />
              <Bar dataKey="trend" name="Trend %"
                fill="#7C3AED" radius={[0, 4, 4, 0]}
                label={{ position: 'right', fontSize: 10, fill: '#6B7280', formatter: (v: number) => fmtPct(v) }}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Full metrics table */}
      <Card noPad>
        <div className="px-6 pt-6 pb-3">
          <CardTitle icon={<span className="bg-green-50">📋</span>}>Product Metrics Table</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                {['Product','Stock','7-Day Avg','Trend','Days Left','Expiry','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data && Object.entries(data.metrics).map(([name, m]) => {
                const trigger = data.triggers.find(t => t.product === name)
                return (
                  <tr key={name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold capitalize">{name}</td>
                    <td className="px-4 py-3 font-mono-custom font-semibold">{m.current_stock}</td>
                    <td className="px-4 py-3 font-mono-custom">{m.avg_daily_sales_7d}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.trend_pct >= 0 ? 'green' : 'red'}>{fmtPct(m.trend_pct)}</Badge>
                    </td>
                    <td className={`px-4 py-3 font-mono-custom font-semibold ${m.days_of_stock_left < 5 ? 'text-red-500' : m.days_of_stock_left < 10 ? 'text-amber-500' : 'text-gray-700'}`}>
                      {m.days_of_stock_left === 999 ? '∞' : m.days_of_stock_left}d
                    </td>
                    <td className={`px-4 py-3 font-mono-custom text-[11px] ${m.days_until_expiry < 14 ? 'text-red-500' : 'text-gray-400'}`}>
                      {m.expiry_date}
                    </td>
                    <td className="px-4 py-3">
                      {trigger
                        ? <Badge variant={trigger.action === 'discount' ? 'orange' : 'violet'}>{trigger.action.toUpperCase()}</Badge>
                        : <Badge variant="green">OK</Badge>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
