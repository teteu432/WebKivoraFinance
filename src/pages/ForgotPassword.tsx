import { ArrowLeft, Mail } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand'
import { useAuth } from '../contexts/AuthContext'
import { isValidEmail, normalizeEmail } from '../utils/validation'

export default function ForgotPassword() {
  const { sendPasswordReset, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    const cleanEmail = normalizeEmail(email)
    if (!isValidEmail(cleanEmail)) return setError('Informe um e-mail válido.')
    if (cooldown > 0) return
    try {
      setLoading(true)
      await sendPasswordReset(cleanEmail)
      setSuccess('Se existir uma conta com esse e-mail, você receberá um link para redefinir a senha.')
      setCooldown(30)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="auth-simple-page">
    <div className="auth-simple-card">
      <Brand />
      <div><span className="eyebrow">Segurança da conta</span><h1>Recuperar senha</h1><p>Informe seu e-mail para receber o link de recuperação.</p></div>
      {!isConfigured && <div className="setup-warning">Configure o Supabase no arquivo <code>.env.local</code> para habilitar recuperação de senha.</div>}
      <form onSubmit={submit} className="auth-form" noValidate>
        <label>E-mail<div className="input-icon"><Mail size={18}/><input type="email" autoComplete="email" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" /></div></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        {success && <div className="form-success">{success}</div>}
        <button className="primary-btn" disabled={loading || !isConfigured || cooldown > 0}>{loading?'Enviando...':cooldown>0?`Aguarde ${cooldown}s`:'Enviar link de recuperação'}</button>
      </form>
      <Link className="auth-link back-link" to="/login"><ArrowLeft size={15}/> Voltar para o login</Link>
    </div>
  </div>
}
