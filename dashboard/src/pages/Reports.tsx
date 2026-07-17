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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-[24px] tracking-tight" style={{ color: '#F1F5F9' }}>
            📄 Reports
          </h1>
          <p className="text-[13px] mt-1" style={{ color: '#475569' }}>Full product inventory, sales metrics, and action summary.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Download size={14}/>} onClick={exportCSV}>
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<span>📦</span>} label="Total Products" value={data ? Object.keys(data.metrics).length : '—'} color="green" />
        <StatCard icon={<span>🏷️</span>} label="Discount Needed" value={data?.discount_triggers.length ?? '—'} color="orange" />
        <StatCard icon={<span>📥</span>} label="Restock Needed" value={data?.restock_triggers.length ?? '—'} color="violet" />
        <StatCard icon={<span>✅</span>} label="Healthy" value={data?.baseline_products.length ?? '—'} color="cyan" />
      </div>

      {/* Candidates */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Discount candidates */}
        <Card>
          <CardTitle icon={<span>🏷️</span>}>Discount Candidates</CardTitle>
          {data?.discount_triggers.length === 0 ? (
            <div className="text-center py-8 text-[13px]" style={{ color: '#475569' }}>✅ None — no products near expiry</div>
          ) : (
            <div className="space-y-2.5">
              {data?.discount_triggers.map((t, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3.5 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] capitalize" style={{ color: '#E2E8F0' }}>{t.product}</div>
                    <div className="font-mono-custom text-[11px] mt-0.5" style={{ color: '#FCD34D' }}>{t.suggested_value}</div>
                    <div className="text-[10px] mt-1" style={{ color: '#475569' }}>Expires in {t.expiry_days}d · {t.avg_daily_sales_7d}/day</div>
                  </div>
                  <Badge variant={t.urgency === 'urgent' ? 'red' : 'orange'}>{t.urgency}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Restock candidates */}
        <Card>
          <CardTitle icon={<span>📥</span>}>Restock Candidates</CardTitle>
          {data?.restock_triggers.length === 0 ? (
            <div className="text-center py-8 text-[13px]" style={{ color: '#475569' }}>✅ None — all products well stocked</div>
          ) : (
            <div className="space-y-2.5">
              {data?.restock_triggers.map((t, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3.5 rounded-xl"
                  style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] capitalize" style={{ color: '#E2E8F0' }}>{t.product}</div>
                    <div className="font-mono-custom text-[11px] mt-0.5" style={{ color: '#A78BFA' }}>{t.suggested_value}</div>
                    <div className="text-[10px] mt-1" style={{ color: '#475569' }}>{t.days_of_stock_left}d left · {fmtPct(t.trend_pct)} trend</div>
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
        <div className="px-5 pt-5 pb-3">
          <CardTitle icon={<span>📋</span>}>Full Inventory Report</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {['Product','Category','Supplier','Cost','MRP','Stock','7d Avg','Trend','Days Left','Expiry','Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap" style={{ color: '#475569' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data && Object.entries(data.metrics).map(([name, m]) => {
                const md = master?.[name]
                const trigger = data.triggers.find(t => t.product === name)
                return (
                  <tr key={name} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 font-semibold capitalize whitespace-nowrap" style={{ color: '#E2E8F0' }}>{name}</td>
                    <td className="px-4 py-3"><Badge variant="gray">{md?.category || '—'}</Badge></td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: '#475569' }}>{md?.supplier || '—'}</td>
                    <td className="px-4 py-3 font-mono-custom" style={{ color: '#64748B' }}>{md ? fmtCurrency(md.cost_price) : '—'}</td>
                    <td className="px-4 py-3 font-mono-custom" style={{ color: '#94A3B8' }}>{md ? fmtCurrency(md.selling_price) : '—'}</td>
                    <td className="px-4 py-3 font-mono-custom font-semibold" style={{ color: '#F1F5F9' }}>{m.current_stock}</td>
                    <td className="px-4 py-3 font-mono-custom" style={{ color: '#64748B' }}>{m.avg_daily_sales_7d}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.trend_pct >= 0 ? 'green' : 'red'}>{fmtPct(m.trend_pct)}</Badge>
                    </td>
                    <td
                      className="px-4 py-3 font-mono-custom font-bold"
                      style={{ color: m.days_of_stock_left < 5 ? '#F87171' : m.days_of_stock_left < 10 ? '#FCD34D' : '#94A3B8' }}
                    >
                      {m.days_of_stock_left === 999 ? '∞' : `${m.days_of_stock_left}d`}
                    </td>
                    <td
                      className="px-4 py-3 font-mono-custom text-[11px]"
                      style={{ color: m.days_until_expiry < 14 ? '#F87171' : '#475569' }}
                    >
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
