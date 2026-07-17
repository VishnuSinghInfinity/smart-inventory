import { Menu, Bell, Search, Wifi } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/':           'Dashboard',
  '/inventory':  'Inventory Monitoring',
  '/store':      'Store',
  '/sales':      'Sales Prediction',
  '/competitor': 'Competitor Analysis',
  '/assistant':  'AI Sales Assistant',
  '/reports':    'Reports',
  '/settings':   'Settings',
}

const PAGE_SUBTITLES: Record<string, string> = {
  '/':           'Live AI-powered inventory intelligence',
  '/inventory':  'YOLO + ByteTrack shelf detection',
  '/store':      'Browse all products currently available inside the retail inventory.',
  '/sales':      '30-day velocity & trend analysis',
  '/competitor': 'Tavily → Playwright → Groq pipeline',
  '/assistant':  'Groq-powered recommendations engine',
  '/reports':    'Full product metrics & export',
  '/settings':   'System configuration',
}

interface TopBarProps {
  onToggle: () => void
}

export function TopBar({ onToggle }: TopBarProps) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'ShelfSense'
  const subtitle = PAGE_SUBTITLES[pathname] ?? ''

  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  })

  return (
    <header
      className="h-[60px] flex items-center px-5 gap-4 flex-shrink-0 z-50"
      style={{
        background: 'rgba(8,11,18,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#94A3B8'
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        aria-label="Toggle sidebar"
      >
        <Menu size={15} />
      </button>

      {/* Page Title */}
      <div className="flex-1 min-w-0">
        <h1 className="font-heading font-bold text-[15px] leading-none truncate" style={{ color: '#F1F5F9' }}>
          {title}
        </h1>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: '#475569' }}>
          {subtitle}
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 flex-shrink-0">

        {/* Search (decorative) */}
        <button
          className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#6B7280'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
          aria-label="Search"
        >
          <Search size={14} />
        </button>

        {/* Notification (decorative) */}
        <button
          className="relative hidden sm:flex w-8 h-8 rounded-lg items-center justify-center transition-all duration-200"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#6B7280'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
          aria-label="Notifications"
        >
          <Bell size={14} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#10B981' }}
          />
        </button>

        {/* System status */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <Wifi size={11} style={{ color: '#10B981' }} />
          <span className="text-[10px] font-bold tracking-wider" style={{ color: '#10B981' }}>
            ONLINE
          </span>
        </div>

        {/* Time */}
        <span className="font-mono-custom text-[11px] hidden lg:block" style={{ color: '#4B5563' }}>
          {now}
        </span>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold cursor-pointer select-none flex-shrink-0 transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #10B981, #0D9488)',
            boxShadow: '0 0 12px rgba(16,185,129,0.35)'
          }}
        >
          SS
        </div>
      </div>
    </header>
  )
}
