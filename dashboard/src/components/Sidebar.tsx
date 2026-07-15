import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, TrendingUp, Globe, Bot, FileText, Settings,
  Zap, Circle, ShoppingBag
} from 'lucide-react'
import { useHealth } from '../hooks/useHealth'
import { cn } from '../lib/utils'

const NAV = [
  { label: 'Dashboard',            to: '/',            icon: LayoutDashboard, section: 'main' },
  { label: 'Inventory Monitoring', to: '/inventory',   icon: Package,         section: 'main', badge: 'Live' },
  { label: 'Store',                to: '/store',       icon: ShoppingBag,     section: 'main' },
  { label: 'Sales Prediction',     to: '/sales',       icon: TrendingUp,      section: 'main' },
  { label: 'Competitor Analysis',  to: '/competitor',  icon: Globe,           section: 'main' },
  { label: 'AI Sales Assistant',   to: '/assistant',   icon: Bot,             section: 'tools', dot: true },
  { label: 'Reports',              to: '/reports',     icon: FileText,        section: 'tools' },
  { label: 'Settings',             to: '/settings',    icon: Settings,        section: 'tools' },
]

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { data: health } = useHealth()

  const mainNav = NAV.filter(n => n.section === 'main')
  const toolsNav = NAV.filter(n => n.section === 'tools')

  function NavItem({ item }: { item: typeof NAV[0] }) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) => cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative group',
          'text-[#6B7280] hover:text-[#F9FAFB] hover:bg-white/[0.05]',
          isActive && 'nav-active text-white bg-indigo-500/10'
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon
          size={16}
          className={cn(
            'flex-shrink-0 transition-colors',
            'group-[.nav-active]:text-indigo-400'
          )}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {item.badge}
              </span>
            )}
            {item.dot && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse flex-shrink-0" />
            )}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <aside className={cn(
      'sidebar-gradient flex flex-col h-screen transition-all duration-300 ease-in-out flex-shrink-0 border-r',
      'border-white/[0.06]',
      collapsed ? 'w-[60px]' : 'w-[240px]'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-white/[0.06] flex-shrink-0',
        collapsed ? 'justify-center py-[18px] px-0' : 'px-5 py-[18px] gap-3'
      )}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(99,102,241,0.4)]">
          <Zap size={15} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-white text-[14px] leading-none tracking-tight">ShelfSense</div>
            <div className="text-[10px] text-white/30 font-medium mt-0.5 uppercase tracking-widest">AI Platform</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col">
        {!collapsed && (
          <div className="text-[9px] font-semibold text-white/20 px-2 pb-1.5 pt-1 uppercase tracking-[0.1em]">
            Platform
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {mainNav.map(item => <NavItem key={item.to} item={item} />)}
        </div>

        <div className={cn('mt-5', !collapsed && 'border-t border-white/[0.06] pt-4')}>
          {!collapsed && (
            <div className="text-[9px] font-semibold text-white/20 px-2 pb-1.5 uppercase tracking-[0.1em]">
              Tools
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {toolsNav.map(item => <NavItem key={item.to} item={item} />)}
          </div>
        </div>
      </nav>

      {/* Footer — API status */}
      {!collapsed && (
        <div className="border-t border-white/[0.06] px-4 py-3.5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Circle
                size={6}
                className={cn(
                  'flex-shrink-0',
                  health?.groq_api_key
                    ? 'fill-emerald-400 text-emerald-400'
                    : 'fill-red-500 text-red-500'
                )}
              />
              <span className="text-[10px] font-medium text-white/30 tracking-wider uppercase">Groq</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Circle
                size={6}
                className={cn(
                  'flex-shrink-0',
                  health?.tavily_api_key
                    ? 'fill-emerald-400 text-emerald-400'
                    : 'fill-red-500 text-red-500'
                )}
              />
              <span className="text-[10px] font-medium text-white/30 tracking-wider uppercase">Tavily</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
