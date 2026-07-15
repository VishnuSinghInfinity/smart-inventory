import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { Spinner } from './ui'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  'What needs restocking?',
  'Show discount candidates',
  'Which products are expiring?',
]

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m ShelfSense AI. Ask me about inventory levels, expiring products, sales trends, or restock recommendations.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [messages, open])

  async function send(overrideMsg?: string) {
    const msg = (overrideMsg ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setShowSuggestions(false)
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await api.chat(msg)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Unknown error'
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 w-12 h-12 rounded-full z-50',
          'bg-indigo-600 text-white',
          'shadow-[0_4px_16px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)]',
          'hover:bg-indigo-500 transition-all duration-150',
          'flex items-center justify-center'
        )}
        aria-label="Open AI chat"
      >
        {open
          ? <X size={18} />
          : <MessageCircle size={18} />
        }
      </button>

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-[84px] right-6 w-[380px] bg-white rounded-xl z-40 flex flex-col overflow-hidden',
          'border border-gray-200/80 shadow-[0_8px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]',
          'transition-all duration-200 origin-bottom-right',
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
        )}
        style={{ maxHeight: '540px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              AI
            </div>
            <div>
              <div className="font-semibold text-[13px] text-gray-900 leading-none">ShelfSense AI</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-[11px] text-gray-400 font-medium">Online · Groq LLM</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-bold flex-shrink-0 mt-0.5">
                  AI
                </div>
              )}
              <div className={cn(
                'max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed rounded-xl',
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'
              )}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-bold flex-shrink-0">
                AI
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 typing-dot" />
              </div>
            </div>
          )}

          {/* Suggested prompts */}
          {showSuggestions && messages.length === 1 && !loading && (
            <div className="flex flex-col gap-1.5 mt-1">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Suggested</p>
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="text-left text-[12px] text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg px-3 py-2 transition-all duration-100 font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about inventory or sales…"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-indigo-500 transition-colors flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
          >
            {loading ? <Spinner size="sm" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </>
  )
}
