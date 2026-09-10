export const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export const shortDate = (date: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T12:00:00`))
export const monthLabel = (date: Date) => new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')

export const daysUntil = (isoDate: string) => {
  const now = new Date(); now.setHours(0,0,0,0)
  const due = new Date(`${isoDate}T00:00:00`)
  return Math.round((due.getTime() - now.getTime()) / 86400000)
}

export const dueLabel = (isoDate: string) => {
  const days = daysUntil(isoDate)
  if (days < 0) return `Atrasada há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  return `Vence em ${days} dias`
}

export const priorityClass = (isoDate: string) => {
  const days = daysUntil(isoDate)
  if (days < 0) return 'danger'
  if (days <= 1) return 'danger'
  if (days <= 4) return 'warning-strong'
  if (days <= 8) return 'warning'
  return 'success'
}
