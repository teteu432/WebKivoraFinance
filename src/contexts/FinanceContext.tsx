import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultAccounts, defaultGoals, defaultPreferences, defaultTransactions } from '../data/mockData'
import { databaseService } from '../services/databaseService'
import { storageService } from '../services/storageService'
import type { Account, Goal, Transaction, UserPreferences } from '../types'
import { normalizeText } from '../utils/validation'
import { useAuth } from './AuthContext'

type FinanceContextValue = {
  transactions: Transaction[]
  accounts: Account[]
  goals: Goal[]
  preferences: UserPreferences
  loading: boolean
  error: string
  clearError: () => void
  setPreferences: (value: UserPreferences) => Promise<void>
  addTransaction: (value: Omit<Transaction, 'id'>) => Promise<void>
  updateTransaction: (value: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  addAccount: (value: Omit<Account, 'id'>) => Promise<void>
  updateAccount: (value: Account) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  addGoal: (value: Omit<Goal, 'id'>) => Promise<void>
  updateGoal: (value: Goal) => Promise<void>
  removeGoal: (id: string) => Promise<void>
  resetDemo: () => void
  refresh: () => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

const errorMessage = (error: unknown) => {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : 'Não foi possível concluir a operação.'
  const message = rawMessage || 'Não foi possível concluir a operação.'
  const normalized = message.toLowerCase()
  if (normalized.includes('failed to fetch') || normalized.includes('network')) return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'
  if (normalized.includes('jwt') || normalized.includes('session')) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (normalized.includes('row-level security') || normalized.includes('permission denied')) return 'Você não tem permissão para realizar esta operação.'
  return message
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, userId, isAuthenticated, isDemo } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [preferences, setPreferencesState] = useState<UserPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const clearError = useCallback(() => setError(''), [])

  const loadDemo = useCallback(() => {
    setTransactions(storageService.get('wk_transactions', defaultTransactions))
    setAccounts(storageService.get('wk_accounts', defaultAccounts))
    setGoals(storageService.get('wk_goals', defaultGoals))
    setPreferencesState(storageService.get('wk_preferences', defaultPreferences))
    setError('')
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !userId) return
    if (isDemo) {
      loadDemo()
      return
    }

    setLoading(true)
    setError('')
    try {
      const fallbackName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuário'
      const [tx, ac, gl, pref] = await Promise.all([
        databaseService.listTransactions(userId),
        databaseService.listAccounts(userId),
        databaseService.listGoals(userId),
        databaseService.getPreferences(userId, fallbackName),
      ])
      setTransactions(tx)
      setAccounts(ac)
      setGoals(gl)
      setPreferencesState(pref)
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, isDemo, loadDemo, user, userId])

  useEffect(() => {
    if (!isAuthenticated) {
      setTransactions([])
      setAccounts([])
      setGoals([])
      setPreferencesState(defaultPreferences)
      setError('')
      return
    }
    void refresh().catch(() => undefined)
  }, [isAuthenticated, refresh])

  const persistDemo = (key: string, value: unknown) => storageService.set(key, value)

  const run = useCallback(async (operation: () => Promise<void>) => {
    setError('')
    try {
      await operation()
    } catch (err) {
      const message = errorMessage(err)
      setError(message)
      throw new Error(message)
    }
  }, [])

  const value = useMemo<FinanceContextValue>(() => ({
    transactions,
    accounts,
    goals,
    preferences,
    loading,
    error,
    clearError,
    refresh,
    setPreferences: async (next) => {
      const clean: UserPreferences = {
        displayName: normalizeText(next.displayName) || 'Usuário',
        mode: next.mode,
      }
      if (isDemo) {
        setPreferencesState(clean)
        persistDemo('wk_preferences', clean)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        await databaseService.updatePreferences(userId, clean)
        setPreferencesState(clean)
      })
    },
    addTransaction: async (item) => {
      if (isDemo) {
        const next = [{ ...item, id: uid() }, ...transactions]
        setTransactions(next)
        persistDemo('wk_transactions', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        const created = await databaseService.createTransaction(userId, item)
        setTransactions((prev) => [created, ...prev])
      })
    },
    updateTransaction: async (item) => {
      if (isDemo) {
        const next = transactions.map((x) => x.id === item.id ? item : x)
        setTransactions(next)
        persistDemo('wk_transactions', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        const updated = await databaseService.updateTransaction(userId, item)
        setTransactions((prev) => prev.map((x) => x.id === updated.id ? updated : x))
      })
    },
    removeTransaction: async (id) => {
      if (isDemo) {
        const next = transactions.filter((x) => x.id !== id)
        setTransactions(next)
        persistDemo('wk_transactions', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        await databaseService.deleteTransaction(userId, id)
        setTransactions((prev) => prev.filter((x) => x.id !== id))
      })
    },
    addAccount: async (item) => {
      if (isDemo) {
        const next = [{ ...item, id: uid() }, ...accounts]
        setAccounts(next)
        persistDemo('wk_accounts', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        const created = await databaseService.createAccount(userId, item)
        setAccounts((prev) => [created, ...prev])
      })
    },
    updateAccount: async (item) => {
      if (isDemo) {
        const next = accounts.map((x) => x.id === item.id ? item : x)
        setAccounts(next)
        persistDemo('wk_accounts', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        const updated = await databaseService.updateAccount(userId, item)
        setAccounts((prev) => prev.map((x) => x.id === updated.id ? updated : x))
      })
    },
    removeAccount: async (id) => {
      if (isDemo) {
        const next = accounts.filter((x) => x.id !== id)
        setAccounts(next)
        persistDemo('wk_accounts', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        await databaseService.deleteAccount(userId, id)
        setAccounts((prev) => prev.filter((x) => x.id !== id))
      })
    },
    addGoal: async (item) => {
      if (isDemo) {
        const next = [{ ...item, id: uid() }, ...goals]
        setGoals(next)
        persistDemo('wk_goals', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        const created = await databaseService.createGoal(userId, item)
        setGoals((prev) => [created, ...prev])
      })
    },
    updateGoal: async (item) => {
      if (isDemo) {
        const next = goals.map((x) => x.id === item.id ? item : x)
        setGoals(next)
        persistDemo('wk_goals', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        const updated = await databaseService.updateGoal(userId, item)
        setGoals((prev) => prev.map((x) => x.id === updated.id ? updated : x))
      })
    },
    removeGoal: async (id) => {
      if (isDemo) {
        const next = goals.filter((x) => x.id !== id)
        setGoals(next)
        persistDemo('wk_goals', next)
        return
      }
      if (!userId) throw new Error('Usuário não autenticado.')
      await run(async () => {
        await databaseService.deleteGoal(userId, id)
        setGoals((prev) => prev.filter((x) => x.id !== id))
      })
    },
    resetDemo: () => {
      if (!isDemo) return
      setTransactions(defaultTransactions)
      setAccounts(defaultAccounts)
      setGoals(defaultGoals)
      setPreferencesState(defaultPreferences)
      persistDemo('wk_transactions', defaultTransactions)
      persistDemo('wk_accounts', defaultAccounts)
      persistDemo('wk_goals', defaultGoals)
      persistDemo('wk_preferences', defaultPreferences)
      setError('')
    },
  }), [accounts, clearError, error, goals, isDemo, loading, preferences, refresh, run, transactions, userId])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance deve ser usado dentro de FinanceProvider')
  return ctx
}
