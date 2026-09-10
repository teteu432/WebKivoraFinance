import { Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { useFinance } from '../contexts/FinanceContext'
import { useToast } from '../contexts/ToastContext'
import type { Goal } from '../types'
import { brl, shortDate } from '../utils/format'
import { isValidDate, isValidMoney, normalizeText } from '../utils/validation'

const initial={name:'',description:'',targetAmount:'',savedAmount:'0',monthlyAmount:'',targetDate:new Date(Date.now()+180*86400000).toISOString().slice(0,10)}

export default function Planning(){
 const {goals,addGoal,updateGoal,removeGoal}=useFinance()
 const {showToast}=useToast()
 const [open,setOpen]=useState(false)
 const [editing,setEditing]=useState<Goal|null>(null)
 const [form,setForm]=useState(initial)
 const [formError,setFormError]=useState('')
 const [saving,setSaving]=useState(false)
 const [deleteTarget,setDeleteTarget]=useState<Goal|null>(null)
 const [deleting,setDeleting]=useState(false)

 const edit=(g:Goal)=>{setEditing(g);setForm({name:g.name,description:g.description,targetAmount:String(g.targetAmount),savedAmount:String(g.savedAmount),monthlyAmount:String(g.monthlyAmount),targetDate:g.targetDate});setFormError('');setOpen(true)}

 const submit=async(e:FormEvent)=>{
   e.preventDefault();setFormError('')
   const targetAmount=Number(form.targetAmount)
   const savedAmount=Number(form.savedAmount)
   const monthlyAmount=Number(form.monthlyAmount || 0)
   const name=normalizeText(form.name)
   const description=form.description.trim()
   if(name.length<2)return setFormError('Informe um nome com pelo menos 2 caracteres.')
   if(name.length>180)return setFormError('O nome pode ter no máximo 180 caracteres.')
   if(!isValidMoney(targetAmount))return setFormError('Informe um valor objetivo válido maior que zero.')
   if(!Number.isFinite(savedAmount)||savedAmount<0)return setFormError('O valor reservado não pode ser negativo.')
   if(!Number.isFinite(monthlyAmount)||monthlyAmount<0)return setFormError('O valor mensal não pode ser negativo.')
   if(!isValidDate(form.targetDate))return setFormError('Informe uma data objetivo válida.')
   if(description.length>500)return setFormError('A descrição pode ter no máximo 500 caracteres.')

   const payload={...form,name,description,targetAmount,savedAmount,monthlyAmount}
   try{
     setSaving(true)
     if(editing){await updateGoal({...payload,id:editing.id});showToast('Meta atualizada com sucesso.')}
     else{await addGoal(payload);showToast('Meta criada com sucesso.')}
     setOpen(false);setEditing(null);setForm(initial)
   }catch(err){setFormError(err instanceof Error?err.message:'Não foi possível salvar a meta.')}
   finally{setSaving(false)}
 }

 const confirmDelete=async()=>{
   if(!deleteTarget)return
   try{setDeleting(true);await removeGoal(deleteTarget.id);showToast('Meta excluída.');setDeleteTarget(null)}
   catch(err){showToast(err instanceof Error?err.message:'Não foi possível excluir a meta.','error')}
   finally{setDeleting(false)}
 }

 return <div className="page-stack">
   <div className="page-title"><div><span className="eyebrow">Objetivos</span><h1>Planejamento</h1><p>Transforme metas em valores e prazos claros.</p></div><button className="primary-btn" onClick={()=>{setEditing(null);setForm(initial);setFormError('');setOpen(true)}}><Plus size={17}/> Nova meta</button></div>
   <div className="goals-grid">{goals.map(g=>{const pct=Math.min(100,(g.savedAmount/g.targetAmount)*100);const remaining=Math.max(0,g.targetAmount-g.savedAmount);const months=g.monthlyAmount>0?Math.ceil(remaining/g.monthlyAmount):null;return <article className="goal-card" key={g.id}><div className="goal-icon"><Target/></div><div className="row-actions goal-actions"><button className="icon-btn" aria-label={`Editar ${g.name}`} onClick={()=>edit(g)}><Pencil size={16}/></button><button className="icon-btn danger-text" aria-label={`Excluir ${g.name}`} onClick={()=>setDeleteTarget(g)}><Trash2 size={16}/></button></div><h3>{g.name}</h3><p>{g.description}</p><div className="goal-values"><div><span>Guardado</span><strong>{brl(g.savedAmount)}</strong></div><div><span>Objetivo</span><strong>{brl(g.targetAmount)}</strong></div></div><div className="progress large"><i style={{width:`${pct}%`}}/></div><div className="goal-foot"><span>{pct.toFixed(0)}% concluído</span><span>{months?`~${months} meses restantes`:`Meta até ${shortDate(g.targetDate)}`}</span></div></article>})}</div>

   {open&&<Modal title={editing?'Editar meta':'Nova meta'} onClose={()=>{if(!saving)setOpen(false)}}><form className="form-grid" onSubmit={submit}>
     <label className="span-2">Nome<input maxLength={180} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
     <label className="span-2">Descrição<input maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
     <label>Valor objetivo<input type="number" min="0.01" max="999999999999.99" step="0.01" value={form.targetAmount} onChange={e=>setForm({...form,targetAmount:e.target.value})} required/></label>
     <label>Já reservado<input type="number" min="0" step="0.01" value={form.savedAmount} onChange={e=>setForm({...form,savedAmount:e.target.value})}/></label>
     <label>Guardar por mês<input type="number" min="0" step="0.01" value={form.monthlyAmount} onChange={e=>setForm({...form,monthlyAmount:e.target.value})}/></label>
     <label>Data objetivo<input type="date" value={form.targetDate} onChange={e=>setForm({...form,targetDate:e.target.value})} required/></label>
     {formError&&<div className="form-error span-2">{formError}</div>}
     <div className="form-actions span-2"><button type="button" className="secondary-btn" disabled={saving} onClick={()=>setOpen(false)}>Cancelar</button><button className="primary-btn" disabled={saving}>{saving?'Salvando...':'Salvar'}</button></div>
   </form></Modal>}

   <ConfirmDialog open={Boolean(deleteTarget)} title="Excluir meta?" message={deleteTarget?`A meta “${deleteTarget.name}” será removida permanentemente.`:''} confirmLabel="Excluir" loading={deleting} onClose={()=>setDeleteTarget(null)} onConfirm={confirmDelete}/>
 </div>
}
