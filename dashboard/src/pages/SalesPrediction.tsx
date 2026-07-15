import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { api, type SalesMetricsResponse, type ThresholdUpdate } from '../lib/api'
import { Card, CardTitle } from '../components/ui/Card'
import { StatCard, LoadingState, Button } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Badge'
import { fmtPct } from '../lib/utils'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, BarChart, Bar, Cell
} from 'recharts'

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#8B5CF6']

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
      setMsg('Thresholds saved successfully.')
      load()
    } catch { setMsg('Save failed. Please try again.') }
    finally { setSaving(false); setTimeout(() => setMsg(null), 3000) }
  }

  if (loading) return <LoadingState message="Loading sales data..." />

  const products = data ? Object.keys(data.history) : []
  const chartData = data ? Array.from({ length: 30 }, (_, i) => {
    const pt: Record<string, unknown> = { day: `D${i + 1}` }
    products.slice(0, 6).forEach(p => { pt[p] = data.history[p]?.[i] ?? 0 })
    return pt
  }) : []

  const trendData = data ? Object.entries(data.metrics)
    .map(([name, m]) => ({ name, trend: m.trend_pct, avg: m.avg_daily_sales_7d }))
    .sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend))
    .slice(0, 10) : []

  const thresholdFields = [
    { key: 'near_expiry_days', label: 'Near Expiry', unit: 'days', min: 3, max: 30, suffix: 'd' },
    { key: 'low_stock_days',   label: 'Low Stock',   unit: 'days', min: 1, max: 14, suffix: 'd' },
    { key: 'trend_up_pct',     label: 'Trending Up', unit: '%',    min: 5, max: 100, suffix: '%' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Sales Prediction</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            30-day simulated sales velocity, trend analysis, and days-of-stock-left forecasting.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={load}>
          Refresh
        </Button>
      </div>

      {msg && (
        <Alert variant={msg.includes('failed') ? 'error' : 'success'}>
          {msg}
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<TrendingUp size={16} />} label="Products Tracked" value={data ? Object.keys(data.metrics).length : '—'} color="green" />
        <StatCard icon={<TrendingDown size={16} />} label="Discount Candidates" value={data?.discount_triggers.length ?? '—'} color="orange" />
        <StatCard icon={<RefreshCw size={16} />} label="Restock Candidates" value={data?.restock_triggers.length ?? '—'} color="red" />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Avg Days of Stock"
          value={data ? (Object.values(data.metrics).reduce((s, m) => s + (m.days_of_stock_left === 999 ? 30 : m.days_of_stock_left), 0) / Object.keys(data.metrics).length).toFixed(1) : '—'}
          color="cyan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Sales trend */}
        <Card>
          <CardTitle icon={<TrendingUp size={14} />}>30-Day Sales Trend</CardTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="2 6" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
              {products.slice(0, 6).map((p, i) => (
                <Line
                  key={p} type="monotone" dataKey={p}
                  stroke={CHART_COLORS[i]} strokeWidth={1.5} dot={false} name={p}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Trend % bar chart */}
        <Card>
          <CardTitle icon={<TrendingUp size={14} />}>Sales Trend — Top 10 SKUs</CardTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trendData} layout="vertical">
              <CartesianGrid strokeDasharray="2 6" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis
                dataKey="name" type="category"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                width={80} axisLine={false} tickLine={false}
              />
              <Tooltip
                formatter={(v: unknown) => fmtPct(v as number)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: 11 }}
              />
              <Bar dataKey="trend" name="Trend %" radius={[0, 4, 4, 0]}>
                {trendData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.trend >= 0 ? '#6366F1' : '#EF4444'}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Threshold controls */}
      <Card>
        <CardTitle icon={<RefreshCw size={14} />} subtitle="Adjust the rules engine thresholds that trigger discount and restock recommendations.">
          Rule Engine Thresholds
        </CardTitle>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {thresholdFields.map(f => (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  {f.label}
                </label>
                <span className="font-mono-custom text-[12px] font-bold text-indigo-600">
                  {thresholds[f.key as keyof ThresholdUpdate]}{f.suffix}
                </span>
              </div>
              <input
                type="range" min={f.min} max={f.max}
                value={thresholds[f.key as keyof ThresholdUpdate] ?? f.min}
                onChange={e => setThresholds(t => ({ ...t, [f.key]: +e.target.value }))}
                className="w-full"
              />
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
                <span>{f.min}{f.suffix}</span>
                <span>{f.max}{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-gray-100">
          <Button variant="primary" size="sm" loading={saving} onClick={saveThresholds}>
            Apply Thresholds
          </Button>
          <span className="text-[12px] text-gray-400">Changes will recalculate triggers on all products</span>
        </div>
      </Card>

      {/* Full metrics table */}
      <Card noPad>
        <div className="px-6 pt-6 pb-0">
          <CardTitle icon={<TrendingUp size={14} />}>Product Metrics Table</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-100">
                {['Product', 'Stock', '7-Day Avg', 'Trend', 'Days Left', 'Expiry', 'Status'].map(h => (
                  <th key={h} className="text-left px-6 py-2.5 font-semibold text-gray-400 text-[10px] uppercase tracking-wider bg-gray-50/60 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data && Object.entries(data.metrics).map(([name, m]) => {
                const trigger = data.triggers.find(t => t.product === name)
                return (
                  <tr key={name} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3 font-medium text-[13px] text-gray-800 capitalize whitespace-nowrap">{name}</td>
                    <td className="px-6 py-3 font-mono-custom text-[12px] font-semibold text-gray-700">{m.current_stock}</td>
                    <td className="px-6 py-3 font-mono-custom text-[12px] text-gray-600">{m.avg_daily_sales_7d}</td>
                    <td className="px-6 py-3">
                      <div className={`inline-flex items-center gap-1 text-[12px] font-semibold ${m.trend_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.trend_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {fmtPct(m.trend_pct)}
                      </div>
                    </td>
                    <td className={`px-6 py-3 font-mono-custom text-[12px] font-semibold ${m.days_of_stock_left < 5 ? 'text-red-500' : m.days_of_stock_left < 10 ? 'text-amber-500' : 'text-gray-700'}`}>
                      {m.days_of_stock_left === 999 ? '∞' : m.days_of_stock_left}d
                    </td>
                    <td className={`px-6 py-3 font-mono-custom text-[11px] ${m.days_until_expiry < 14 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      {m.expiry_date}
                    </td>
                    <td className="px-6 py-3">
                      {trigger
                        ? <Badge variant={trigger.action === 'discount' ? 'orange' : 'violet'}>{trigger.action}</Badge>
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
