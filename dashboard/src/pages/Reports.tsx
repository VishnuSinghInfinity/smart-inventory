import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-[24px] tracking-tight text-gray-900">📄 Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Full product inventory, sales metrics, and action summary.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={exportCSV}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<span>📦</span>} label="Total Products" value={data ? Object.keys(data.metrics).length : '—'} color="green" />
        <StatCard icon={<span>🏷️</span>} label="Discount Needed" value={data?.discount_triggers.length ?? '—'} color="orange" />
        <StatCard icon={<span>📥</span>} label="Restock Needed" value={data?.restock_triggers.length ?? '—'} color="violet" />
        <StatCard icon={<span>✅</span>} label="Healthy" value={data?.baseline_products.length ?? '—'} color="cyan" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Discount candidates */}
        <Card>
          <CardTitle icon={<span className="bg-amber-50">🏷️</span>}>Discount Candidates</CardTitle>
          {data?.discount_triggers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">✅ None — no products near expiry</div>
          ) : (
            <div className="space-y-2.5">
              {data?.discount_triggers.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] capitalize">{t.product}</div>
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
          <CardTitle icon={<span className="bg-violet-50">📥</span>}>Restock Candidates</CardTitle>
          {data?.restock_triggers.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">✅ None — all products well stocked</div>
          ) : (
            <div className="space-y-2.5">
              {data?.restock_triggers.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-violet-50/50 border border-violet-100 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] capitalize">{t.product}</div>
                    <div className="font-mono-custom text-[11px] text-violet-700 mt-0.5">{t.suggested_value}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{t.days_of_stock_left}d left · {fmtPct(t.trend_pct)} trend</div>
                  </div>
                  <Badge variant={t.urgency === 'urgent' ? 'red' : 'violet'}>{t.urgency}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Full table */}
      <Card noPad>
        <div className="px-6 pt-6 pb-3">
          <CardTitle icon={<span className="bg-violet-50">📋</span>}>Full Inventory Report</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                {['Product','Category','Supplier','Cost','MRP','Stock','7d Avg','Trend','Days Left','Expiry','Action'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data && Object.entries(data.metrics).map(([name, m]) => {
                const md = master?.[name]
                const trigger = data.triggers.find(t => t.product === name)
                return (
                  <tr key={name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold capitalize whitespace-nowrap">{name}</td>
                    <td className="px-4 py-3"><Badge variant="gray">{md?.category || '—'}</Badge></td>
                    <td className="px-4 py-3 text-gray-400 text-[11px]">{md?.supplier || '—'}</td>
                    <td className="px-4 py-3 font-mono-custom">{md ? fmtCurrency(md.cost_price) : '—'}</td>
                    <td className="px-4 py-3 font-mono-custom">{md ? fmtCurrency(md.selling_price) : '—'}</td>
                    <td className="px-4 py-3 font-mono-custom font-semibold">{m.current_stock}</td>
                    <td className="px-4 py-3 font-mono-custom">{m.avg_daily_sales_7d}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.trend_pct >= 0 ? 'green' : 'red'}>{fmtPct(m.trend_pct)}</Badge>
                    </td>
                    <td className={`px-4 py-3 font-mono-custom font-bold ${m.days_of_stock_left < 5 ? 'text-red-500' : m.days_of_stock_left < 10 ? 'text-amber-500' : 'text-gray-700'}`}>
                      {m.days_of_stock_left === 999 ? '∞' : `${m.days_of_stock_left}d`}
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
