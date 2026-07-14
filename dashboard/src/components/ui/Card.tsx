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
    <div className={cn(
      'bg-white border border-gray-200 rounded-2xl shadow-sm',
      !noPad && 'p-6',
      hover && 'card-hover',
      className
    )}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon, className }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 mb-4 font-heading font-bold text-sm text-gray-800', className)}>
      {icon && <span className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0">{icon}</span>}
      {children}
    </div>
  )
}
