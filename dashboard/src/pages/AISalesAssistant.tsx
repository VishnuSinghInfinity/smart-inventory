import { useState, useEffect } from 'react'
import { Sparkles, Bot, TrendingUp, TrendingDown, CheckCircle2, Package } from 'lucide-react'
import { api, type SalesMetricsResponse, type Recommendation } from '../lib/api'
import { Card, CardTitle } from '../components/ui/Card'
import { StatCard, LoadingState, Button, EmptyState } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Badge'
import { fmtPct } from '../lib/utils'

export default function AISalesAssistant() {
  const [data, setData] = useState<SalesMetricsResponse | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [genLoading, setGenLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success'|'error'|'info'; text: string } | null>(null)

  useEffect(() => {
    api.getSalesMetrics().then(setData).finally(() => setLoading(false))
  }, [])

  async function generate() {
    if (!data) return
    setGenLoading(true)
    setMsg(null)
    const triggers = [...data.discount_triggers, ...data.restock_triggers]
    try {
      const res = await api.generateRecommendations(triggers)
      setRecommendations(res.recommendations)
      if (res.warning) setMsg({ type: 'info', text: res.warning })
      else setMsg({ type: 'success', text: 'AI recommendations generated successfully.' })
    } catch(e: unknown) {
      setMsg({ type: 'error', text: 'Error: ' + (e instanceof Error ? e.message : 'Unknown') })
    } finally {
      setGenLoading(false)
    }
  }

  if (loading) return <LoadingState message="Loading assistant..." />

  const triggers = data ? [...data.discount_triggers, ...data.restock_triggers] : []
  const displayed = recommendations ?? triggers.map(t => ({
    ...t,
    headline: t.action === 'discount'
      ? `Discount ${t.product.replace(/_/g,' ')}`
      : `Restock ${t.product.replace(/_/g,' ')}`,
    detail: t.action === 'discount'
      ? `Expires in ${t.expiry_days}d, selling ~${t.avg_daily_sales_7d}/day. ${t.suggested_value}`
      : `Only ${t.days_of_stock_left}d of stock left at ~${t.avg_daily_sales_7d}/day (${fmtPct(t.trend_pct)} vs last week). ${t.suggested_value}`
  }))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">AI Sales Assistant</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Rule-based triggers meet AI copy. Groq generates precise discount and restock messaging.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={genLoading}
          icon={<Sparkles size={13} />}
          onClick={generate}
        >
          Generate AI Copy
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Package size={16} />} label="Products Tracked" value={data ? Object.keys(data.metrics).length : '—'} color="green" />
        <StatCard icon={<TrendingDown size={16} />} label="Discount Actions" value={data?.discount_triggers.length ?? '—'} color="orange" />
        <StatCard icon={<TrendingUp size={16} />} label="Restock Actions" value={data?.restock_triggers.length ?? '—'} color="violet" />
        <StatCard icon={<CheckCircle2 size={16} />} label="Healthy Products" value={data?.baseline_products.length ?? '—'} color="cyan" />
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      {/* Recommendations */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <CardTitle icon={<Bot size={14} />} className="mb-0">
            {recommendations ? 'AI-Generated Recommendations' : 'Rule-Based Recommendations'}
          </CardTitle>
        </div>

        {!recommendations && (
          <Alert variant="info">
            Showing rule-based summaries. Click "Generate AI Copy" above for Groq-powered recommendations.
          </Alert>
        )}

        {displayed.length === 0 ? (
          <EmptyState
            icon="✓"
            title="All Clear"
            sub="No actions needed. Every product is well stocked and not near expiry."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {displayed.map((item, i) => {
              const isDiscount = item.action === 'discount'
              const urgencyIcon = item.urgency === 'urgent' ? '🔴' : item.urgency === 'high' ? '🟡' : '🟢'
              return (
                <div
                  key={i}
                  className={`relative rounded-xl border p-5 transition-all duration-150 hover:-translate-y-0.5 ${
                    isDiscount
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-indigo-200 bg-indigo-50/30'
                  }`}
                >
                  {/* Type + urgency row */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={isDiscount ? 'orange' : 'violet'}>
                      {item.action}
                    </Badge>
                    <span className="text-[11px] text-gray-400 font-medium capitalize">
                      {urgencyIcon} {item.urgency}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3 className="font-semibold text-[14px] text-gray-900 mb-2 capitalize leading-snug">
                    {item.headline}
                  </h3>

                  {/* Detail */}
                  <p className="text-[12px] text-gray-500 leading-relaxed mb-3">{item.detail}</p>

                  {/* Suggested value */}
                  <div className={`inline-block font-mono-custom text-[11px] font-bold px-2.5 py-1 rounded-md mb-4 ${
                    isDiscount
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {item.suggested_value}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-3 border-t border-gray-100">
                    <span className="font-mono-custom">Stock: <span className="font-semibold text-gray-600">{item.current_stock}</span></span>
                    <span className="text-gray-200">·</span>
                    <span className="font-mono-custom">{item.avg_daily_sales_7d}/day</span>
                    <span className="text-gray-200">·</span>
                    <span className={cn(
                      'flex items-center gap-0.5 font-semibold',
                      item.trend_pct >= 0 ? 'text-emerald-600' : 'text-red-500'
                    )}>
                      {item.trend_pct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {fmtPct(item.trend_pct)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Business as Usual */}
      {data && data.baseline_products.length > 0 && (
        <Card>
          <CardTitle icon={<CheckCircle2 size={14} />}>Healthy Products</CardTitle>
          <div className="space-y-1.5">
            {data.baseline_products.map(p => {
              const m = data.metrics[p]
              return (
                <div key={p} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-gray-50/60 border border-gray-100 hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-[13px] text-gray-700 capitalize">{p}</span>
                  <div className="flex gap-2">
                    <Badge variant="gray">{m.days_of_stock_left === 999 ? '∞' : m.days_of_stock_left}d stock</Badge>
                    <Badge variant="green">expires {m.days_until_expiry}d</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
