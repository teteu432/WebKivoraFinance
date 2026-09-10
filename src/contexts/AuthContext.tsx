import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { normalizeEmail } from '../utils/validation'

type AuthContextValue = {
  user: User | null
  userId: string | null
  email: string | null
  isAuthenticated: boolean
  isDemo: boolean
  isConfigured: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  startDemo: () => void
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const DEMO_KEY = 'wk_demo_session'

type SupabaseAuthErrorLike = {
  message?: string
  code?: string
  status?: number
}

const friendlyAuthError = (error: SupabaseAuthErrorLike | string) => {
  const message = typeof error === 'string' ? error : error.message ?? 'Não foi possível concluir a autenticação.'
  const code = typeof error === 'string' ? '' : error.code ?? ''
  const status = typeof error === 'string' ? undefined : error.status
  const normalized = message.toLowerCase()

  if (code === 'over_email_send_rate_limit') {
    return 'O limite temporário de e-mails do Supabase foi atingido. Aguarde o limite liberar ou configure um SMTP próprio para cadastros em produção.'
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'O Supabase bloqueou temporariamente novas solicitações por excesso de requisições. Aguarde alguns minutos e tente novamente.'
  }
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (normalized.includes('user already registered')) return 'Já existe uma conta com este e-mail.'
  if (normalized.includes('password should be')) return 'A senha não atende aos requisitos mínimos.'
  if (normalized.includes('rate limit') || normalized.includes('too many')) return 'O Supabase aplicou um limite temporário de autenticação. Aguarde alguns minutos e tente novamente.'
  if (normalized.includes('failed to fetch') || normalized.includes('network')) return 'Não foi possível conectar ao servidor. Verifique sua internet.'
  if (normalized.includes('session') && normalized.includes('missing')) return 'O link de recuperação expirou ou não é mais válido.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isDemo, setIsDemo] = useState(() => sessionStorage.getItem(DEMO_KEY) === '1')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }

    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) console.error('Falha ao restaurar sessão:', error)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [isDemo])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    userId: isDemo ? 'demo-user' : user?.id ?? null,
    email: isDemo ? 'demo@webkivora.com' : user?.email ?? null,
    isAuthenticated: isDemo || Boolean(user),
    isDemo,
    isConfigured: isSupabaseConfigured,
    loading,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase ainda não foi configurado neste ambiente.')
      const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password })
      if (error) throw new Error(friendlyAuthError(error))
      sessionStorage.removeItem(DEMO_KEY)
      setIsDemo(false)
    },
    signUp: async (name, email, password) => {
      if (!supabase) throw new Error('Supabase ainda não foi configurado neste ambiente.')
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) throw new Error(friendlyAuthError(error))
      return { needsEmailConfirmation: !data.session }
    },
    signOut: async () => {
      if (isDemo) {
        sessionStorage.removeItem(DEMO_KEY)
        setIsDemo(false)
        setUser(null)
        return
      }
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw new Error(friendlyAuthError(error))
      }
      setUser(null)
    },
    startDemo: () => {
      if (supabase) void supabase.auth.signOut({ scope: 'local' })
      sessionStorage.setItem(DEMO_KEY, '1')
      setUser(null)
      setIsDemo(true)
      setLoading(false)
    },
    sendPasswordReset: async (email) => {
      if (!supabase) throw new Error('Supabase ainda não foi configurado neste ambiente.')
      const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      if (error) throw new Error(friendlyAuthError(error))
    },
    updatePassword: async (password) => {
      if (!supabase) throw new Error('Supabase ainda não foi configurado neste ambiente.')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(friendlyAuthError(error))
    },
  }), [isDemo, loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
