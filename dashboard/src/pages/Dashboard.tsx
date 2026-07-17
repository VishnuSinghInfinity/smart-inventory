import { useEffect, useState } from 'react'
import { Package, TrendingUp, AlertTriangle, CheckCircle, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, type SalesMetricsResponse, type ProductMaster } from '../lib/api'
import { Card, CardTitle } from '../components/ui/Card'
import { StatCard, LoadingState, EmptyState, Button } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { fmt, fmtCurrency } from '../lib/utils'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

const COLORS = ['#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899']

export default function Dashboard() {
  const [metrics, setMetrics] = useState<SalesMetricsResponse | null>(null)
  const [master, setMaster] = useState<Record<string, ProductMaster> | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.allSettled([
      api.getSalesMetrics(),
      api.getInventoryMaster(),
    ]).then(([m, ms]) => {
      if (m.status === 'fulfilled') setMetrics(m.value)
      if (ms.status === 'fulfilled') setMaster(ms.value.master)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState message="Loading dashboard..." />

  // Build chart data
  const prods = metrics ? Object.keys(metrics.history).slice(0, 5) : []
  const chartData = metrics ? Array.from({ length: 30 }, (_, i) => {
    const pt: Record<string, unknown> = { day: `D${i + 1}` }
    prods.forEach(p => { pt[p] = metrics.history[p]?.[i] ?? 0 })
    return pt
  }) : []

  const inventory = metrics ? Object.entries(metrics.metrics) : []
  const totalStock = inventory.reduce((s, [, m]) => s + m.current_stock, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-[24px] tracking-tight shine-text">
          ⚡ ShelfSense Overview
        </h1>
        <p className="text-[13px] mt-1 max-w-lg" style={{ color: '#475569' }}>
          Live inventory intelligence, sales velocity, and AI-driven restock signals — all in one place.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={<Package size={18}/>} label="Total SKUs" value={inventory.length} color="green" />
        <StatCard icon={<ShoppingCart size={18}/>} label="Total Stock" value={fmt(totalStock)} color="violet" />
        <StatCard
          icon={<AlertTriangle size={18}/>}
          label="Discount Needed"
          value={metrics?.discount_triggers.length ?? 0}
          color="orange"
          badge={metrics && metrics.discount_triggers.length > 0 ? 'Attention' : undefined}
          badgeColor="down"
        />
        <StatCard
          icon={<TrendingUp size={18}/>}
          label="Restock Needed"
          value={metrics?.restock_triggers.length ?? 0}
          color="red"
          badge={metrics && metrics.restock_triggers.length > 0 ? 'Critical' : undefined}
          badgeColor="down"
        />
        <StatCard icon={<CheckCircle size={18}/>} label="Healthy Products" value={metrics?.baseline_products.length ?? 0} color="cyan" />
      </div>

      {/* Chart + Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Chart */}
        <Card className="xl:col-span-2" hover>
          <CardTitle icon={<span>📈</span>}>30-Day Sales Trend (Top SKUs)</CardTitle>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#475569' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0F1420',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: 12,
                    color: '#E2E8F0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748B' }} />
                {prods.map((p, i) => (
                  <Line
                    key={p} type="monotone" dataKey={p}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2} dot={false}
                    name={p}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📈" title="No data" sub="Run detection or load sample data first." />
          )}
        </Card>

        {/* Action panel */}
        <Card hover>
          <CardTitle icon={<span>🎯</span>}>Action Required</CardTitle>
          {metrics && (metrics.discount_triggers.length + metrics.restock_triggers.length) > 0 ? (
            <div className="space-y-2">
              {[...metrics.discount_triggers, ...metrics.restock_triggers].slice(0, 6).map((t, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2.5 px-3 rounded-xl"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span className="text-lg flex-shrink-0">{t.action === 'discount' ? '🏷️' : '📥'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] capitalize truncate" style={{ color: '#E2E8F0' }}>{t.product}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#475569' }}>{t.suggested_value}</div>
                  </div>
                  <Badge variant={t.urgency === 'urgent' ? 'red' : t.urgency === 'high' ? 'orange' : 'violet'}>
                    {t.urgency}
                  </Badge>
                </div>
              ))}
              <Button variant="secondary" size="sm" className="w-full mt-2 justify-center" onClick={() => navigate('/assistant')}>
                View All Recommendations →
              </Button>
            </div>
          ) : (
            <EmptyState icon="✅" title="All Clear" sub="No immediate actions needed." />
          )}
        </Card>
      </div>

      {/* Inventory mini-grid + Product master */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Mini shelf grid */}
        <Card>
          <CardTitle icon={<span>📦</span>}>Live Inventory Snapshot</CardTitle>
          {inventory.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {inventory.slice(0, 9).map(([name, m]) => {
                const trigger = metrics?.triggers.find(t => t.product === name)
                const colorMap = {
                  orange: { border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)', badge: 'orange' as const },
                  red:    { border: 'rgba(239,68,68,0.4)',  bg: 'rgba(239,68,68,0.06)',  badge: 'red' as const },
                  green:  { border: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.06)', badge: 'green' as const },
                }
                const cls = trigger?.action === 'discount' ? colorMap.orange : trigger?.action === 'restock' ? colorMap.red : colorMap.green
                return (
                  <div
                    key={name}
                    className="rounded-xl p-3 relative overflow-hidden card-hover"
                    style={{ border: `1px solid ${cls.border}`, background: cls.bg }}
                  >
                    <div className="text-[11px] font-semibold capitalize truncate mb-1" style={{ color: '#64748B' }}>{name}</div>
                    <div className="font-mono-custom text-[22px] font-bold mb-2" style={{ color: '#F1F5F9' }}>{m.current_stock}</div>
                    <Badge variant={cls.badge} className="mt-1">
                      {trigger?.action.toUpperCase() ?? 'OK'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon="📷" title="No scan yet" sub="Go to Inventory Monitoring to get started." />
          )}
        </Card>

        {/* Product master table */}
        <Card noPad>
          <div className="px-5 pt-5 pb-3">
            <CardTitle icon={<span>🏪</span>}>Product Catalog (inventory.csv)</CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Product','Category','Stock','MRP','Expiry'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-bold uppercase tracking-wider text-[10px]" style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {master ? Object.entries(master).map(([name, d]) => (
                  <tr
                    key={name}
                    className="table-row-hover transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-3 font-semibold capitalize" style={{ color: '#E2E8F0' }}>{name}</td>
                    <td className="px-4 py-3"><Badge variant="gray">{d.category}</Badge></td>
                    <td className="px-4 py-3 font-mono-custom font-semibold" style={{ color: '#F1F5F9' }}>{d.current_stock}</td>
                    <td className="px-4 py-3 font-mono-custom" style={{ color: '#94A3B8' }}>{fmtCurrency(d.selling_price)}</td>
                    <td className={`px-4 py-3 font-mono-custom text-[11px]`} style={{ color: d.days_until_expiry < 14 ? '#F87171' : '#475569' }}>
                      {d.expiry_date}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: '#475569' }}>No master data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
