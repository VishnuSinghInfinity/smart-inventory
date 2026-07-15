import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

// ── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = {
    sm: 'w-3.5 h-3.5 border-[1.5px]',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-[2.5px]'
  }[size]
  return (
    <div className={cn('rounded-full border-gray-200 border-t-indigo-500 spinner', s, className)} />
  )
}

// ── LOADING STATE ─────────────────────────────────────────────────────────────
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner size="lg" />
      <p className="text-[13px] text-gray-400 font-medium">{message}</p>
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon, title, sub, children
}: {
  icon: string; title: string; sub?: string; children?: ReactNode
}) {
  return (
    <div className="text-center py-16 px-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-700 text-[14px] mb-1.5">{title}</h3>
      {sub && <p className="text-[12px] text-gray-400 max-w-xs mx-auto leading-relaxed">{sub}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'green' | 'ghost' | 'danger'

const btnVariants: Record<BtnVariant, string> = {
  primary:   'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.3)] border border-indigo-700/20',
  green:     'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_1px_2px_rgba(0,0,0,0.1)] border border-emerald-700/20',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
  ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  danger:    'bg-white text-red-600 hover:bg-red-50 border border-red-200',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props
}: ButtonProps) {
  const sizeClass = {
    sm: 'px-3 py-1.5 text-[12px] gap-1.5',
    md: 'px-3.5 py-2 text-[13px] gap-2',
    lg: 'px-5 py-2.5 text-[14px] gap-2'
  }[size]

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center font-semibold rounded-lg transition-all duration-150 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
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

const statIconBg: Record<StatColor, string> = {
  green:  'bg-emerald-50 text-emerald-600',
  violet: 'bg-indigo-50 text-indigo-600',
  orange: 'bg-amber-50 text-amber-600',
  red:    'bg-red-50 text-red-500',
  cyan:   'bg-sky-50 text-sky-600',
}

const statValueColor: Record<StatColor, string> = {
  green:  'text-gray-900',
  violet: 'text-gray-900',
  orange: 'text-gray-900',
  red:    'text-gray-900',
  cyan:   'text-gray-900',
}

export function StatCard({
  icon, label, value, color, badge, badgeColor
}: {
  icon: ReactNode
  label: string
  value: string | number
  color: StatColor
  badge?: string
  badgeColor?: 'up' | 'down' | 'neutral'
}) {
  const badgeCls = {
    up:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
    down:    'bg-red-50 text-red-600 ring-1 ring-red-200/60',
    neutral: 'bg-gray-100 text-gray-500',
  }[badgeColor || 'neutral']

  return (
    <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] relative overflow-hidden group card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-[16px] transition-colors', statIconBg[color])}>
          {icon}
        </div>
        {badge && (
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide', badgeCls)}>
            {badge}
          </span>
        )}
      </div>
      <div className={cn('font-mono-custom text-[26px] font-bold leading-none mb-1.5 count-in', statValueColor[color])}>
        {value}
      </div>
      <div className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">{label}</div>
    </div>
  )
}
