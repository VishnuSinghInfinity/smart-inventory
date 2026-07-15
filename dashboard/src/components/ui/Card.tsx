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
      'bg-white border border-gray-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]',
      !noPad && 'p-6',
      hover && 'card-hover',
      className
    )}>
      {children}
    </div>
  )
}

export function CardTitle({
  children, icon, className, subtitle
}: {
  children: ReactNode
  icon?: ReactNode
  className?: string
  subtitle?: string
}) {
  return (
    <div className={cn('mb-5', className)}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[14px] flex-shrink-0 bg-gray-100 text-gray-600">
            {icon}
          </span>
        )}
        <span className="font-semibold text-[13px] text-gray-800 tracking-tight leading-none">
          {children}
        </span>
      </div>
      {subtitle && (
        <p className="text-[12px] text-gray-500 mt-1.5 ml-0.5">{subtitle}</p>
      )}
    </div>
  )
}

export function SectionHeader({
  title, description, action
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-gray-500 mt-1 max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0 pt-0.5">{action}</div>}
    </div>
  )
}
