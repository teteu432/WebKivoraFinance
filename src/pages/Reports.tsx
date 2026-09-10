import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { useFinance } from '../contexts/FinanceContext'
import { useToast } from '../contexts/ToastContext'
import { categoryExpenses, currentBalance, totals } from '../utils/calculations'
import { exportFinancialReport } from '../utils/exportToExcel'
import { brl } from '../utils/format'

export default function Reports(){
  const {transactions,accounts,goals,preferences}=useFinance()
  const {showToast}=useToast()
  const [exporting,setExporting]=useState(false)
  const t=totals(transactions)
  const cats=categoryExpenses(transactions)

  const exportReport=async()=>{
    try{
      setExporting(true)
      await exportFinancialReport(transactions,accounts,goals,preferences)
      showToast('Relatório financeiro XLSX gerado com sucesso.')
    }catch(err){
      showToast(err instanceof Error?err.message:'Não foi possível gerar o relatório.','error')
    }finally{setExporting(false)}
  }

  return <div className="page-stack">
    <div className="page-title"><div><span className="eyebrow">Análise e dados</span><h1>Relatórios</h1><p>Consolide seus números e leve os dados para o Excel.</p></div><button className="primary-btn" disabled={exporting} onClick={()=>void exportReport()}><Download size={17}/> {exporting?'Gerando relatório...':'Exportar relatório XLSX'}</button></div>
    <section className="report-summary"><div><span>Saldo consolidado</span><strong>{brl(currentBalance(transactions))}</strong></div><div><span>Receitas</span><strong>{brl(t.receitas)}</strong></div><div><span>Despesas</span><strong>{brl(t.despesas)}</strong></div><div><span>Resultado</span><strong>{brl(t.resultado)}</strong></div></section>
    <section className="two-columns"><div className="panel"><h2>Maiores categorias de despesa</h2><div className="rank-list">{cats.slice(0,6).map((c,i)=><div key={c.name}><span>{i+1}. {c.name}</span><strong>{brl(c.value)}</strong></div>)}</div></div><div className="panel export-card"><FileSpreadsheet size={38}/><h2>Arquivo Excel profissional</h2><p>O arquivo traz resumo executivo, fluxo mensal, análise por categoria, transações, contas e planejamento, com identidade visual da Web Kivora.</p><button className="secondary-btn" disabled={exporting} onClick={()=>void exportReport()}><Download size={17}/> {exporting?'Gerando...':'Gerar .XLSX'}</button></div></section>
  </div>
}
