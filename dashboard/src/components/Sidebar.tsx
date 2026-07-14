import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, TrendingUp, Globe, Bot, FileText, Settings,
  Zap, Circle
} from 'lucide-react'
import { useHealth } from '../hooks/useHealth'
import { cn } from '../lib/utils'

const NAV = [
  { label: 'Dashboard',            to: '/',            icon: LayoutDashboard, section: 'main' },
  { label: 'Inventory Monitoring', to: '/inventory',   icon: Package,         section: 'main', badge: 'Live' },
  { label: 'Sales Prediction',     to: '/sales',       icon: TrendingUp,      section: 'main' },
  { label: 'Competitor Analysis',  to: '/competitor',  icon: Globe,           section: 'main' },
  { label: 'AI Sales Assistant',   to: '/assistant',   icon: Bot,             section: 'analytics', dot: true },
  { label: 'Reports',              to: '/reports',     icon: FileText,        section: 'analytics' },
  { label: 'Settings',             to: '/settings',    icon: Settings,        section: 'analytics' },
]

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { data: health } = useHealth()

  const mainNav = NAV.filter(n => n.section === 'main')
  const analyticsNav = NAV.filter(n => n.section === 'analytics')

  function NavItem({ item }: { item: typeof NAV[0] }) {
    return (
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) => cn(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200',
          'text-[#8A8FA8] hover:text-white hover:bg-[#1A1D27]',
          isActive && 'nav-active text-white'
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon size={17} className="flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="text-[9px] font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white px-2 py-0.5 rounded-full tracking-wider">
                {item.badge}
              </span>
            )}
            {item.dot && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 dot-pulse" />
            )}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <aside className={cn(
      'bg-[#0F1117] flex flex-col h-screen transition-all duration-300 ease-in-out border-r border-white/5 flex-shrink-0',
      collapsed ? 'w-[70px]' : 'w-[256px]'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 border-b border-white/5 flex-shrink-0',
        collapsed ? 'justify-center py-6 px-0' : 'px-5 py-6'
      )}>
        <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-pink-500 rounded-xl flex items-center justify-center text-lg flex-shrink-0 logo-glow">
          <Zap size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-heading font-bold text-white text-[15px] leading-none tracking-tight">ShelfSense</div>
            <div className="text-[10px] text-[#8A8FA8] font-medium mt-0.5 tracking-wide">AI DASHBOARD</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {!collapsed && (
          <div className="text-[9px] font-bold text-white/20 px-2 pb-2 pt-1 uppercase tracking-widest">Main Menu</div>
        )}
        {mainNav.map(item => <NavItem key={item.to} item={item} />)}

        {!collapsed && (
          <div className="text-[9px] font-bold text-white/20 px-2 pb-2 pt-4 uppercase tracking-widest">Analytics</div>
        )}
        {analyticsNav.map(item => <NavItem key={item.to} item={item} />)}
      </nav>

      {/* Footer — API status */}
      {!collapsed && (
        <div className="border-t border-white/5 px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Circle
                size={8}
                className={cn(health?.groq_api_key ? 'fill-emerald-400 text-emerald-400' : 'fill-red-500 text-red-500')}
              />
              <span className="text-[9px] font-bold text-[#8A8FA8] tracking-wider">GROQ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Circle
                size={8}
                className={cn(health?.tavily_api_key ? 'fill-emerald-400 text-emerald-400' : 'fill-red-500 text-red-500')}
              />
              <span className="text-[9px] font-bold text-[#8A8FA8] tracking-wider">TAVILY</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
