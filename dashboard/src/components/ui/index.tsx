import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

// ── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-[3px]' }[size]
  return (
    <div
      className={cn('rounded-full spinner', s, className)}
      style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#10B981' }}
    />
  )
}

// ── LOADING STATE ─────────────────────────────────────────────────────────────
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <Spinner size="lg" />
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: '0 0 20px rgba(16,185,129,0.3)', animation: 'pulse 2s ease-in-out infinite' }}
        />
      </div>
      <p className="text-[13px] font-medium" style={{ color: '#64748B' }}>{message}</p>
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div
      className="text-center py-14 px-6 rounded-2xl"
      style={{
        border: '2px dashed rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="font-heading font-bold text-[15px] mb-1" style={{ color: '#E2E8F0' }}>{title}</h3>
      {sub && <p className="text-[13px]" style={{ color: '#475569' }}>{sub}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'green' | 'ghost' | 'danger'

const btnVariantStyles: Record<BtnVariant, React.CSSProperties & { hoverStyle?: React.CSSProperties }> = {
  primary: {
    background: 'linear-gradient(135deg, #10B981, #0D9488)',
    color: '#fff',
    border: '1px solid rgba(16,185,129,0.4)',
    boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
  },
  green: {
    background: 'linear-gradient(135deg, #10B981, #059669)',
    color: '#fff',
    border: '1px solid rgba(16,185,129,0.4)',
    boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.06)',
    color: '#CBD5E1',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  ghost: {
    background: 'transparent',
    color: '#94A3B8',
    border: '1px solid transparent',
  },
  danger: {
    background: 'rgba(239,68,68,0.1)',
    color: '#F87171',
    border: '1px solid rgba(239,68,68,0.25)',
  },
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, style, ...props }: ButtonProps) {
  const sizeClass = { sm: 'px-3.5 py-1.5 text-[12px]', md: 'px-4 py-2 text-[13px]', lg: 'px-6 py-2.5 text-[14px]' }[size]
  const varStyle = btnVariantStyles[variant]
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'hover:opacity-90 active:scale-[0.98]',
        sizeClass,
        className
      )}
      style={{ ...varStyle, ...style }}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
type StatColor = 'green' | 'violet' | 'orange' | 'red' | 'cyan'

const statAccent: Record<StatColor, { bar: string; glow: string; icon: string; iconColor: string }> = {
  green:  { bar: 'linear-gradient(90deg, #10B981, #059669)', glow: 'rgba(16,185,129,0.2)',  icon: 'rgba(16,185,129,0.12)',  iconColor: '#34D399' },
  violet: { bar: 'linear-gradient(90deg, #8B5CF6, #6D28D9)', glow: 'rgba(139,92,246,0.2)', icon: 'rgba(139,92,246,0.12)', iconColor: '#A78BFA' },
  orange: { bar: 'linear-gradient(90deg, #F59E0B, #D97706)', glow: 'rgba(245,158,11,0.2)',  icon: 'rgba(245,158,11,0.12)',  iconColor: '#FCD34D' },
  red:    { bar: 'linear-gradient(90deg, #EF4444, #DC2626)', glow: 'rgba(239,68,68,0.2)',   icon: 'rgba(239,68,68,0.12)',   iconColor: '#F87171' },
  cyan:   { bar: 'linear-gradient(90deg, #06B6D4, #0891B2)', glow: 'rgba(6,182,212,0.2)',   icon: 'rgba(6,182,212,0.12)',   iconColor: '#67E8F9' },
}

export function StatCard({
  icon, label, value, color, badge, badgeColor
}: {
  icon: ReactNode; label: string; value: string | number
  color: StatColor; badge?: string; badgeColor?: 'up' | 'down' | 'neutral'
}) {
  const acc = statAccent[color]

  const badgeStyle = {
    up:      { bg: 'rgba(16,185,129,0.12)',  color: '#34D399',  border: 'rgba(16,185,129,0.25)' },
    down:    { bg: 'rgba(239,68,68,0.12)',   color: '#F87171',  border: 'rgba(239,68,68,0.25)' },
    neutral: { bg: 'rgba(255,255,255,0.07)', color: '#94A3B8',  border: 'rgba(255,255,255,0.12)' },
  }[badgeColor || 'neutral']

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden card-hover"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: acc.bar }}
      />
      {/* Glow blob */}
      <div
        className="absolute top-0 left-0 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        style={{ background: acc.glow, transform: 'translate(-30%, -30%)' }}
      />

      <div className="flex items-start justify-between mb-4 relative">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: acc.icon, color: acc.iconColor }}
        >
          {icon}
        </div>
        {badge && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.border}` }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="font-mono-custom text-[26px] font-bold leading-none mb-1 relative" style={{ color: '#F1F5F9' }}>
        {value}
      </div>
      <div className="text-[11px] font-medium relative" style={{ color: '#64748B' }}>
        {label}
      </div>
    </div>
  )
}
