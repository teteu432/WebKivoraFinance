import { Check, Link2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { useFinance } from '../contexts/FinanceContext'
import { useToast } from '../contexts/ToastContext'
import type { Account, AccountKind, AccountStatus } from '../types'
import { brl, dueLabel, localDateISO, priorityClass, shortDate } from '../utils/format'
import { isValidDate, isValidMoney, normalizeText } from '../utils/validation'

const createInitial=()=>({kind:'pagar' as AccountKind,name:'',description:'',category:'Outros',amount:'',dueDate:localDateISO(),status:'pendente' as AccountStatus,paymentMethod:'PIX',notes:''})

export default function Accounts(){
 const {accounts,addAccount,updateAccount,removeAccount,settleAccount,reopenAccount}=useFinance()
 const {showToast}=useToast()
 const [open,setOpen]=useState(false)
 const [editing,setEditing]=useState<Account|null>(null)
 const [form,setForm]=useState(createInitial)
 const [tab,setTab]=useState<AccountKind>('pagar')
 const [formError,setFormError]=useState('')
 const [saving,setSaving]=useState(false)
 const [deleteTarget,setDeleteTarget]=useState<Account|null>(null)
 const [deleting,setDeleting]=useState(false)
 const [settlementTarget,setSettlementTarget]=useState<Account|null>(null)
 const [settlementDate,setSettlementDate]=useState(localDateISO())
 const [settling,setSettling]=useState(false)
 const [reopenTarget,setReopenTarget]=useState<Account|null>(null)
 const [reopening,setReopening]=useState(false)

 const list=useMemo(()=>accounts.filter(a=>a.kind===tab).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)),[accounts,tab])

 const openNew=()=>{
   setEditing(null)
   setForm({...createInitial(),kind:tab,status:tab==='pagar'?'pendente':'previsto'})
   setFormError('')
   setOpen(true)
 }

 const edit=(a:Account)=>{
   if(['pago','recebido'].includes(a.status)){
     showToast('Reabra a conta antes de editá-la. Isso mantém a movimentação vinculada consistente.','info')
     return
   }
   setEditing(a)
   setForm({kind:a.kind,name:a.name,description:a.description,category:a.category,amount:String(a.amount),dueDate:a.dueDate,status:a.status,paymentMethod:a.paymentMethod,notes:a.notes??''})
   setFormError('')
   setOpen(true)
 }

 const submit=async(e:FormEvent)=>{
   e.preventDefault()
   setFormError('')
   const amount=Number(form.amount)
   const name=normalizeText(form.name)
   const description=form.description.trim()
   const category=normalizeText(form.category)
   const paymentMethod=normalizeText(form.paymentMethod)
   const notes=form.notes.trim()

   if(name.length<2)return setFormError('Informe um nome com pelo menos 2 caracteres.')
   if(name.length>180)return setFormError('O nome pode ter no máximo 180 caracteres.')
   if(!isValidMoney(amount))return setFormError('Informe um valor válido maior que zero.')
   if(!isValidDate(form.dueDate))return setFormError('Informe uma data de vencimento válida.')
   if(!category||category.length>80)return setFormError('Informe uma categoria válida.')
   if(!paymentMethod||paymentMethod.length>80)return setFormError('Informe uma forma de pagamento válida.')
   if(description.length>500)return setFormError('A descrição pode ter no máximo 500 caracteres.')
   if(notes.length>1000)return setFormError('A observação pode ter no máximo 1000 caracteres.')

   const payload={...form,name,description,category,paymentMethod,notes,amount}
   try{
     setSaving(true)
     if(editing){
       await updateAccount({...payload,id:editing.id})
       showToast('Conta atualizada com sucesso.')
     }else{
       await addAccount(payload)
       showToast('Conta cadastrada com sucesso.')
     }
     setOpen(false);setEditing(null);setForm(createInitial())
   }catch(err){
     setFormError(err instanceof Error?err.message:'Não foi possível salvar a conta.')
   }finally{setSaving(false)}
 }

 const openSettlement=(a:Account)=>{
   setSettlementTarget(a)
   setSettlementDate(localDateISO())
 }

 const confirmSettlement=async()=>{
   if(!settlementTarget)return
   if(!isValidDate(settlementDate))return showToast('Informe uma data de baixa válida.','error')
   try{
     setSettling(true)
     await settleAccount(settlementTarget.id,settlementDate)
     showToast(settlementTarget.kind==='pagar'
       ?'Conta paga e despesa registrada automaticamente.'
       :'Recebimento confirmado e receita registrada automaticamente.')
     setSettlementTarget(null)
   }catch(err){showToast(err instanceof Error?err.message:'Não foi possível dar baixa na conta.','error')}
   finally{setSettling(false)}
 }

 const confirmReopen=async()=>{
   if(!reopenTarget)return
   try{
     setReopening(true)
     await reopenAccount(reopenTarget.id)
     showToast('Conta reaberta. A movimentação automática vinculada foi removida.','info')
     setReopenTarget(null)
   }catch(err){showToast(err instanceof Error?err.message:'Não foi possível reabrir a conta.','error')}
   finally{setReopening(false)}
 }

 const confirmDelete=async()=>{
   if(!deleteTarget)return
   try{
     setDeleting(true)
     await removeAccount(deleteTarget.id)
     showToast('Conta excluída.')
     setDeleteTarget(null)
   }catch(err){showToast(err instanceof Error?err.message:'Não foi possível excluir a conta.','error')}
   finally{setDeleting(false)}
 }

 return <div className="page-stack">
   <div className="page-title"><div><span className="eyebrow">Compromissos</span><h1>Contas</h1><p>Controle vencimentos e recebimentos. Ao dar baixa, a movimentação correspondente é registrada automaticamente no financeiro.</p></div><button className="primary-btn" onClick={openNew}><Plus size={17}/> Nova conta</button></div>
   <div className="tabs"><button className={tab==='pagar'?'active':''} onClick={()=>setTab('pagar')}>A pagar</button><button className={tab==='receber'?'active':''} onClick={()=>setTab('receber')}>A receber</button></div>
   {list.length===0 ? <div className="panel"><EmptyState text={tab==='pagar'?'Nenhuma conta a pagar cadastrada.':'Nenhuma conta a receber cadastrada.'}/></div> : <div className="accounts-grid">{list.map(a=>{const settled=['pago','recebido'].includes(a.status);const urgencyClass=settled?'success':a.status==='atrasado'?'danger':priorityClass(a.dueDate);const urgencyLabel=settled?a.status:dueLabel(a.dueDate);return <article className="account-card" key={a.id}><div className="account-top"><div className={`priority ${urgencyClass}`}><span/>{urgencyLabel}</div><div className="row-actions"><button className="icon-btn" disabled={settled} title={settled?'Reabra a conta para editar.':'Editar conta'} aria-label={`Editar ${a.name}`} onClick={()=>edit(a)}><Pencil size={16}/></button><button className="icon-btn danger-text" disabled={settled} title={settled?'Reabra a conta para excluir.':'Excluir conta'} aria-label={`Excluir ${a.name}`} onClick={()=>setDeleteTarget(a)}><Trash2 size={16}/></button></div></div><h3>{a.name}</h3><p>{a.description}</p><strong className="account-value">{brl(a.amount)}</strong><div className="account-meta"><span>Vencimento</span><strong>{shortDate(a.dueDate)}</strong><span>Categoria</span><strong>{a.category}</strong></div>{settled?<><div className="account-linked-note"><Link2 size={14}/> Movimentação registrada automaticamente</div><button className="secondary-btn full" onClick={()=>setReopenTarget(a)}><RotateCcw size={16}/> Reabrir conta</button></>:<button className="secondary-btn full" onClick={()=>openSettlement(a)}><Check size={16}/> {a.kind==='pagar'?'Dar baixa como paga':'Confirmar recebimento'}</button>}</article>})}</div>}

   {open&&<Modal title={editing?'Editar conta':'Nova conta'} onClose={()=>{if(!saving)setOpen(false)}}><form className="form-grid" onSubmit={submit}>
     <label>Tipo<select value={form.kind} onChange={e=>{const k=e.target.value as AccountKind;setForm({...form,kind:k,status:k==='pagar'?'pendente':'previsto'})}}><option value="pagar">A pagar</option><option value="receber">A receber</option></select></label>
     <label>Valor<input type="number" min="0.01" max="999999999999.99" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required/></label>
     <label className="span-2">Nome<input maxLength={180} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
     <label>Categoria<input maxLength={80} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required/></label>
     <label>Vencimento<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} required/></label>
     <label>Forma<input maxLength={80} value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})} required/></label>
     <label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as AccountStatus})}>{form.kind==='pagar'?<><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option></>:<><option value="previsto">Previsto</option><option value="atrasado">Atrasado</option></>}</select></label>
     <label className="span-2">Descrição<input maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
     <label className="span-2">Observação<textarea maxLength={1000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><small className="field-hint">{form.notes.length}/1000</small></label>
     {formError&&<div className="form-error span-2">{formError}</div>}
     <div className="form-actions span-2"><button type="button" className="secondary-btn" disabled={saving} onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving?'Salvando...':'Salvar'}</button></div>
   </form></Modal>}

   {settlementTarget&&<Modal title={settlementTarget.kind==='pagar'?'Confirmar pagamento':'Confirmar recebimento'} onClose={()=>{if(!settling)setSettlementTarget(null)}}><div className="settlement-dialog"><div className="settlement-summary"><span>{settlementTarget.name}</span><strong>{brl(settlementTarget.amount)}</strong><small>{settlementTarget.kind==='pagar'?'Será criada uma despesa confirmada.':'Será criada uma receita confirmada.'}</small></div><label>Data da baixa<input type="date" value={settlementDate} onChange={e=>setSettlementDate(e.target.value)}/></label><p>A conta e a movimentação ficarão vinculadas para evitar lançamentos duplicados.</p><div className="form-actions"><button type="button" className="secondary-btn" disabled={settling} onClick={()=>setSettlementTarget(null)}>Cancelar</button><button type="button" className="primary-btn" disabled={settling} onClick={()=>void confirmSettlement()}>{settling?'Registrando...':'Confirmar baixa'}</button></div></div></Modal>}

   <ConfirmDialog open={Boolean(reopenTarget)} title="Reabrir conta?" message={reopenTarget?`A conta “${reopenTarget.name}” voltará a ficar em aberto e a movimentação automática vinculada será removida.`:''} confirmLabel="Reabrir" danger={false} loading={reopening} onClose={()=>setReopenTarget(null)} onConfirm={confirmReopen}/>
   <ConfirmDialog open={Boolean(deleteTarget)} title="Excluir conta?" message={deleteTarget?`A conta “${deleteTarget.name}” será removida permanentemente.`:''} confirmLabel="Excluir" loading={deleting} onClose={()=>setDeleteTarget(null)} onConfirm={confirmDelete}/>
 </div>
}
