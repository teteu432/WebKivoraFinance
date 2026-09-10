import { LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const nav = useNavigate()
  const { signIn, signUp, startDemo, isAuthenticated, isConfigured } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) nav('/dashboard', { replace: true })
  }, [isAuthenticated, nav])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.includes('@')) return setError('Informe um e-mail válido.')
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.')
    if (mode === 'signup' && name.trim().length < 2) return setError('Informe seu nome.')

    try {
      setLoading(true)
      if (mode === 'login') {
        await signIn(email, password)
        nav('/dashboard', { replace: true })
      } else {
        const result = await signUp(name.trim(), email, password)
        if (result.needsEmailConfirmation) {
          setSuccess('Conta criada. Confira seu e-mail para confirmar o cadastro antes de entrar.')
          setMode('login')
          setPassword('')
        } else {
          nav('/dashboard', { replace: true })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir o acesso.')
    } finally {
      setLoading(false)
    }
  }

  const demo = () => {
    startDemo()
    nav('/dashboard', { replace: true })
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-chart-bg" aria-hidden="true">
          <svg viewBox="0 0 900 700" preserveAspectRatio="none">
            <defs>
              <linearGradient id="loginAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3182f6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#3182f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="loginLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4aa3ff" stopOpacity="0.3" />
                <stop offset="45%" stopColor="#6ab4ff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#3182f6" stopOpacity="0.75" />
              </linearGradient>
              <filter id="loginGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g className="login-chart-grid">
              <line x1="0" y1="110" x2="900" y2="110" />
              <line x1="0" y1="220" x2="900" y2="220" />
              <line x1="0" y1="330" x2="900" y2="330" />
              <line x1="0" y1="440" x2="900" y2="440" />
              <line x1="0" y1="550" x2="900" y2="550" />
              <line x1="110" y1="0" x2="110" y2="700" />
              <line x1="240" y1="0" x2="240" y2="700" />
              <line x1="370" y1="0" x2="370" y2="700" />
              <line x1="500" y1="0" x2="500" y2="700" />
              <line x1="630" y1="0" x2="630" y2="700" />
              <line x1="760" y1="0" x2="760" y2="700" />
            </g>

            <g className="login-chart-bars">
              <rect x="95" y="385" width="46" height="120" rx="8" />
              <rect x="205" y="330" width="46" height="175" rx="8" />
              <rect x="315" y="355" width="46" height="150" rx="8" />
              <rect x="425" y="275" width="46" height="230" rx="8" />
              <rect x="535" y="310" width="46" height="195" rx="8" />
              <rect x="645" y="220" width="46" height="285" rx="8" />
              <rect x="755" y="250" width="46" height="255" rx="8" />
            </g>

            <path
              className="login-chart-area"
              d="M0 455 C80 425 125 445 190 380 C250 320 290 360 345 305 C410 240 470 300 525 255 C590 200 650 245 705 180 C755 125 820 165 900 90 L900 700 L0 700 Z"
            />
            <path
              className="login-chart-line login-chart-line-glow"
              d="M0 455 C80 425 125 445 190 380 C250 320 290 360 345 305 C410 240 470 300 525 255 C590 200 650 245 705 180 C755 125 820 165 900 90"
            />
            <path
              className="login-chart-line"
              d="M0 455 C80 425 125 445 190 380 C250 320 290 360 345 305 C410 240 470 300 525 255 C590 200 650 245 705 180 C755 125 820 165 900 90"
            />

            <g className="login-chart-points">
              <circle cx="190" cy="380" r="6" />
              <circle cx="345" cy="305" r="6" />
              <circle cx="525" cy="255" r="6" />
              <circle cx="705" cy="180" r="6" />
              <circle cx="900" cy="90" r="6" />
            </g>
          </svg>
        </div>

        <div className="login-brand-layer">
          <Brand />
        </div>

        <div className="login-copy">
          <span className="eyebrow">Gestão financeira inteligente</span>
          <h1>Controle hoje. Planeje o próximo passo.</h1>
          <p>Uma visão simples do seu dinheiro, contas, metas e decisões.</p>
        </div>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div>
          <span className="eyebrow">Acesso seguro</span>
          <h2>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
          <p>{mode === 'login' ? 'Acesse seus dados financeiros com sua conta.' : 'Crie sua conta para salvar seus dados com segurança.'}</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Acesso">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Entrar</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Criar conta</button>
        </div>

        {!isConfigured && <div className="setup-warning">O Supabase ainda não está configurado. Você pode usar o modo demonstração ou preencher o <code>.env.local</code> para ativar contas reais.</div>}

        {mode === 'signup' && <label>
          Nome
          <div className="input-icon">
            <UserRound size={18} />
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" autoComplete="name" placeholder="Seu nome" />
          </div>
        </label>}

        <label>
          E-mail
          <div className="input-icon">
            <Mail size={18} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="voce@email.com" />
          </div>
        </label>

        <label>
          Senha
          <div className="input-icon">
            <LockKeyhole size={18} />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo de 8 caracteres" />
          </div>
        </label>

        {mode === 'login' && <div className="auth-row"><Link className="auth-link" to="/recuperar-senha">Esqueci minha senha</Link></div>}
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}
        <button className="primary-btn" type="submit" disabled={loading || !isConfigured}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar no sistema' : 'Criar minha conta'}</button>
        <div className="auth-divider"><span>ou</span></div>
        <button className="secondary-btn demo-btn" type="button" onClick={demo}>Entrar no modo demonstração</button>
        <small className="muted">V2: contas reais usam Supabase Auth; o modo demo continua local e separado.</small>
      </form>
    </div>
  )
}
