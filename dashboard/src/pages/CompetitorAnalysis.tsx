import { useState, useEffect } from 'react'
import { Play } from 'lucide-react'
import { api, type PipelineEvent, type RestockRow } from '../lib/api'
import { useInventoryStore } from '../hooks/useInventoryStore'
import { Card, CardTitle } from '../components/ui/Card'
import { Button, EmptyState } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Badge'
import { cn, parsePriceValue } from '../lib/utils'

const STAGE_LABELS = ['Search', 'Verify', 'Decide']

interface LogLine { time: string; stage: string; status: string; msg: string }

export default function CompetitorAnalysis() {
  const { inventory, setInventory } = useInventoryStore()
  const [threshold] = useState(70)
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState(-1)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [results, setResults] = useState<RestockRow[] | null>(null)
  const [rawOutput, setRawOutput] = useState<string | null>(null)

  useEffect(() => {
    if (!inventory) {
      api.getInventory().then(res => {
        if (res.inventory) {
          setInventory(res.inventory)
        }
      })
    }
  }, [inventory, setInventory])

  const lowStockProducts = inventory
    ? Object.entries(inventory).filter(([k, v]) => k !== 'grand_total' && v < threshold).map(([k]) => k)
    : []

  function addLog(stage: string, status: string, msg: string) {
    const time = new Date().toLocaleTimeString('en-IN', { hour12: false })
    setLogs(prev => [...prev, { time, stage, status, msg }])
  }

  async function runPipeline() {
    if (running) return
    setRunning(true)
    setStage(0)
    setLogs([])
    setResults(null)
    setRawOutput(null)

    const url = api.pipelineUrl(threshold)
    try {
      const res = await fetch(url)
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const event: PipelineEvent = JSON.parse(line.slice(6))
            setStage(event.stage - 1)
            addLog(`Stage ${event.stage}`, event.status, event.message)
            if (event.stage === 3 && event.status === 'complete' && event.data) {
              setResults(event.data as RestockRow[])
              if (event.raw) setRawOutput(event.raw)
            }
          } catch {}
        }
      }
    } catch(e: unknown) {
      addLog('Error', 'error', e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  // Best deal per product
  const bestPerProduct: Record<string, number> = {}
  results?.forEach(r => {
    const v = parsePriceValue(r['Price'] ?? '')
    if (v !== null && (!bestPerProduct[r['Product Name']] || v < bestPerProduct[r['Product Name']])) {
      bestPerProduct[r['Product Name']] = v
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-[24px] tracking-tight" style={{ color: '#F1F5F9' }}>
          🌐 Competitor Analysis
        </h1>
        <p className="text-[13px] mt-1" style={{ color: '#475569' }}>
          Autonomous restock pipeline: Tavily search → Playwright scrape → Groq AI comparison.
          Finds best deals across Amazon, Flipkart, Snapdeal, and more.
        </p>
      </div>

      {!inventory && (
        <Alert variant="warning" icon="⚠️">
          No inventory loaded. Go to <strong>Inventory Monitoring</strong> and analyze a shelf video first.
        </Alert>
      )}

      {/* Pipeline Stepper */}
      <Card>
        <div className="flex items-center gap-2 px-2">
          {STAGE_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-mono-custom font-bold flex-shrink-0 transition-all duration-500',
                  i < stage
                    ? 'step-pulse'
                    : i === stage
                      ? 'step-pulse'
                      : ''
                )}
                style={{
                  background: i < stage
                    ? 'linear-gradient(135deg, #10B981, #059669)'
                    : i === stage
                      ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)'
                      : 'rgba(255,255,255,0.06)',
                  border: i < stage
                    ? '1px solid rgba(16,185,129,0.4)'
                    : i === stage
                      ? '1px solid rgba(139,92,246,0.4)'
                      : '1px solid rgba(255,255,255,0.1)',
                  color: i <= stage ? '#fff' : '#475569',
                }}
              >
                {i < stage ? '✓' : i + 1}
              </div>
              <div
                className="text-[12px] font-semibold transition-colors"
                style={{
                  color: i === stage ? '#8B5CF6' : i < stage ? '#10B981' : '#475569'
                }}
              >
                {label}
              </div>
              {i < STAGE_LABELS.length - 1 && (
                <div
                  className="flex-1 h-[2px] rounded-full mx-1 transition-all duration-700"
                  style={{
                    background: i < stage
                      ? 'linear-gradient(90deg, #10B981, #8B5CF6)'
                      : 'rgba(255,255,255,0.06)'
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Controls */}
      <Card hover>
        <CardTitle icon={<span>🤖</span>}>Restock Pipeline</CardTitle>
        {inventory && lowStockProducts.length > 0 && (
          <div className="mb-4">
            <Badge variant="orange" className="mb-2">⚠️ {lowStockProducts.length} low-stock products detected</Badge>
            <p className="text-[12px] mt-1.5 capitalize" style={{ color: '#475569' }}>{lowStockProducts.join(', ')}</p>
          </div>
        )}
        {inventory && lowStockProducts.length === 0 && (
          <p className="text-[13px] mb-4" style={{ color: '#475569' }}>All products are well stocked (above {threshold} units).</p>
        )}
        <Button
          variant="primary" icon={<Play size={15}/>}
          disabled={!inventory} loading={running}
          onClick={runPipeline}
        >
          {running ? 'Pipeline Running...' : '▶ Run Restock Pipeline'}
        </Button>
      </Card>

      {/* Log */}
      {logs.length > 0 && (
        <Card>
          <CardTitle icon={<span>🖥️</span>}>Pipeline Log</CardTitle>
          <div
            className="rounded-xl p-4 max-h-48 overflow-y-auto font-mono-custom text-[12px] space-y-1.5"
            style={{ background: '#060910', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {logs.map((l, i) => (
              <div key={i} className="flex gap-3">
                <span style={{ color: '#374151' }} className="flex-shrink-0">{l.time}</span>
                <span
                  className="flex-shrink-0"
                  style={{
                    color: l.status === 'done' || l.status === 'complete'
                      ? '#10B981'
                      : l.status === 'error'
                        ? '#F87171'
                        : '#F59E0B'
                  }}
                >
                  [{l.stage}]
                </span>
                <span style={{ color: '#94A3B8' }}>{l.msg}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Result cards */}
      {results && results.length > 0 && (
        <Card>
          <CardTitle icon={<span>🏆</span>}>
            Restock Recommendations — Best Deals Found
          </CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r, i) => {
              const priceVal = parsePriceValue(r['Price'] ?? '')
              const isBest = priceVal !== null && bestPerProduct[r['Product Name']] === priceVal
              return (
                <div
                  key={i}
                  className="rounded-2xl p-5 relative overflow-hidden card-hover"
                  style={{
                    background: isBest ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                    border: isBest ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: isBest ? '0 0 24px rgba(16,185,129,0.1)' : 'none',
                  }}
                >
                  {isBest && (
                    <div
                      className="absolute top-0 right-4 text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-b-lg"
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                    >
                      🏆 Best Deal
                    </div>
                  )}
                  <div className="font-heading font-bold text-[15px] capitalize mb-0.5 mt-1" style={{ color: '#E2E8F0' }}>
                    {r['Product Name'] || '—'}
                  </div>
                  <div className="text-[12px] font-medium mb-4" style={{ color: '#475569' }}>{r['E-commerce Platform'] || '—'}</div>
                  <div className="mb-3" style={{ borderTop: '1px dashed rgba(255,255,255,0.07)', paddingTop: '12px' }}>
                    <div className="space-y-2">
                      {[
                        { label: 'Price',    val: r['Price'] },
                        { label: 'Delivery', val: r['Delivery Date'] },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex items-center justify-between text-[12px]">
                          <span style={{ color: '#475569' }}>{label}</span>
                          <span className="font-mono-custom font-semibold" style={{ color: '#E2E8F0' }}>{val || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {r['Product URL'] && (
                    <a
                      href={r['Product URL']} target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all hover:opacity-90 hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #10B981, #0D9488)',
                        color: '#fff',
                      }}
                    >
                      View listing →
                    </a>
                  )}
                </div>
              )
            })}
          </div>

          {rawOutput && (
            <details className="mt-5">
              <summary
                className="cursor-pointer text-[13px] font-semibold"
                style={{ color: '#475569' }}
              >
                Raw Agent Output
              </summary>
              <pre
                className="mt-3 p-4 rounded-xl text-[11px] overflow-x-auto whitespace-pre-wrap font-mono-custom"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#94A3B8'
                }}
              >
                {rawOutput}
              </pre>
            </details>
          )}
        </Card>
      )}

      {results && results.length === 0 && (
        <EmptyState icon="🤔" title="No results" sub="The AI agent returned no comparison data. Try again or check your API keys." />
      )}
    </div>
  )
}
