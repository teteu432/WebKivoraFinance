import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { useFinance } from '../contexts/FinanceContext'
import { useToast } from '../contexts/ToastContext'
import type { Transaction, TransactionType } from '../types'
import { exportTransactionsXlsx } from '../utils/exportToExcel'
import { brl, shortDate } from '../utils/format'
import { isValidDate, isValidMoney, normalizeText } from '../utils/validation'

const categories = ['Alimentação','Transporte','Moradia','Saúde','Educação','Lazer','Assinaturas','Serviços','Investimentos','Salário','Vendas','Outros']
const initial = { type:'despesa' as TransactionType, description:'', category:'Outros', amount:'', date:new Date().toISOString().slice(0,10), paymentMethod:'PIX', status:'confirmado' as Transaction['status'], notes:'' }

export default function Transactions() {
  const { transactions, addTransaction, updateTransaction, removeTransaction } = useFinance()
  const { showToast } = useToast()
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState<Transaction|null>(null)
  const [form,setForm]=useState(initial)
  const [query,setQuery]=useState('')
  const [type,setType]=useState<'todos'|TransactionType>('todos')
  const [formError,setFormError]=useState('')
  const [saving,setSaving]=useState(false)
  const [deleteTarget,setDeleteTarget]=useState<Transaction|null>(null)
  const [deleting,setDeleting]=useState(false)
  const [exporting,setExporting]=useState(false)

  const filtered = useMemo(()=>transactions.filter(t=>(type==='todos'||t.type===type) && `${t.description} ${t.category}`.toLowerCase().includes(query.trim().toLowerCase())),[transactions,type,query])

  const openNew = () => {
    setEditing(null)
    setForm(initial)
    setFormError('')
    setOpen(true)
  }

  const edit=(t:Transaction)=>{
    setEditing(t)
    setForm({type:t.type,description:t.description,category:t.category,amount:String(t.amount),date:t.date,paymentMethod:t.paymentMethod,status:t.status,notes:t.notes??''})
    setFormError('')
    setOpen(true)
  }

  const submit=async(e:FormEvent)=>{
    e.preventDefault()
    setFormError('')
    const amount = Number(form.amount)
    const description = normalizeText(form.description)
    const paymentMethod = normalizeText(form.paymentMethod)
    const notes = form.notes.trim()

    if (description.length < 2) return setFormError('Informe uma descrição com pelo menos 2 caracteres.')
    if (description.length > 180) return setFormError('A descrição pode ter no máximo 180 caracteres.')
    if (!isValidMoney(amount)) return setFormError('Informe um valor válido maior que zero.')
    if (!isValidDate(form.date)) return setFormError('Informe uma data válida.')
    if (!paymentMethod || paymentMethod.length > 80) return setFormError('Informe uma forma de pagamento válida.')
    if (notes.length > 1000) return setFormError('A observação pode ter no máximo 1000 caracteres.')

    const payload = {...form, description, paymentMethod, notes, amount}
    try {
      setSaving(true)
      if(editing) {
        await updateTransaction({...payload,id:editing.id})
        showToast('Transação atualizada com sucesso.')
      } else {
        await addTransaction(payload)
        showToast('Transação cadastrada com sucesso.')
      }
      setOpen(false)
      setEditing(null)
      setForm(initial)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar a transação.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await removeTransaction(deleteTarget.id)
      showToast('Transação excluída.')
      setDeleteTarget(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível excluir a transação.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const exportData = async () => {
    if (!filtered.length) return showToast('Não há transações para exportar.', 'info')
    try {
      setExporting(true)
      await exportTransactionsXlsx(filtered)
      showToast(`XLSX gerado com ${filtered.length} ${filtered.length === 1 ? 'transação' : 'transações'}.`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível gerar o XLSX.', 'error')
    } finally {
      setExporting(false)
    }
  }

  return <div className="page-stack">
    <div className="page-title">
      <div><span className="eyebrow">Movimentações</span><h1>Transações</h1><p>Registre e acompanhe entradas e saídas.</p></div>
      <div className="actions">
        <button className="secondary-btn" disabled={exporting} onClick={()=>void exportData()}><Download size={17}/> {exporting?'Gerando...':'Exportar XLSX'}</button>
        <button className="primary-btn" onClick={openNew}><Plus size={17}/> Nova transação</button>
      </div>
    </div>

    <div className="toolbar">
      <div className="input-icon search"><Search size={17}/><input aria-label="Buscar transações" placeholder="Buscar por descrição ou categoria" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <select aria-label="Filtrar por tipo" value={type} onChange={e=>setType(e.target.value as typeof type)}><option value="todos">Todos os tipos</option><option value="receita">Receitas</option><option value="despesa">Despesas</option></select>
    </div>

    <div className="panel table-panel">{filtered.length===0?<EmptyState/>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Forma</th><th>Valor</th><th></th></tr></thead><tbody>{filtered.map(t=><tr key={t.id}><td>{shortDate(t.date)}</td><td><strong>{t.description}</strong></td><td>{t.category}</td><td><span className={`badge ${t.type}`}>{t.type}</span></td><td>{t.paymentMethod}</td><td className={t.type==='receita'?'positive':'negative'}>{t.type==='receita'?'+':'-'} {brl(t.amount)}</td><td><div className="row-actions"><button className="icon-btn" aria-label={`Editar ${t.description}`} onClick={()=>edit(t)}><Pencil size={16}/></button><button className="icon-btn danger-text" aria-label={`Excluir ${t.description}`} onClick={()=>setDeleteTarget(t)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}</div>

    {open&&<Modal title={editing?'Editar transação':'Nova transação'} onClose={()=>{if(!saving)setOpen(false)}}><form className="form-grid" onSubmit={submit}>
      <label>Tipo<select value={form.type} onChange={e=>setForm({...form,type:e.target.value as TransactionType})}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label>
      <label>Valor<input type="number" step="0.01" min="0.01" max="999999999999.99" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></label>
      <label className="span-2">Descrição<input maxLength={180} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/></label>
      <label>Categoria<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Data<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></label>
      <label>Forma de pagamento<input maxLength={80} value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})} required/></label>
      <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'confirmado'|'pendente'})}><option value="confirmado">Confirmado</option><option value="pendente">Pendente</option></select></label>
      <label className="span-2">Observação<textarea maxLength={1000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><small className="field-hint">{form.notes.length}/1000</small></label>
      {formError&&<div className="form-error span-2">{formError}</div>}
      <div className="form-actions span-2"><button type="button" className="secondary-btn" disabled={saving} onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving?'Salvando...':'Salvar'}</button></div>
    </form></Modal>}

    <ConfirmDialog open={Boolean(deleteTarget)} title="Excluir transação?" message={deleteTarget ? `A transação “${deleteTarget.description}” será removida permanentemente.` : ''} confirmLabel="Excluir" loading={deleting} onClose={()=>setDeleteTarget(null)} onConfirm={confirmDelete}/>
  </div>
}
