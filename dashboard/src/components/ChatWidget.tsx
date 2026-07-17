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
          'fixed bottom-6 right-6 w-13 h-13 rounded-full z-50 flex items-center justify-center',
          'transition-all duration-300 hover:scale-110 active:scale-95',
          !open && 'fab-float'
        )}
        style={{
          width: '52px',
          height: '52px',
          background: 'linear-gradient(135deg, #10B981, #0D9488)',
          boxShadow: '0 8px 28px rgba(16,185,129,0.45)',
        }}
        aria-label="Open AI chat"
      >
        {open ? <X size={20} className="text-white" /> : <MessageCircle size={20} className="text-white" />}
      </button>

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-[76px] right-6 flex flex-col z-40',
          'transition-all duration-300 origin-bottom-right',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
        )}
        style={{
          width: '360px',
          maxHeight: '520px',
          background: 'rgba(10,13,20,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '20px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center logo-glow flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)' }}
            >
              <Zap size={15} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-[13px]" style={{ color: '#F1F5F9' }}>ShelfSense AI</div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#10B981' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
                Online
              </div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#6B7280'
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5" style={{ minHeight: 0 }}>
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className="max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed"
                style={m.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, #10B981, #0D9488)',
                      color: '#fff',
                      borderRadius: '16px 16px 4px 16px',
                    }
                  : {
                      background: 'rgba(255,255,255,0.05)',
                      color: '#CBD5E1',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px 16px 16px 4px',
                    }
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 flex gap-1.5 items-center"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px 16px 16px 4px',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: '#10B981' }} />
                <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: '#10B981' }} />
                <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: '#10B981' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 flex gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask ShelfSense..."
            className="flex-1 rounded-xl px-4 py-2 text-[13px] outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#E2E8F0',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
            style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #10B981, #0D9488)',
            }}
          >
            {loading ? <Spinner size="sm" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </>
  )
}
