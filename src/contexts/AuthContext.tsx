import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

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

const friendlyAuthError = (message: string) => {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (normalized.includes('user already registered')) return 'Já existe uma conta com este e-mail.'
  if (normalized.includes('password should be')) return 'A senha não atende aos requisitos mínimos.'
  if (normalized.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
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
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
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
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(friendlyAuthError(error.message))
      sessionStorage.removeItem(DEMO_KEY)
      setIsDemo(false)
    },
    signUp: async (name, email, password) => {
      if (!supabase) throw new Error('Supabase ainda não foi configurado neste ambiente.')
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) throw new Error(friendlyAuthError(error.message))
      return { needsEmailConfirmation: !data.session }
    },
    signOut: async () => {
      if (isDemo) {
        sessionStorage.removeItem(DEMO_KEY)
        setIsDemo(false)
        setUser(null)
        return
      }
      if (supabase) await supabase.auth.signOut()
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      if (error) throw new Error(friendlyAuthError(error.message))
    },
    updatePassword: async (password) => {
      if (!supabase) throw new Error('Supabase ainda não foi configurado neste ambiente.')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(friendlyAuthError(error.message))
    },
  }), [isDemo, loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
