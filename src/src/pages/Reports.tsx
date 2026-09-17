import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Download,
  FileSpreadsheet,
  Landmark,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import EmptyState from '../components/EmptyState'
import FinancialCard from '../components/FinancialCard'
import { useFinance } from '../contexts/FinanceContext'
import { useToast } from '../contexts/ToastContext'
import type { Transaction } from '../types'
import { brl, shortDate } from '../utils/format'

type PeriodPreset = 'month' | 'last3' | 'last6' | 'year' | 'custom'
type StatusFilter = 'confirmed' | 'all'

type Period = {
  start: string
  end: string
  label: string
}

const pad = (value: number) => String(value).padStart(2, '0')
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const fromIso = (iso: string) => new Date(`${iso}T12:00:00`)
const lastDayOfMonth = (year: number, month: number) => new Date(year, month + 1, 0)

const formatPeriodDate = (iso: string) => new Intl.DateTimeFormat('pt-BR').format(fromIso(iso))

const presetPeriod = (preset: Exclude<PeriodPreset, 'custom'>, now = new Date()): Period => {
  const year = now.getFullYear()
  const month = now.getMonth()

  if (preset === 'month') {
    const start = new Date(year, month, 1)
    const end = lastDayOfMonth(year, month)
    return {
      start: toIso(start),
      end: toIso(end),
      label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(start),
    }
  }

  if (preset === 'year') {
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: `Ano de ${year}` }
  }

  const months = preset === 'last3' ? 3 : 6
  const start = new Date(year, month - (months - 1), 1)
  const end = lastDayOfMonth(year, month)
  return {
    start: toIso(start),
    end: toIso(end),
    label: `Últimos ${months} meses`,
  }
}

const previousPeriod = (preset: PeriodPreset, current: Period): Period => {
  const start = fromIso(current.start)
  const end = fromIso(current.end)

  if (preset === 'month') {
    const previous = new Date(start.getFullYear(), start.getMonth() - 1, 1)
    return {
      start: toIso(previous),
      end: toIso(lastDayOfMonth(previous.getFullYear(), previous.getMonth())),
      label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(previous),
    }
  }

  if (preset === 'year') {
    const year = start.getFullYear() - 1
    return { start: `${year}-01-01`, end: `${year}-12-31`, label: `Ano de ${year}` }
  }

  if (preset === 'last3' || preset === 'last6') {
    const months = preset === 'last3' ? 3 : 6
    const previousEnd = new Date(start.getFullYear(), start.getMonth(), 0)
    const previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth() - (months - 1), 1)
    return {
      start: toIso(previousStart),
      end: toIso(previousEnd),
      label: `${formatPeriodDate(toIso(previousStart))} a ${formatPeriodDate(toIso(previousEnd))}`,
    }
  }

  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
  const previousEnd = new Date(start)
  previousEnd.setDate(previousEnd.getDate() - 1)
  const previousStart = new Date(previousEnd)
  previousStart.setDate(previousStart.getDate() - (duration - 1))
  return {
    start: toIso(previousStart),
    end: toIso(previousEnd),
    label: `${formatPeriodDate(toIso(previousStart))} a ${formatPeriodDate(toIso(previousEnd))}`,
  }
}

const inPeriod = (date: string, period: Period) => date >= period.start && date <= period.end

const datasetTotals = (items: Transaction[]) => {
  const receitas = items.filter((item) => item.type === 'receita').reduce((sum, item) => sum + item.amount, 0)
  const despesas = items.filter((item) => item.type === 'despesa').reduce((sum, item) => sum + item.amount, 0)
  return { receitas, despesas, resultado: receitas - despesas }
}

