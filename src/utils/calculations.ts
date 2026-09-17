import type { Account, Transaction } from '../types'

const transactionNet = (item: Transaction) => item.type === 'receita' ? item.amount : -item.amount
const confirmedOnly = (transactions: Transaction[]) => transactions.filter((item) => item.status === 'confirmado')

export function currentBalance(transactions: Transaction[]) {
  return confirmedOnly(transactions).reduce((total, item) => total + transactionNet(item), 0)
}

export function pendingTransactionBalance(transactions: Transaction[]) {
  return transactions.filter((item) => item.status === 'pendente').reduce((total, item) => total + transactionNet(item), 0)
}

export function totals(transactions: Transaction[]) {
  const confirmed = confirmedOnly(transactions)
  const receitas = confirmed.filter(x => x.type === 'receita').reduce((s, x) => s + x.amount, 0)
  const despesas = confirmed.filter(x => x.type === 'despesa').reduce((s, x) => s + x.amount, 0)
  return { receitas, despesas, resultado: receitas - despesas }
}

export function projectedBalance(transactions: Transaction[], accounts: Account[]) {
  const base = currentBalance(transactions)
  const pendingTransactions = pendingTransactionBalance(transactions)
  const futureIncome = accounts.filter(a => a.kind === 'receber' && a.status !== 'recebido').reduce((s,a) => s + a.amount, 0)
  const futureBills = accounts.filter(a => a.kind === 'pagar' && a.status !== 'pago').reduce((s,a) => s + a.amount, 0)
  return base + pendingTransactions + futureIncome - futureBills
}

export function categoryExpenses(transactions: Transaction[]) {
  const map = new Map<string, number>()
  confirmedOnly(transactions).filter(x => x.type === 'despesa').forEach(x => map.set(x.category, (map.get(x.category) ?? 0) + x.amount))
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
}

export function monthlySeries(transactions: Transaction[], months = 6) {
  const now = new Date()
  const confirmed = confirmedOnly(transactions)
  return Array.from({ length: months }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const year = d.getFullYear(); const month = d.getMonth()
    const items = confirmed.filter(t => { const td = new Date(`${t.date}T12:00:00`); return td.getFullYear() === year && td.getMonth() === month })
    const receita = items.filter(x => x.type === 'receita').reduce((s,x) => s + x.amount, 0)
    const despesa = items.filter(x => x.type === 'despesa').reduce((s,x) => s + x.amount, 0)
    return { month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', ''), receita, despesa }
  })
}
