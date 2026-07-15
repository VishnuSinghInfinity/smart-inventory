import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

type Variant = 'green' | 'red' | 'orange' | 'violet' | 'cyan' | 'gray' | 'pink' | 'indigo'

const variantClasses: Record<Variant, string> = {
  green:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  red:    'bg-red-50 text-red-600 ring-1 ring-red-200/60',
  orange: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  violet: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60',
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60',
  cyan:   'bg-sky-50 text-sky-700 ring-1 ring-sky-200/60',
  gray:   'bg-gray-100 text-gray-600 ring-1 ring-gray-200/60',
  pink:   'bg-rose-50 text-rose-600 ring-1 ring-rose-200/60',
}

export function Badge({
  children, variant = 'gray', className
}: {
  children: ReactNode; variant?: Variant; className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  )
}

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

const alertClasses: Record<AlertVariant, string> = {
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  error:   'bg-red-50 text-red-800 border border-red-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  info:    'bg-indigo-50 text-indigo-800 border border-indigo-200',
}

const alertIconDefault: Record<AlertVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export function Alert({
  children, variant = 'info', icon
}: {
  children: ReactNode; variant?: AlertVariant; icon?: string
}) {
  const iconToShow = icon ?? alertIconDefault[variant]
  return (
    <div className={cn(
      'rounded-lg px-4 py-3 flex items-start gap-3 text-[13px] font-medium leading-relaxed',
      alertClasses[variant]
    )}>
      <span className="flex-shrink-0 text-[13px] font-bold mt-px">{iconToShow}</span>
      <span>{children}</span>
    </div>
  )
}
