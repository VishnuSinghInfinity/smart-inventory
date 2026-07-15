import { useState, useEffect } from 'react'
import { Play, Search, Globe, Cpu, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { api, type PipelineEvent, type RestockRow } from '../lib/api'
import { useInventoryStore } from '../hooks/useInventoryStore'
import { Card, CardTitle } from '../components/ui/Card'
import { Button, EmptyState } from '../components/ui'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Badge'
import { cn, parsePriceValue } from '../lib/utils'

const STAGES = [
  {
    label: 'Search',
    description: 'Tavily AI searches across Amazon, Flipkart, Snapdeal',
    icon: Search,
  },
  {
    label: 'Scrape & Verify',
    description: 'Playwright scrapes live product listings',
    icon: Globe,
  },
  {
    label: 'AI Analysis',
    description: 'Groq LLM compares prices and recommends best deals',
    icon: Cpu,
  },
]

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

  function addLog(stageLabel: string, status: string, msg: string) {
    const time = new Date().toLocaleTimeString('en-IN', { hour12: false })
    setLogs(prev => [...prev, { time, stage: stageLabel, status, msg }])
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

  const bestPerProduct: Record<string, number> = {}
  results?.forEach(r => {
    const v = parsePriceValue(r['Price'] ?? '')
    if (v !== null && (!bestPerProduct[r['Product Name']] || v < bestPerProduct[r['Product Name']])) {
      bestPerProduct[r['Product Name']] = v
    }
  })

  const isComplete = !running && results !== null

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Competitor Analysis</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Autonomous restock pipeline: Tavily search → Playwright scrape → Groq AI comparison.
          Finds best deals across Amazon, Flipkart, Snapdeal, and more.
        </p>
      </div>

      {!inventory && (
        <Alert variant="warning">
          No inventory loaded. Go to <strong>Inventory Monitoring</strong> and analyze a shelf video first.
        </Alert>
      )}

      {/* Pipeline visualization */}
      <Card>
        <div className="flex items-start gap-2 relative">
          {STAGES.map((s, i) => {
            const isDone = i < stage
            const isActive = i === stage && running

            return (
              <div key={i} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-2 flex-1">
                  {/* Stage circle */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0',
                    isDone
                      ? 'bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
                      : isActive
                        ? 'bg-indigo-600 text-white shadow-[0_2px_12px_rgba(99,102,241,0.4)] step-pulse'
                        : 'bg-gray-100 text-gray-400'
                  )}>
                    {isDone
                      ? <CheckCircle size={18} />
                      : <s.icon size={16} />
                    }
                  </div>

                  {/* Stage info */}
                  <div className="text-center px-1">
                    <div className={cn(
                      'text-[12px] font-semibold transition-colors',
                      isDone ? 'text-emerald-600' : isActive ? 'text-indigo-600' : 'text-gray-400'
                    )}>
                      {s.label}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-snug hidden sm:block">
                      {s.description}
                    </div>
                  </div>
                </div>

                {/* Connector */}
                {i < STAGES.length - 1 && (
                  <div className="flex items-center mx-2 flex-shrink-0 mt-[-20px]">
                    <div className={cn(
                      'w-8 h-[2px] rounded-full transition-all duration-700',
                      i < stage ? 'bg-emerald-400' : 'bg-gray-200'
                    )} />
                    <ChevronRight size={12} className={cn('transition-colors', i < stage ? 'text-emerald-400' : 'text-gray-300')} />
                  </div>
                )}
              </div>
            )
          })}

          {/* Status badge */}
          <div className="ml-4 flex-shrink-0">
            {running && (
              <Badge variant="indigo">Running</Badge>
            )}
            {isComplete && (
              <Badge variant="green">Complete</Badge>
            )}
            {!running && !isComplete && (
              <Badge variant="gray">Ready</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Pipeline launch card */}
      <Card>
        <CardTitle icon={<Cpu size={14} />} subtitle="AI-powered competitor pricing analysis for low-stock products.">
          Restock Pipeline
        </CardTitle>

        {inventory && lowStockProducts.length > 0 && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="orange">{lowStockProducts.length} low-stock products</Badge>
            </div>
            <p className="text-[12px] text-amber-800 capitalize leading-relaxed">
              {lowStockProducts.join(' · ')}
            </p>
          </div>
        )}

        {inventory && lowStockProducts.length === 0 && (
          <p className="text-[13px] text-gray-500 mb-4">
            All products are well stocked (above {threshold} units). Pipeline will run with current stock levels.
          </p>
        )}

        <Button
          variant="primary"
          icon={<Play size={14} />}
          disabled={!inventory}
          loading={running}
          onClick={runPipeline}
        >
          {running ? 'Pipeline Running…' : 'Run Restock Pipeline'}
        </Button>
      </Card>

      {/* Pipeline terminal log */}
      {logs.length > 0 && (
        <Card>
          <CardTitle icon={<Clock size={14} />}>Execution Log</CardTitle>
          <div className="terminal p-4 max-h-52 overflow-y-auto space-y-1">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-3 text-[12px]">
                <span className="text-[#6B7280] flex-shrink-0 tabular-nums">{l.time}</span>
                <span className={cn(
                  'flex-shrink-0 font-semibold',
                  l.status === 'done' || l.status === 'complete' ? 'text-emerald-400'
                    : l.status === 'error' ? 'text-red-400'
                      : 'text-amber-400'
                )}>
                  [{l.stage}]
                </span>
                <span className="text-[#C9D1D9]">{l.msg}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <Card>
          <CardTitle icon={<CheckCircle size={14} />}>
            Restock Recommendations — Best Deals Found
          </CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r, i) => {
              const priceVal = parsePriceValue(r['Price'] ?? '')
              const isBest = priceVal !== null && bestPerProduct[r['Product Name']] === priceVal
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border p-5 relative overflow-hidden transition-all duration-150 hover:-translate-y-0.5',
                    isBest
                      ? 'border-emerald-200 bg-emerald-50/40 shadow-[0_1px_4px_rgba(16,185,129,0.1)]'
                      : 'border-gray-200 bg-white'
                  )}
                >
                  {isBest && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                      Best Deal
                    </div>
                  )}

                  <div className="font-semibold text-[14px] text-gray-900 capitalize mb-0.5 pr-16">
                    {r['Product Name'] || '—'}
                  </div>
                  <div className="text-[12px] text-gray-400 mb-4">{r['E-commerce Platform'] || '—'}</div>

                  <div className="space-y-2 mb-4">
                    {[
                      { label: 'Price', val: r['Price'] },
                      { label: 'Delivery', val: r['Delivery Date'] },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between text-[12px]">
                        <span className="text-gray-400">{label}</span>
                        <span className="font-mono-custom font-semibold text-gray-800">{val || '—'}</span>
                      </div>
                    ))}
                  </div>

                  {r['Product URL'] && (
                    <a
                      href={r['Product URL']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      View listing <ChevronRight size={12} />
                    </a>
                  )}
                </div>
              )
            })}
          </div>

          {rawOutput && (
            <details className="mt-5">
              <summary className="cursor-pointer text-[12px] text-gray-400 hover:text-gray-600 font-medium select-none">
                View raw agent output
              </summary>
              <pre className="mt-3 terminal p-4 text-[11px] overflow-x-auto whitespace-pre-wrap">
                {rawOutput}
              </pre>
            </details>
          )}
        </Card>
      )}

      {results && results.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No results found"
          sub="The AI agent returned no comparison data. Try again or check your API keys."
        />
      )}
    </div>
  )
}
