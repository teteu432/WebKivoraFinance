import type { LucideIcon } from 'lucide-react'
import { brl } from '../utils/format'

export default function FinancialCard({ title, value, icon: Icon, hint, tone = 'blue' }: { title: string; value: number; icon: LucideIcon; hint?: string; tone?: string }) {
  return <article className={`metric-card ${tone}`}>
    <div className="metric-top"><span>{title}</span><Icon size={19} /></div>
    <strong>{brl(value)}</strong>
    {hint && <small>{hint}</small>}
  </article>
}
