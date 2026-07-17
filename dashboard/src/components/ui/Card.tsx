import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  noPad?: boolean
}

export function Card({ children, className, hover = false, noPad = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl',
        !noPad && 'p-5',
        hover && 'card-hover',
        className
      )}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, icon, className }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 mb-4 font-heading font-bold text-[13px] tracking-wide', className)}
      style={{ color: '#E2E8F0' }}
    >
      {icon && (
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {icon}
        </span>
      )}
      {children}
    </div>
  )
}
