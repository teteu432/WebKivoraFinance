import { KeyRound, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useFinance } from '../contexts/FinanceContext'

export default function Settings() {
  const { preferences, setPreferences, resetDemo } = useFinance()
  const { email, isDemo, isConfigured, sendPasswordReset } = useAuth()
  const [name, setName] = useState(preferences.displayName)
  const [mode, setMode] = useState(preferences.mode)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setPreferences({ displayName: name || 'Usuário', mode })
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  const resetPassword = async () => {
    if (!email || isDemo) return
    setMessage('')
    try {
      await sendPasswordReset(email)
      setMessage('Link de redefinição enviado para seu e-mail.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível enviar o link.')
    }
  }

  return <div className="page-stack">
    <div className="page-title"><div><span className="eyebrow">Conta e preferências</span><h1>Configurações</h1><p>Gerencie seu perfil e a segurança da conta.</p></div></div>
    <div className="two-columns settings-columns">
      <form className="panel form-grid" onSubmit={submit}>
        <h2 className="span-2">Perfil</h2>
        <label className="span-2">Nome de exibição<input value={name} onChange={e=>setName(e.target.value)}/></label>
        <label className="span-2">Modo<select value={mode} onChange={e=>setMode(e.target.value as 'pessoal'|'empresa')}><option value="pessoal">Pessoal</option><option value="empresa">Empresa</option></select></label>
        <div className="form-actions span-2"><span className="success-text">{saved?'Configurações salvas.':''}</span><button className="primary-btn"><Save size={17}/> Salvar</button></div>
      </form>

      <div className="panel security-panel">
        <div className="security-title"><ShieldCheck/><div><h2>Segurança da conta</h2><p>{isDemo ? 'Você está usando dados locais de demonstração.' : 'Sua sessão é gerenciada pelo Supabase Auth.'}</p></div></div>
        <div className="security-row"><span>E-mail</span><strong>{email ?? 'Não informado'}</strong></div>
        <div className="security-row"><span>Armazenamento</span><strong>{isDemo ? 'Local / demonstração' : 'PostgreSQL + RLS'}</strong></div>
        <div className="security-row"><span>Supabase</span><strong>{isConfigured ? 'Configurado' : 'Pendente'}</strong></div>
        {!isDemo && <button className="secondary-btn full" onClick={()=>void resetPassword()}><KeyRound size={17}/> Enviar redefinição de senha</button>}
        {message && <div className="form-success">{message}</div>}
      </div>
    </div>

    {isDemo && <div className="panel"><h2>Dados de demonstração</h2><p className="strategy-text">Restaure as transações, contas e metas originais da demonstração. Essa ação substitui somente os dados locais deste navegador.</p><button className="secondary-btn" onClick={()=>confirm('Restaurar os dados de demonstração?')&&resetDemo()}><RotateCcw size={17}/> Restaurar demonstração</button></div>}
  </div>
}
