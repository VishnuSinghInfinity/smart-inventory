import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
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
      else setMsg({ type: 'success', text: '✅ AI recommendations generated!' })
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
    headline: t.action === 'discount' ? `Discount ${t.product.replace(/_/g,' ')}` : `Restock ${t.product.replace(/_/g,' ')}`,
    detail: t.action === 'discount'
      ? `Expires in ${t.expiry_days}d, selling ~${t.avg_daily_sales_7d}/day. ${t.suggested_value}`
      : `Only ${t.days_of_stock_left}d of stock left at ~${t.avg_daily_sales_7d}/day (${fmtPct(t.trend_pct)} vs last week). ${t.suggested_value}`
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-[24px] tracking-tight text-gray-900">🤖 AI Sales Assistant</h1>
        <p className="text-sm text-gray-500 mt-1">
          Rule-based triggers meet AI copy. Groq generates precise discount and restock messaging.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<span>📊</span>} label="Products Tracked" value={data ? Object.keys(data.metrics).length : '—'} color="green" />
        <StatCard icon={<span>🏷️</span>} label="Discount Actions" value={data?.discount_triggers.length ?? '—'} color="orange" />
        <StatCard icon={<span>📥</span>} label="Restock Actions" value={data?.restock_triggers.length ?? '—'} color="violet" />
        <StatCard icon={<span>✅</span>} label="Healthy Products" value={data?.baseline_products.length ?? '—'} color="cyan" />
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      {/* Recommendation panel */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle icon={<span className="bg-violet-50">✨</span>} className="mb-0">
            {recommendations ? 'AI-Generated' : 'Rule-Based'} Recommendations
          </CardTitle>
          <Button variant="primary" size="sm" loading={genLoading} icon={<Sparkles size={14}/>} onClick={generate}>
            ✨ Generate AI Copy
          </Button>
        </div>

        {!recommendations && (
          <Alert variant="info" icon="💡">
            Showing rule-based summaries — click "Generate AI Copy" for Groq-powered recommendations.
          </Alert>
        )}

        {displayed.length === 0 ? (
          <EmptyState icon="✅" title="All Clear" sub="No actions needed. Every product is well stocked and not near expiry." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {displayed.map((item, i) => (
              <div
                key={i}
                className={`relative border-l-4 rounded-2xl p-5 border border-gray-200 card-hover ${
                  item.action === 'discount' ? 'border-l-amber-400' : 'border-l-violet-500'
                }`}
              >
                {/* Action pill */}
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3 ${
                  item.action === 'discount' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'
                }`}>
                  {item.urgency === 'urgent' ? '🔥' : item.urgency === 'high' ? '⚠️' : '💡'}
                  {item.action.toUpperCase()} · {item.urgency.toUpperCase()}
                </div>

                {/* Headline */}
                <h3 className="font-heading font-bold text-[15px] text-gray-900 mb-2 capitalize">
                  {item.headline}
                </h3>

                {/* Detail */}
                <p className="text-[12px] text-gray-500 leading-relaxed mb-3">{item.detail}</p>

                {/* Value */}
                <div className={`inline-block font-mono-custom text-[12px] font-bold px-3 py-1.5 rounded-lg mb-3 ${
                  item.action === 'discount' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'
                }`}>
                  {item.suggested_value}
                </div>

                {/* Meta */}
                <div className="text-[10px] font-mono-custom text-gray-400 flex flex-wrap gap-2">
                  <span>Stock: {item.current_stock}</span>
                  <span>·</span>
                  <span>{item.avg_daily_sales_7d}/day</span>
                  <span>·</span>
                  <span className={item.trend_pct >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {fmtPct(item.trend_pct)} trend
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Business as Usual */}
      {data && data.baseline_products.length > 0 && (
        <Card>
          <CardTitle icon={<span className="bg-green-50">✅</span>}>Business As Usual</CardTitle>
          <div className="space-y-2">
            {data.baseline_products.map(p => {
              const m = data.metrics[p]
              return (
                <div key={p} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="font-semibold text-[13px] capitalize">{p}</span>
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
