import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

// ── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-10 h-10 border-[3px]' }[size]
  return (
    <div className={cn('rounded-full border-gray-200 border-t-violet-600 spinner', s, className)} />
  )
}

// ── LOADING STATE ─────────────────────────────────────────────────────────────
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500 font-medium">{message}</p>
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, sub, children }: { icon: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="text-center py-14 px-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
      <div className="text-5xl mb-3">{icon}</div>
      <h3 className="font-heading font-bold text-gray-800 text-base mb-1">{title}</h3>
      {sub && <p className="text-sm text-gray-400">{sub}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'green' | 'ghost' | 'danger'

const btnVariants: Record<BtnVariant, string> = {
  primary:   'bg-gradient-to-r from-violet-600 to-pink-500 text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.5)]',
  green:     'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)]',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200',
  ghost:     'text-gray-600 hover:bg-gray-100',
  danger:    'bg-red-50 text-red-600 hover:bg-red-100',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps) {
  const sizeClass = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-2.5 text-base' }[size]
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        btnVariants[variant],
        sizeClass,
        className
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
type StatColor = 'green' | 'violet' | 'orange' | 'red' | 'cyan'
const statTopBar: Record<StatColor, string> = {
  green:  'from-emerald-400 to-green-500',
  violet: 'from-violet-500 to-violet-400',
  orange: 'from-amber-400 to-orange-400',
  red:    'from-red-400 to-rose-400',
  cyan:   'from-cyan-400 to-sky-400',
}
const statIconBg: Record<StatColor, string> = {
  green:  'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  orange: 'bg-amber-50 text-amber-600',
  red:    'bg-red-50 text-red-500',
  cyan:   'bg-cyan-50 text-cyan-600',
}

export function StatCard({
  icon, label, value, color, badge, badgeColor
}: {
  icon: ReactNode; label: string; value: string | number
  color: StatColor; badge?: string; badgeColor?: 'up' | 'down' | 'neutral'
}) {
  const badgeCls = {
    up:      'bg-emerald-50 text-emerald-700',
    down:    'bg-red-50 text-red-500',
    neutral: 'bg-gray-100 text-gray-500',
  }[badgeColor || 'neutral']

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm card-hover relative overflow-hidden">
      <div className={cn('absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r', statTopBar[color])} />
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl', statIconBg[color])}>
          {icon}
        </div>
        {badge && (
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', badgeCls)}>{badge}</span>
        )}
      </div>
      <div className="font-mono-custom text-[28px] font-bold text-gray-900 leading-none mb-1">{value}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
  )
}
