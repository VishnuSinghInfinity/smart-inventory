import { Menu, Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':           { title: 'Dashboard',            subtitle: 'Overview of your retail intelligence' },
  '/inventory':  { title: 'Inventory Monitoring',  subtitle: 'YOLO + ByteTrack live detection' },
  '/store':      { title: 'Store',                subtitle: 'Browse all products in the retail inventory' },
  '/sales':      { title: 'Sales Prediction',       subtitle: '30-day forecasts and trend analysis' },
  '/competitor': { title: 'Competitor Analysis',    subtitle: 'Autonomous restock pipeline' },
  '/assistant':  { title: 'AI Sales Assistant',     subtitle: 'Groq-powered recommendations' },
  '/reports':    { title: 'Reports',               subtitle: 'Executive inventory report' },
  '/settings':   { title: 'Settings',              subtitle: 'Configure your workspace' },
}

interface TopBarProps {
  onToggle: () => void
}

export function TopBar({ onToggle }: TopBarProps) {
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] ?? { title: 'ShelfSense', subtitle: '' }

  return (
    <header className="h-14 bg-white border-b border-gray-200/80 flex items-center px-5 gap-4 flex-shrink-0 z-50 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <button
        onClick={onToggle}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all duration-100"
        aria-label="Toggle sidebar"
      >
        <Menu size={15} />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-[14px] text-gray-900 leading-none tracking-tight truncate">
          {page.title}
        </h1>
        <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block truncate">
          {page.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell (presentational) */}
        <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all duration-100">
          <Bell size={14} />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold cursor-pointer select-none shadow-[0_0_0_2px_white,0_0_0_3px_rgba(99,102,241,0.3)]">
            SS
          </div>
        </div>
      </div>
    </header>
  )
}
