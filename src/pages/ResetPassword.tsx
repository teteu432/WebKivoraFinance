import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { useAuth } from '../contexts/AuthContext'
import { isStrongPassword, passwordChecks, passwordStrengthLabel } from '../utils/validation'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const strength = useMemo(()=>passwordStrengthLabel(password),[password])
  const checks = useMemo(()=>passwordChecks(password),[password])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!isStrongPassword(password)) return setError('Use 8 caracteres ou mais, incluindo maiúscula, minúscula e número.')
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
    <div><span className="eyebrow">Segurança da conta</span><h1>Nova senha</h1><p>Defina uma senha forte para proteger sua conta.</p></div>
    <form onSubmit={submit} className="auth-form">
      <label>Nova senha<div className="input-icon"><LockKeyhole size={18}/><input type={showPassword?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /><button type="button" className="password-toggle" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
      {password && <div className="password-strength"><div className="password-strength-head"><span>Força da senha</span><strong className={`strength-${strength.score}`}>{strength.label}</strong></div><div className="strength-bars">{[1,2,3,4].map(n=><i key={n} className={strength.score>=n?'active':''}/>)}</div><div className="password-rules"><span className={checks.length?'ok':''}>8+ caracteres</span><span className={checks.upper?'ok':''}>Maiúscula</span><span className={checks.lower?'ok':''}>Minúscula</span><span className={checks.number?'ok':''}>Número</span></div></div>}
      <label>Confirmar senha<div className="input-icon"><LockKeyhole size={18}/><input type={showPassword?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></div></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-btn" disabled={loading}>{loading?'Salvando...':'Salvar nova senha'}</button>
    </form>
  </div></div>
}
