import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

type Variant = 'green' | 'red' | 'orange' | 'violet' | 'cyan' | 'gray' | 'pink'

const variantClasses: Record<Variant, string> = {
  green:  'bg-emerald-50 text-emerald-700',
  red:    'bg-red-50 text-red-600',
  orange: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
  cyan:   'bg-cyan-50 text-cyan-700',
  gray:   'bg-gray-100 text-gray-600',
  pink:   'bg-pink-50 text-pink-600',
}

export function Badge({ children, variant = 'gray', className }: { children: ReactNode; variant?: Variant; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  )
}

type AlertVariant = 'success' | 'error' | 'warning' | 'info'
const alertClasses: Record<AlertVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  error:   'bg-red-50 text-red-600 border border-red-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  info:    'bg-violet-50 text-violet-700 border border-violet-200',
}

export function Alert({ children, variant = 'info', icon }: { children: ReactNode; variant?: AlertVariant; icon?: string }) {
  return (
    <div className={cn('rounded-xl p-3 flex items-start gap-2.5 text-sm font-medium', alertClasses[variant])}>
      {icon && <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>}
      <span>{children}</span>
    </div>
  )
}
