import { useState, useEffect } from 'react'
import { Download, FileText, TrendingUp, TrendingDown, Package, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { api, type SalesMetricsResponse, type ProductMaster } from '../lib/api'
import { Card, CardTitle } from '../components/ui/Card'
import { StatCard, LoadingState, Button } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { fmtPct, fmtCurrency } from '../lib/utils'

export default function Reports() {
  const [data, setData] = useState<SalesMetricsResponse | null>(null)
  const [master, setMaster] = useState<Record<string, ProductMaster> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([api.getSalesMetrics(), api.getInventoryMaster()]).then(([m, ms]) => {
      if (m.status === 'fulfilled') setData(m.value)
      if (ms.status === 'fulfilled') setMaster(ms.value.master)
    }).finally(() => setLoading(false))
  }, [])

  function exportCSV() {
    if (!data || !master) return
    const rows = Object.entries(data.metrics).map(([name, m]) => {
      const md = master[name] || {}
      const trigger = data.triggers.find(t => t.product === name)
      return [
        name, md.category || '', md.supplier || '',
        md.cost_price || '', md.selling_price || '',
        m.current_stock, m.avg_daily_sales_7d,
        m.trend_pct.toFixed(2),
        m.days_of_stock_left === 999 ? '∞' : m.days_of_stock_left,
        m.expiry_date,
        trigger?.action || 'ok'
      ].map(v => `"${v}"`).join(',')
    })
    const header = 'Product,Category,Supplier,Cost,MRP,Stock,7dAvg,Trend,DaysLeft,Expiry,Action'
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'shelfsense_report.csv'
    a.click()
  }

  if (loading) return <LoadingState message="Building report..." />

  const healthyCount = data?.baseline_products.length ?? 0
  const discountCount = data?.discount_triggers.length ?? 0
  const restockCount = data?.restock_triggers.length ?? 0
  const totalProducts = data ? Object.keys(data.metrics).length : 0
  const healthScore = totalProducts > 0 ? Math.round((healthyCount / totalProducts) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Executive inventory report with full product metrics and action summary.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download size={13} />} onClick={exportCSV}>
          Export CSV
        </Button>
      </div>

      {/* Health score banner */}
      {data && (
        <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Inventory Health Score</div>
              <div className="text-[36px] font-bold text-gray-900 leading-none tracking-tight">
                {healthScore}<span className="text-[20px] text-gray-400">%</span>
              </div>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${
              healthScore >= 80 ? 'border-emerald-300 bg-emerald-50 text-emerald-700' :
              healthScore >= 60 ? 'border-amber-300 bg-amber-50 text-amber-700' :
              'border-red-300 bg-red-50 text-red-700'
            }`}>
              {healthScore >= 80 ? '✓' : healthScore >= 60 ? '!' : '✕'}
            </div>
          </div>
          {/* Health bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                healthScore >= 80 ? 'bg-emerald-500' :
                healthScore >= 60 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{healthyCount} healthy</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />{discountCount} discount needed</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />{restockCount} restock needed</span>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Package size={16} />} label="Total Products" value={totalProducts} color="green" />
        <StatCard icon={<AlertTriangle size={16} />} label="Discount Needed" value={discountCount} color="orange" />
        <StatCard icon={<RefreshCw size={16} />} label="Restock Needed" value={restockCount} color="violet" />
        <StatCard icon={<CheckCircle2 size={16} />} label="Healthy" value={healthyCount} color="cyan" />
      </div>

      {/* Candidates panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Discount candidates */}
        <Card>
          <CardTitle icon={<TrendingDown size={14} />}>Discount Candidates</CardTitle>
          {data?.discount_triggers.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-gray-400">
              No products near expiry
            </div>
          ) : (
            <div className="space-y-2">
              {data?.discount_triggers.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 bg-amber-50/60 border border-amber-100 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                    <TrendingDown size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-gray-800 capitalize">{t.product}</div>
                    <div className="font-mono-custom text-[11px] text-amber-700 mt-0.5">{t.suggested_value}</div>
                    <div className="text-[10px] text-gray-400 mt-1">Expires in {t.expiry_days}d · {t.avg_daily_sales_7d}/day</div>
                  </div>
                  <Badge variant={t.urgency === 'urgent' ? 'red' : 'orange'}>{t.urgency}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Restock candidates */}
        <Card>
          <CardTitle icon={<TrendingUp size={14} />}>Restock Candidates</CardTitle>
          {data?.restock_triggers.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-gray-400">
              All products well stocked
            </div>
          ) : (
            <div className="space-y-2">
              {data?.restock_triggers.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 flex-shrink-0">
                    <TrendingUp size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-gray-800 capitalize">{t.product}</div>
                    <div className="font-mono-custom text-[11px] text-indigo-700 mt-0.5">{t.suggested_value}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{t.days_of_stock_left}d left · {fmtPct(t.trend_pct)} trend</div>
                  </div>
                  <Badge variant={t.urgency === 'urgent' ? 'red' : 'violet'}>{t.urgency}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Full report table */}
      <Card noPad>
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-5">
            <CardTitle icon={<FileText size={14} />} className="mb-0">Full Inventory Report</CardTitle>
            <Button variant="secondary" size="sm" icon={<Download size={12} />} onClick={exportCSV}>
              Export
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-100">
                {['Product', 'Category', 'Supplier', 'Cost', 'MRP', 'Stock', '7d Avg', 'Trend', 'Days Left', 'Expiry', 'Action'].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 font-semibold text-gray-400 text-[10px] uppercase tracking-wider bg-gray-50/60 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data && Object.entries(data.metrics).map(([name, m]) => {
                const md = master?.[name]
                const trigger = data.triggers.find(t => t.product === name)
                return (
                  <tr key={name} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-3 font-medium text-[13px] text-gray-800 capitalize whitespace-nowrap">{name}</td>
                    <td className="px-5 py-3"><Badge variant="gray">{md?.category || '—'}</Badge></td>
                    <td className="px-5 py-3 text-[12px] text-gray-400">{md?.supplier || '—'}</td>
                    <td className="px-5 py-3 font-mono-custom text-[12px] text-gray-600">{md ? fmtCurrency(md.cost_price) : '—'}</td>
                    <td className="px-5 py-3 font-mono-custom text-[12px] font-semibold text-gray-700">{md ? fmtCurrency(md.selling_price) : '—'}</td>
                    <td className="px-5 py-3 font-mono-custom text-[12px] font-semibold text-gray-800">{m.current_stock}</td>
                    <td className="px-5 py-3 font-mono-custom text-[12px] text-gray-600">{m.avg_daily_sales_7d}</td>
                    <td className="px-5 py-3">
                      <div className={`inline-flex items-center gap-1 text-[12px] font-semibold ${m.trend_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.trend_pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {fmtPct(m.trend_pct)}
                      </div>
                    </td>
                    <td className={`px-5 py-3 font-mono-custom text-[12px] font-bold ${m.days_of_stock_left < 5 ? 'text-red-500' : m.days_of_stock_left < 10 ? 'text-amber-500' : 'text-gray-700'}`}>
                      {m.days_of_stock_left === 999 ? '∞' : `${m.days_of_stock_left}d`}
                    </td>
                    <td className={`px-5 py-3 font-mono-custom text-[11px] ${m.days_until_expiry < 14 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      {m.expiry_date}
                    </td>
                    <td className="px-5 py-3">
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
