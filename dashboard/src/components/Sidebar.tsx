import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, TrendingUp, Globe, Bot, FileText, Settings,
  Zap, Circle
} from 'lucide-react'
import { useHealth } from '../hooks/useHealth'
import { cn } from '../lib/utils'

const NAV = [
  { label: 'Dashboard',            to: '/',            icon: LayoutDashboard, section: 'main' },
  { label: 'Inventory Monitoring', to: '/inventory',   icon: Package,         section: 'main', badge: 'Live' },
  { label: 'Store',                to: '/store',       icon: ShoppingBag,     section: 'main' },
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
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative',
          'text-[#6B7280] hover:text-[#E2E8F0] hover:bg-white/[0.05]',
          isActive && 'nav-active'
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon size={16} className="flex-shrink-0 transition-colors duration-200" />
        {!collapsed && (
          <>
            <span className="flex-1 tracking-wide">{item.label}</span>
            {item.badge && (
              <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full tracking-wider">
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
      'flex flex-col h-screen transition-all duration-300 ease-in-out flex-shrink-0 relative',
      'border-r',
      collapsed ? 'w-[68px]' : 'w-[240px]'
    )} style={{
      background: 'var(--sb-bg)',
      borderColor: 'var(--sb-border)',
    }}>

      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 border-b flex-shrink-0',
        collapsed ? 'justify-center py-5 px-0' : 'px-5 py-5'
      )} style={{ borderColor: 'var(--sb-border)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 logo-glow"
          style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)' }}
        >
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-heading font-bold text-[15px] leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
              ShelfSense
            </div>
            <div className="text-[10px] font-semibold mt-0.5 tracking-widest" style={{ color: 'var(--emerald)' }}>
              AI PLATFORM
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 flex flex-col gap-0.5">
        {!collapsed && (
          <div className="text-[9px] font-bold px-2 pb-2 pt-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Main
          </div>
        )}
        {mainNav.map(item => <NavItem key={item.to} item={item} />)}

        {!collapsed && (
          <div className="text-[9px] font-bold px-2 pb-2 pt-4 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Tools
          </div>
        )}
        {analyticsNav.map(item => <NavItem key={item.to} item={item} />)}
      </nav>

      {/* Footer — API status */}
      {!collapsed && (
        <div className="border-t px-4 py-4 flex-shrink-0" style={{ borderColor: 'var(--sb-border)' }}>
          <div className="flex flex-col gap-2">
            {[
              { 
                key: 'groq_api_key', 
                label: 'GROQ', 
                ok: health ? health.groq_api_key : false,
                ping: !!(health && health.groq_api_key),
                circleClass: health ? (health.groq_api_key ? 'fill-emerald-400 text-emerald-400' : 'fill-red-500 text-red-500') : 'fill-gray-500 text-gray-500',
                color: health ? (health.groq_api_key ? 'var(--emerald)' : 'var(--red)') : 'var(--text-muted)',
                statusText: health ? (health.groq_api_key ? 'OK' : 'MISSING') : 'OFFLINE'
              },
              { 
                key: 'tavily_api_key', 
                label: 'TAVILY', 
                ok: health ? health.tavily_api_key : false,
                ping: !!(health && health.tavily_api_key),
                circleClass: health ? (health.tavily_api_key ? 'fill-emerald-400 text-emerald-400' : 'fill-red-500 text-red-500') : 'fill-gray-500 text-gray-500',
                color: health ? (health.tavily_api_key ? 'var(--emerald)' : 'var(--red)') : 'var(--text-muted)',
                statusText: health ? (health.tavily_api_key ? 'OK' : 'MISSING') : 'OFFLINE'
              },
            ].map(api => (
              <div key={api.key} className="flex items-center gap-2">
                <div className="relative w-2 h-2 flex-shrink-0">
                  {api.ping && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ background: 'var(--emerald)', opacity: 0.4 }}
                    />
                  )}
                  <Circle
                    size={8}
                    className={cn(
                      'relative',
                      api.circleClass
                    )}
                  />
                </div>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {api.label}
                </span>
                <span className="text-[9px] ml-auto font-medium" style={{ color: api.color }}>
                  {api.statusText}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
