import { KeyRound, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../contexts/AuthContext'
import { useFinance } from '../contexts/FinanceContext'
import { useToast } from '../contexts/ToastContext'
import { normalizeText } from '../utils/validation'

export default function Settings() {
  const { preferences, setPreferences, resetDemo } = useFinance()
  const { email, isDemo, isConfigured, sendPasswordReset } = useAuth()
  const { showToast } = useToast()
  const [name, setName] = useState(preferences.displayName)
  const [mode, setMode] = useState(preferences.mode)
  const [saving, setSaving] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setName(preferences.displayName)
    setMode(preferences.mode)
  }, [preferences])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    const cleanName = normalizeText(name)
    if (cleanName.length < 2) return setFormError('Informe um nome com pelo menos 2 caracteres.')
    if (cleanName.length > 80) return setFormError('O nome pode ter no máximo 80 caracteres.')

    try {
      setSaving(true)
      await setPreferences({ displayName: cleanName, mode })
      showToast('Configurações salvas com sucesso.')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async () => {
    if (!email || isDemo) return
    try {
      setResettingPassword(true)
      await sendPasswordReset(email)
      showToast('Link de redefinição enviado para seu e-mail.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível enviar o link.', 'error')
    } finally {
      setResettingPassword(false)
    }
  }

  const restoreDemo = () => {
    resetDemo()
    setConfirmReset(false)
    showToast('Dados da demonstração restaurados.')
  }

  return <div className="page-stack">
    <div className="page-title"><div><span className="eyebrow">Conta e preferências</span><h1>Configurações</h1><p>Gerencie seu perfil e a segurança da conta.</p></div></div>
    <div className="two-columns settings-columns">
      <form className="panel form-grid" onSubmit={submit}>
        <h2 className="span-2">Perfil</h2>
        <label className="span-2">Nome de exibição<input maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label className="span-2">Modo<select value={mode} onChange={e=>setMode(e.target.value as 'pessoal'|'empresa')}><option value="pessoal">Pessoal</option><option value="empresa">Empresa</option></select></label>
        {formError&&<div className="form-error span-2">{formError}</div>}
        <div className="form-actions span-2"><button className="primary-btn" disabled={saving}><Save size={17}/> {saving?'Salvando...':'Salvar alterações'}</button></div>
      </form>

      <div className="panel security-panel">
        <div className="security-title"><ShieldCheck/><div><h2>Segurança da conta</h2><p>{isDemo ? 'Você está usando dados locais de demonstração.' : 'Sua sessão é gerenciada pelo Supabase Auth.'}</p></div></div>
        <div className="security-row"><span>E-mail</span><strong>{email ?? 'Não informado'}</strong></div>
        <div className="security-row"><span>Armazenamento</span><strong>{isDemo ? 'Local / demonstração' : 'PostgreSQL + RLS'}</strong></div>
        <div className="security-row"><span>Separação de dados</span><strong>{isDemo ? 'Somente navegador' : 'Por usuário autenticado'}</strong></div>
        <div className="security-row"><span>Supabase</span><strong>{isConfigured ? 'Configurado' : 'Pendente'}</strong></div>
        {!isDemo && <button className="secondary-btn full" disabled={resettingPassword} onClick={()=>void resetPassword()}><KeyRound size={17}/> {resettingPassword?'Enviando...':'Enviar redefinição de senha'}</button>}
      </div>
    </div>

    {isDemo && <div className="panel"><h2>Dados de demonstração</h2><p className="strategy-text">Restaure as transações, contas e metas originais da demonstração. Essa ação substitui somente os dados locais deste navegador.</p><button className="secondary-btn" onClick={()=>setConfirmReset(true)}><RotateCcw size={17}/> Restaurar demonstração</button></div>}

    <ConfirmDialog open={confirmReset} danger={false} title="Restaurar demonstração?" message="As alterações feitas no modo demonstração serão substituídas pelos dados originais. Essa ação não afeta contas reais." confirmLabel="Restaurar" onClose={()=>setConfirmReset(false)} onConfirm={restoreDemo}/>
  </div>
}
