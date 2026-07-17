import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

type Variant = 'green' | 'red' | 'orange' | 'violet' | 'cyan' | 'gray' | 'pink'

const variantStyles: Record<Variant, { bg: string; color: string; border: string }> = {
  green:  { bg: 'rgba(16,185,129,0.12)',  color: '#34D399', border: 'rgba(16,185,129,0.25)' },
  red:    { bg: 'rgba(239,68,68,0.12)',   color: '#F87171', border: 'rgba(239,68,68,0.25)' },
  orange: { bg: 'rgba(245,158,11,0.12)',  color: '#FCD34D', border: 'rgba(245,158,11,0.25)' },
  violet: { bg: 'rgba(139,92,246,0.12)',  color: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  cyan:   { bg: 'rgba(6,182,212,0.12)',   color: '#67E8F9', border: 'rgba(6,182,212,0.25)' },
  gray:   { bg: 'rgba(255,255,255,0.07)', color: '#94A3B8', border: 'rgba(255,255,255,0.12)' },
  pink:   { bg: 'rgba(236,72,153,0.12)',  color: '#F9A8D4', border: 'rgba(236,72,153,0.25)' },
}

export function Badge({ children, variant = 'gray', className }: { children: ReactNode; variant?: Variant; className?: string }) {
  const s = variantStyles[variant]
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full', className)}
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  )
}

type AlertVariant = 'success' | 'error' | 'warning' | 'info'
const alertStyles: Record<AlertVariant, { bg: string; color: string; border: string }> = {
  success: { bg: 'rgba(16,185,129,0.1)',  color: '#34D399', border: 'rgba(16,185,129,0.2)' },
  error:   { bg: 'rgba(239,68,68,0.1)',   color: '#F87171', border: 'rgba(239,68,68,0.2)' },
  warning: { bg: 'rgba(245,158,11,0.1)',  color: '#FCD34D', border: 'rgba(245,158,11,0.2)' },
  info:    { bg: 'rgba(139,92,246,0.1)',  color: '#A78BFA', border: 'rgba(139,92,246,0.2)' },
}

export function Alert({ children, variant = 'info', icon }: { children: ReactNode; variant?: AlertVariant; icon?: string }) {
  const s = alertStyles[variant]
  return (
    <div
      className="rounded-xl p-3.5 flex items-start gap-2.5 text-[13px] font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {icon && <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>}
      <span style={{ color: '#CBD5E1' }}>{children}</span>
    </div>
  )
}