const comparePercent = (current: number, previous: number) => {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

const comparisonText = (value: number | null) => {
  if (value === null) return 'Sem base anterior'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}% vs. período anterior`
}

const comparisonClass = (value: number | null, inverse = false) => {
  if (value === null || value === 0) return 'neutral'
  const positive = inverse ? value < 0 : value > 0
  return positive ? 'positive' : 'negative'
}

const monthsBetween = (startIso: string, endIso: string) => {
  const start = fromIso(startIso)
  const end = fromIso(endIso)
  return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1)
}

const categoryRows = (items: Transaction[]) => {
  const expenses = items.filter((item) => item.type === 'despesa')
  const map = new Map<string, number>()
  expenses.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + item.amount))
  const total = expenses.reduce((sum, item) => sum + item.amount, 0)
  return [...map.entries()]
    .map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

const trendRows = (items: Transaction[], period: Period) => {
  const start = fromIso(period.start)
  const end = fromIso(period.end)
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1

  if (days <= 62) {
    const rows: Array<{ key: string; label: string; receita: number; despesa: number; resultado: number }> = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = toIso(cursor)
      const daily = items.filter((item) => item.date === key)
      const totals = datasetTotals(daily)
      rows.push({ key, label: `${pad(cursor.getDate())}/${pad(cursor.getMonth() + 1)}`, receita: totals.receitas, despesa: totals.despesas, resultado: totals.resultado })
      cursor.setDate(cursor.getDate() + 1)
    }
    return rows
  }

  const rows: Array<{ key: string; label: string; receita: number; despesa: number; resultado: number }> = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const monthly = items.filter((item) => {
      const date = fromIso(item.date)
      return date.getFullYear() === year && date.getMonth() === month
    })
    const totals = datasetTotals(monthly)
    rows.push({
      key: `${year}-${pad(month + 1)}`,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(cursor).replace('.', ''),
      receita: totals.receitas,
      despesa: totals.despesas,
      resultado: totals.resultado,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return rows
}

const cumulativeRows = (items: Transaction[]) => {
  const byDate = new Map<string, number>()
  items.forEach((item) => {
    const signed = item.type === 'receita' ? item.amount : -item.amount
    byDate.set(item.date, (byDate.get(item.date) ?? 0) + signed)
  })
  let balance = 0
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => {
      balance += value
      return { date, label: shortDate(date), saldo: balance }
    })
}

export default function Reports() {
  const { transactions, accounts, goals, preferences } = useFinance()
  const { showToast } = useToast()
  const initialMonth = presetPeriod('month')
  const [preset, setPreset] = useState<PeriodPreset>('month')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('confirmed')
  const [customStart, setCustomStart] = useState(initialMonth.start)
  const [customEnd, setCustomEnd] = useState(initialMonth.end)
  const [exporting, setExporting] = useState(false)

  const period = useMemo<Period>(() => {
    if (preset !== 'custom') return presetPeriod(preset)
    return {
      start: customStart,
      end: customEnd,
      label: customStart && customEnd ? `${formatPeriodDate(customStart)} a ${formatPeriodDate(customEnd)}` : 'Período personalizado',
    }
  }, [preset, customStart, customEnd])

  const validPeriod = Boolean(period.start && period.end && period.start <= period.end)
  const prior = useMemo(() => validPeriod ? previousPeriod(preset, period) : period, [preset, period, validPeriod])

  const filterByStatus = (items: Transaction[]) => statusFilter === 'confirmed'
    ? items.filter((item) => item.status === 'confirmado')
    : items

  const filtered = useMemo(() => {
    if (!validPeriod) return []
    return filterByStatus(transactions.filter((item) => inPeriod(item.date, period)))
  }, [transactions, period, statusFilter, validPeriod])

  const previousItems = useMemo(() => {
    if (!validPeriod) return []
    return filterByStatus(transactions.filter((item) => inPeriod(item.date, prior)))
  }, [transactions, prior, statusFilter, validPeriod])

  const totals = useMemo(() => datasetTotals(filtered), [filtered])
  const priorTotals = useMemo(() => datasetTotals(previousItems), [previousItems])
  const categories = useMemo(() => categoryRows(filtered), [filtered])
  const trend = useMemo(() => trendRows(filtered, period), [filtered, period])
  const cumulative = useMemo(() => cumulativeRows(filtered), [filtered])

  const topExpenses = useMemo(() => filtered.filter((item) => item.type === 'despesa').sort((a, b) => b.amount - a.amount).slice(0, 5), [filtered])
  const topIncome = useMemo(() => filtered.filter((item) => item.type === 'receita').sort((a, b) => b.amount - a.amount).slice(0, 5), [filtered])

  const linkedSettlements = filtered.filter((item) => item.sourceAccountId && item.status === 'confirmado')
  const paidAccounts = linkedSettlements.filter((item) => item.type === 'despesa')
  const receivedAccounts = linkedSettlements.filter((item) => item.type === 'receita')
  const paidAmount = paidAccounts.reduce((sum, item) => sum + item.amount, 0)
  const receivedAmount = receivedAccounts.reduce((sum, item) => sum + item.amount, 0)
  const monthCount = validPeriod ? monthsBetween(period.start, period.end) : 1
  const averageRevenue = totals.receitas / monthCount
  const averageExpenses = totals.despesas / monthCount
  const commitmentRate = totals.receitas > 0 ? (totals.despesas / totals.receitas) * 100 : 0

  const revenueCompare = comparePercent(totals.receitas, priorTotals.receitas)
  const expenseCompare = comparePercent(totals.despesas, priorTotals.despesas)
  const resultCompare = comparePercent(totals.resultado, priorTotals.resultado)

  const exportReport = async () => {
    if (!validPeriod) {
      showToast('Revise as datas do período personalizado.', 'error')
      return
    }
    try {
      setExporting(true)
      const { exportFinancialReport } = await import('../utils/exportToExcel')
      const linkedIds = new Set(filtered.map((item) => item.sourceAccountId).filter(Boolean))
      const periodAccounts = accounts.filter((item) => inPeriod(item.dueDate, period) || linkedIds.has(item.id))
      await exportFinancialReport(filtered, periodAccounts, goals, preferences, {
        startDate: period.start,
        endDate: period.end,
        periodLabel: period.label,
        includePending: statusFilter === 'all',
      })
      showToast('Relatório XLSX do período gerado com sucesso.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível gerar o relatório.', 'error')
    } finally {
      setExporting(false)
    }
  }

  return <div className="page-stack reports-page">
    <div className="page-title">
      <div>
        <span className="eyebrow">Análise e dados</span>
        <h1>Relatórios</h1>
        <p>Entenda a evolução do seu financeiro, compare períodos e encontre os principais impactos.</p>
      </div>
      <button className="primary-btn" disabled={exporting || !validPeriod} onClick={() => void exportReport()}>
        <Download size={17}/> {exporting ? 'Gerando relatório...' : 'Exportar XLSX'}
      </button>
    </div>

    <section className="panel report-filter-panel">
      <div className="report-filter-heading">
        <div><CalendarRange size={18}/><div><strong>Período de análise</strong><span>{period.label}</span></div></div>
        <span className="report-status-note">{statusFilter === 'confirmed' ? 'Somente movimentações confirmadas' : 'Confirmadas + pendentes'}</span>
      </div>
      <div className="report-filter-grid">
        <label><span>Período</span><select value={preset} onChange={(event) => setPreset(event.target.value as PeriodPreset)}>
          <option value="month">Mês atual</option>
          <option value="last3">Últimos 3 meses</option>
          <option value="last6">Últimos 6 meses</option>
          <option value="year">Ano atual</option>
          <option value="custom">Personalizado</option>
        </select></label>
        <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
          <option value="confirmed">Somente confirmadas</option>
          <option value="all">Incluir pendentes</option>
        </select></label>
        {preset === 'custom' && <>
          <label><span>Data inicial</span><input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)}/></label>
          <label><span>Data final</span><input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)}/></label>
        </>}
      </div>
      {!validPeriod && <div className="report-filter-error">A data inicial deve ser anterior ou igual à data final.</div>}
    </section>

    <section className="metrics-grid report-metrics">
      <FinancialCard title="Receitas do período" value={totals.receitas} icon={ArrowUpRight} hint={comparisonText(revenueCompare)} tone="green"/>
      <FinancialCard title="Despesas do período" value={totals.despesas} icon={ArrowDownRight} hint={comparisonText(expenseCompare)} tone="red"/>
      <FinancialCard title="Resultado do período" value={totals.resultado} icon={Landmark} hint={comparisonText(resultCompare)} tone={totals.resultado >= 0 ? 'green' : 'red'}/>
      <FinancialCard title="Média mensal" value={totals.resultado / monthCount} icon={TrendingUp} hint={`${brl(averageRevenue)} receita · ${brl(averageExpenses)} despesa`} tone="purple"/>
    </section>

    <section className="report-comparison-strip">
      <div><span>Comparação</span><strong>{prior.label}</strong></div>
      <div><span>Receitas</span><strong className={comparisonClass(revenueCompare)}>{comparisonText(revenueCompare)}</strong></div>
      <div><span>Despesas</span><strong className={comparisonClass(expenseCompare, true)}>{comparisonText(expenseCompare)}</strong></div>
      <div><span>Resultado</span><strong className={comparisonClass(resultCompare)}>{comparisonText(resultCompare)}</strong></div>
    </section>

    <section className="two-columns report-chart-grid">
      <div className="panel">
        <div className="panel-head"><div><h2>Evolução financeira</h2><p>Receitas e despesas dentro do período selecionado</p></div></div>
        {filtered.length === 0 ? <EmptyState text="Nenhuma movimentação encontrada neste período."/> : <div className="chart-box report-chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} barGap={5}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
          <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={18}/>
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`}/>
          <Tooltip formatter={(value: number) => brl(value)} contentStyle={{background:'#0f1b2e',border:'1px solid #25324a',borderRadius:12}}/>
          <Legend/>
          <Bar dataKey="receita" name="Receitas" fill="#3182f6" radius={[5,5,0,0]}/>
          <Bar dataKey="despesa" name="Despesas" fill="#64748b" radius={[5,5,0,0]}/>
        </BarChart></ResponsiveContainer></div>}
      </div>

      <div className="panel">
        <div className="panel-head"><div><h2>Fluxo acumulado</h2><p>Resultado líquido acumulado a partir de zero</p></div></div>
        {cumulative.length === 0 ? <EmptyState text="Sem dados para calcular o fluxo acumulado."/> : <div className="chart-box report-chart-box"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cumulative}>
          <defs><linearGradient id="reportBalanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3182f6" stopOpacity={0.35}/><stop offset="95%" stopColor="#3182f6" stopOpacity={0.02}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
          <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} minTickGap={24}/>
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`}/>
          <Tooltip formatter={(value: number) => brl(value)} contentStyle={{background:'#0f1b2e',border:'1px solid #25324a',borderRadius:12}}/>
          <Area type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="#3182f6" fill="url(#reportBalanceFill)" strokeWidth={2}/>
        </AreaChart></ResponsiveContainer></div>}
      </div>
    </section>

    <section className="report-insights-grid">
      <div className="report-insight-card"><ReceiptText size={19}/><div><span>Contas pagas no período</span><strong>{paidAccounts.length}</strong><small>{brl(paidAmount)} baixados e registrados</small></div></div>
      <div className="report-insight-card"><WalletCards size={19}/><div><span>Contas recebidas no período</span><strong>{receivedAccounts.length}</strong><small>{brl(receivedAmount)} recebidos e registrados</small></div></div>
      <div className="report-insight-card"><TrendingUp size={19}/><div><span>Renda comprometida</span><strong className={commitmentRate > 100 ? 'negative' : ''}>{commitmentRate.toFixed(1)}%</strong><small>Despesas sobre as receitas do período</small></div></div>
    </section>

    <section className="two-columns report-analysis-grid">
      <div className="panel">
        <div className="panel-head"><div><h2>Despesas por categoria</h2><p>Onde o dinheiro foi concentrado</p></div></div>
        {categories.length === 0 ? <EmptyState text="Nenhuma despesa encontrada para analisar."/> : <div className="report-category-list">{categories.slice(0, 7).map((category, index) => <div key={category.name}>
          <div className="report-category-row"><span><b>{index + 1}</b>{category.name}</span><strong>{brl(category.value)} <small>{category.percent.toFixed(1)}%</small></strong></div>
          <div className="report-category-bar"><i style={{width: `${Math.min(100, category.percent)}%`}}/></div>
        </div>)}</div>}
      </div>

      <div className="panel report-top-panel">
        <div className="panel-head"><div><h2>Maiores movimentações</h2><p>Principais entradas e saídas do período</p></div></div>
        <div className="report-top-columns">
          <div><h3>Receitas</h3>{topIncome.length === 0 ? <span className="report-mini-empty">Sem receitas</span> : topIncome.map((item) => <div className="report-top-row" key={item.id}><div><strong>{item.description}</strong><span>{shortDate(item.date)} · {item.category}</span></div><strong className="positive">+{brl(item.amount)}</strong></div>)}</div>
          <div><h3>Despesas</h3>{topExpenses.length === 0 ? <span className="report-mini-empty">Sem despesas</span> : topExpenses.map((item) => <div className="report-top-row" key={item.id}><div><strong>{item.description}</strong><span>{shortDate(item.date)} · {item.category}</span></div><strong className="negative">-{brl(item.amount)}</strong></div>)}</div>
        </div>
      </div>
    </section>

    <section className="panel report-export-footer">
      <div><FileSpreadsheet size={30}/><div><h2>Relatório filtrado para Excel</h2><p>O arquivo respeita o período e o status selecionados nesta tela e inclui resumo, fluxo, categorias, movimentações, contas e planejamento.</p></div></div>
      <button className="secondary-btn" disabled={exporting || !validPeriod} onClick={() => void exportReport()}><Download size={17}/> {exporting ? 'Gerando...' : 'Gerar .XLSX'}</button>
    </section>
  </div>
}
