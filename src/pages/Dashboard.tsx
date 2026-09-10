import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Landmark, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import FinancialCard from '../components/FinancialCard'
import { useFinance } from '../contexts/FinanceContext'
import { categoryExpenses, currentBalance, monthlySeries, projectedBalance, totals } from '../utils/calculations'
import { brl, dueLabel, priorityClass, shortDate } from '../utils/format'

const chartColors = ['#3182f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#64748b']

export default function Dashboard() {
  const { transactions, accounts, goals, preferences } = useFinance()
  const currentMonth = new Date().getMonth(), currentYear = new Date().getFullYear()
  const monthTx = transactions.filter(t => { const d = new Date(`${t.date}T12:00:00`); return d.getMonth()===currentMonth && d.getFullYear()===currentYear })
  const t = totals(monthTx); const balance = currentBalance(transactions); const projected = projectedBalance(transactions, accounts)
  const pendingBills = accounts.filter(a => a.kind==='pagar' && a.status!=='pago').sort((a,b)=>a.dueDate.localeCompare(b.dueDate))
  const incoming = accounts.filter(a=>a.kind==='receber' && a.status!=='recebido').reduce((s,a)=>s+a.amount,0)
  const expenseData = categoryExpenses(monthTx.length ? monthTx : transactions)
  const series = monthlySeries(transactions)
  return <div className="page-stack">
    <div className="page-title"><div><span className="eyebrow">Visão geral</span><h1>Olá, {preferences.displayName}</h1><p>Acompanhe o que entrou, o que saiu e o que vem pela frente.</p></div><div className={`health-chip ${projected >= 0 ? 'good' : 'bad'}`}>{projected >= 0 ? 'Fluxo saudável' : 'Atenção ao fluxo'}</div></div>
    <section className="metrics-grid">
      <FinancialCard title="Saldo atual" value={balance} icon={Wallet} hint="Consolidado das transações"/>
      <FinancialCard title="Receitas do mês" value={t.receitas} icon={ArrowUpRight} tone="green"/>
      <FinancialCard title="Despesas do mês" value={t.despesas} icon={ArrowDownRight} tone="red"/>
      <FinancialCard title="Saldo previsto" value={projected} icon={Landmark} hint={`Inclui ${brl(incoming)} a receber`} tone="purple"/>
    </section>
    <section className="two-columns">
      <div className="panel"><div className="panel-head"><div><h2>Receitas x despesas</h2><p>Últimos 6 meses</p></div></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><BarChart data={series}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="month" stroke="#94a3b8"/><YAxis stroke="#94a3b8" tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip formatter={(v:number)=>brl(v)} contentStyle={{background:'#0f1b2e',border:'1px solid #25324a',borderRadius:12}}/><Legend/><Bar dataKey="receita" name="Receitas" fill="#3182f6" radius={[5,5,0,0]}/><Bar dataKey="despesa" name="Despesas" fill="#64748b" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></div>
      <div className="panel"><div className="panel-head"><div><h2>Despesas por categoria</h2><p>Distribuição do período</p></div></div><div className="chart-box"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>{expenseData.map((_,i)=><Cell key={i} fill={chartColors[i%chartColors.length]}/>)}</Pie><Tooltip formatter={(v:number)=>brl(v)} contentStyle={{background:'#0f1b2e',border:'1px solid #25324a',borderRadius:12}}/><Legend/></PieChart></ResponsiveContainer></div></div>
    </section>
    <section className="two-columns compact-panels">
      <div className="panel"><div className="panel-head"><div><h2>Próximas contas</h2><p>Prioridade por vencimento</p></div></div><div className="list">{pendingBills.slice(0,5).map(a=><div className="list-row" key={a.id}><div className={`dot ${priorityClass(a.dueDate)}`}/><div className="grow"><strong>{a.name}</strong><span>{shortDate(a.dueDate)} · {dueLabel(a.dueDate)}</span></div><strong>{brl(a.amount)}</strong></div>)}</div></div>
      <div className="panel"><div className="panel-head"><div><h2>Metas</h2><p>Seu planejamento em andamento</p></div><CircleDollarSign size={20}/></div><div className="list">{goals.map(g=>{const p=Math.min(100,(g.savedAmount/g.targetAmount)*100);return <div className="goal-mini" key={g.id}><div><strong>{g.name}</strong><span>{brl(g.savedAmount)} de {brl(g.targetAmount)}</span></div><div className="progress"><i style={{width:`${p}%`}}/></div><small>{p.toFixed(0)}%</small></div>})}</div></div>
    </section>
  </div>
}
