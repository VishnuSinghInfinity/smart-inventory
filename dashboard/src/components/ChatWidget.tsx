import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Zap } from 'lucide-react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'
import { Spinner } from './ui'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Hi! Ask me about inventory, expiry, sales trends, discounts or restocking.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await api.chat(msg)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Unknown error'
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err}` }])
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
          'fixed bottom-7 right-7 w-14 h-14 rounded-full z-50',
          'bg-gradient-to-br from-violet-600 to-pink-500 text-white',
          'shadow-[0_8px_28px_rgba(124,58,237,0.45)] hover:scale-110 transition-transform',
          !open && 'fab-float'
        )}
        aria-label="Open AI chat"
      >
        {open ? <X size={22} className="mx-auto" /> : <MessageCircle size={22} className="mx-auto" />}
      </button>

      {/* Panel */}
      <div className={cn(
        'fixed bottom-24 right-7 w-[360px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-40 flex flex-col',
        'transition-all duration-300 origin-bottom-right',
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
      )} style={{ maxHeight: '520px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-lg logo-glow">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900">ShelfSense AI</div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
                Online
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed',
                m.role === 'user'
                  ? 'bg-gradient-to-br from-violet-600 to-pink-500 text-white rounded-[16px_16px_4px_16px]'
                  : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-[16px_16px_16px_4px]'
              )}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 border border-gray-200 rounded-[16px_16px_16px_4px] px-4 py-3 flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 typing-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask ShelfSense..."
            className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-4 py-2 text-[13px] outline-none focus:border-violet-400 focus:bg-white transition-colors"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white disabled:opacity-40 hover:scale-110 transition-transform flex-shrink-0"
          >
            {loading ? <Spinner size="sm" /> : <Send size={15} />}
          </button>
        </div>
      </div>
    </>
  )
}
