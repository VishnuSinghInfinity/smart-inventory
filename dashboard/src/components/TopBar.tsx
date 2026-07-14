import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/':           'Dashboard',
  '/inventory':  'Inventory Monitoring',
  '/sales':      'Sales Prediction',
  '/competitor': 'Competitor Analysis',
  '/assistant':  'AI Sales Assistant',
  '/reports':    'Reports',
  '/settings':   'Settings',
}

interface TopBarProps {
  onToggle: () => void
}

export function TopBar({ onToggle }: TopBarProps) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'ShelfSense'

  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
  })

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm z-50">
      <button
        onClick={onToggle}
        className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      <h1 className="flex-1 font-heading font-bold text-[17px] text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        <span className="font-mono-custom text-[12px] text-gray-400 hidden sm:block">{now}</span>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white text-[12px] font-bold shadow-[0_0_14px_rgba(124,58,237,0.4)] cursor-pointer select-none">
          SS
        </div>
      </div>
    </header>
  )
}
