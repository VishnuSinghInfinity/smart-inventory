import { useEffect, useState } from 'react'
import { Package, TrendingUp, AlertTriangle, CheckCircle, ShoppingCart, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, type SalesMetricsResponse, type ProductMaster } from '../lib/api'
import { Card, CardTitle } from '../components/ui/Card'
import { StatCard, LoadingState, EmptyState, Button } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { fmt, fmtCurrency } from '../lib/utils'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9', '#8B5CF6']

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
    <div className="space-y-7">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Live inventory intelligence, sales velocity, and AI-driven restock signals.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Live
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={<Package size={16} />} label="Total SKUs" value={inventory.length} color="violet" />
        <StatCard icon={<ShoppingCart size={16} />} label="Total Stock" value={fmt(totalStock)} color="green" />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label="Discount Needed"
          value={metrics?.discount_triggers.length ?? 0}
          color="orange"
          badge={metrics && metrics.discount_triggers.length > 0 ? 'Action' : undefined}
          badgeColor="down"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Restock Needed"
          value={metrics?.restock_triggers.length ?? 0}
          color="red"
          badge={metrics && metrics.restock_triggers.length > 0 ? 'Critical' : undefined}
          badgeColor="down"
        />
        <StatCard icon={<CheckCircle size={16} />} label="Healthy Products" value={metrics?.baseline_products.length ?? 0} color="cyan" />
      </div>

      {/* Chart + Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Chart */}
        <Card className="xl:col-span-2">
          <CardTitle icon={<TrendingUp size={14} />}>
            30-Day Sales Trend
          </CardTitle>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="2 6" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '8px 12px'
                  }}
                  cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
                {prods.map((p, i) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={p}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    name={p}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📈" title="No data" sub="Run detection or load sample data first." />
          )}
        </Card>

        {/* Action panel */}
        <Card>
          <CardTitle icon={<AlertTriangle size={14} />}>Action Required</CardTitle>
          {metrics && (metrics.discount_triggers.length + metrics.restock_triggers.length) > 0 ? (
            <div className="space-y-1">
              {[...metrics.discount_triggers, ...metrics.restock_triggers].slice(0, 6).map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-xs ${
                    t.action === 'discount'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {t.action === 'discount' ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[13px] text-gray-800 capitalize truncate">{t.product}</div>
                    <div className="text-[11px] text-gray-400 truncate">{t.suggested_value}</div>
                  </div>
                  <Badge variant={t.urgency === 'urgent' ? 'red' : t.urgency === 'high' ? 'orange' : 'gray'}>
                    {t.urgency}
                  </Badge>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center mt-3"
                icon={<ArrowRight size={12} />}
                onClick={() => navigate('/assistant')}
              >
                View All Recommendations
              </Button>
            </div>
          ) : (
            <EmptyState icon="✓" title="All Clear" sub="No immediate actions needed." />
          )}
        </Card>
      </div>

      {/* Inventory snapshot + product catalog */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Mini shelf grid */}
        <Card>
          <CardTitle icon={<Package size={14} />}>Live Inventory Snapshot</CardTitle>
          {inventory.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {inventory.slice(0, 9).map(([name, m]) => {
                const trigger = metrics?.triggers.find(t => t.product === name)
                const cls = trigger?.action === 'discount'
                  ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'orange' as const, label: 'Discount' }
                  : trigger?.action === 'restock'
                    ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'red' as const, label: 'Restock' }
                    : { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'green' as const, label: 'OK' }

                return (
                  <div key={name} className={`rounded-xl p-3.5 border ${cls.bg} ${cls.border}`}>
                    <div className="text-[11px] font-medium text-gray-500 capitalize truncate mb-1.5">{name}</div>
                    <div className="font-mono-custom text-[24px] font-bold text-gray-900 leading-none mb-2">{m.current_stock}</div>
                    <Badge variant={cls.badge}>{cls.label}</Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon="📷" title="No scan yet" sub="Go to Inventory Monitoring to get started." />
          )}
        </Card>

        {/* Product catalog table */}
        <Card noPad>
          <div className="px-6 pt-6 pb-0">
            <CardTitle icon={<ShoppingCart size={14} />}>Product Catalog</CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-gray-100">
                  {['Product', 'Category', 'Stock', 'MRP', 'Expiry'].map(h => (
                    <th key={h} className="text-left px-6 py-2.5 font-semibold text-gray-400 text-[10px] uppercase tracking-wider bg-gray-50/60 first:rounded-tl-none last:rounded-tr-none">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {master ? Object.entries(master).map(([name, d]) => (
                  <tr key={name} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors group">
                    <td className="px-6 py-3 font-medium text-[13px] text-gray-800 capitalize">{name}</td>
                    <td className="px-6 py-3"><Badge variant="gray">{d.category}</Badge></td>
                    <td className="px-6 py-3 font-mono-custom text-[12px] font-semibold text-gray-700">{d.current_stock}</td>
                    <td className="px-6 py-3 font-mono-custom text-[12px] text-gray-600">{fmtCurrency(d.selling_price)}</td>
                    <td className={`px-6 py-3 font-mono-custom text-[11px] ${d.days_until_expiry < 14 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      {d.expiry_date}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-[13px] text-gray-400">
                      No master data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
