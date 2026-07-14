import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export const fmt = (n: number) => n.toLocaleString('en-IN')
export const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
export const fmtCurrency = (n: number) => '₹' + n.toLocaleString('en-IN')

export function parsePriceValue(s: string): number | null {
  const m = s.match(/[\d,]+(?:\.\d{1,2})?/)
  if (!m) return null
  return parseFloat(m[0].replace(/,/g, ''))
}

export function getStockClass(count: number, threshold: number) {
  if (count < threshold * 0.5) return 'critical'
  if (count < threshold) return 'low'
  return 'ok'
}
