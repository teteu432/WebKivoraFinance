import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { useAuth } from '../contexts/AuthContext'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('A nova senha deve ter pelo menos 8 caracteres.')
    if (password !== confirmPassword) return setError('As senhas não coincidem.')
    try {
      setLoading(true)
      await updatePassword(password)
      nav('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="auth-simple-page"><div className="auth-simple-card">
    <Brand />
    <div><span className="eyebrow">Segurança da conta</span><h1>Nova senha</h1><p>Defina uma nova senha para sua conta.</p></div>
    <form onSubmit={submit} className="auth-form">
      <label>Nova senha<div className="input-icon"><LockKeyhole size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div></label>
      <label>Confirmar senha<div className="input-icon"><LockKeyhole size={18}/><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></div></label>
      {error && <div className="form-error">{error}</div>}
      <button className="primary-btn" disabled={loading}>{loading?'Salvando...':'Salvar nova senha'}</button>
    </form>
  </div></div>
}
