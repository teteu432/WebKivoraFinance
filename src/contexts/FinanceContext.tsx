import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultAccounts, defaultGoals, defaultPreferences, defaultTransactions } from '../data/mockData'
import { databaseService } from '../services/databaseService'
import { storageService } from '../services/storageService'
import type { Account, Goal, Transaction, UserPreferences } from '../types'
import { useAuth } from './AuthContext'

type FinanceContextValue = {
  transactions: Transaction[]
  accounts: Account[]
  goals: Goal[]
  preferences: UserPreferences
  loading: boolean
  error: string
  setPreferences: (value: UserPreferences) => void
  addTransaction: (value: Omit<Transaction, 'id'>) => void
  updateTransaction: (value: Transaction) => void
  removeTransaction: (id: string) => void
  addAccount: (value: Omit<Account, 'id'>) => void
  updateAccount: (value: Account) => void
  removeAccount: (id: string) => void
  addGoal: (value: Omit<Goal, 'id'>) => void
  updateGoal: (value: Goal) => void
  removeGoal: (id: string) => void
  resetDemo: () => void
  refresh: () => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.'

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, userId, isAuthenticated, isDemo } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [preferences, setPreferencesState] = useState<UserPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      setError(errorMessage(err))
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
    void refresh()
  }, [isAuthenticated, refresh])

  const persistDemo = (key: string, value: unknown) => storageService.set(key, value)

  const value = useMemo<FinanceContextValue>(() => ({
    transactions,
    accounts,
    goals,
    preferences,
    loading,
    error,
    refresh,
    setPreferences: (next) => {
      setPreferencesState(next)
      if (isDemo) {
        persistDemo('wk_preferences', next)
        return
      }
      if (!userId) return
      void databaseService.updatePreferences(userId, next).catch((err) => setError(errorMessage(err)))
    },
    addTransaction: (item) => {
      if (isDemo) {
        const next = [{ ...item, id: uid() }, ...transactions]
        setTransactions(next)
        persistDemo('wk_transactions', next)
        return
      }
      if (!userId) return
      void databaseService.createTransaction(userId, item)
        .then((created) => setTransactions((prev) => [created, ...prev]))
        .catch((err) => setError(errorMessage(err)))
    },
    updateTransaction: (item) => {
      if (isDemo) {
        const next = transactions.map((x) => x.id === item.id ? item : x)
        setTransactions(next)
        persistDemo('wk_transactions', next)
        return
      }
      if (!userId) return
      void databaseService.updateTransaction(userId, item)
        .then((updated) => setTransactions((prev) => prev.map((x) => x.id === updated.id ? updated : x)))
        .catch((err) => setError(errorMessage(err)))
    },
    removeTransaction: (id) => {
      if (isDemo) {
        const next = transactions.filter((x) => x.id !== id)
        setTransactions(next)
        persistDemo('wk_transactions', next)
        return
      }
      if (!userId) return
      void databaseService.deleteTransaction(userId, id)
        .then(() => setTransactions((prev) => prev.filter((x) => x.id !== id)))
        .catch((err) => setError(errorMessage(err)))
    },
    addAccount: (item) => {
      if (isDemo) {
        const next = [{ ...item, id: uid() }, ...accounts]
        setAccounts(next)
        persistDemo('wk_accounts', next)
        return
      }
      if (!userId) return
      void databaseService.createAccount(userId, item)
        .then((created) => setAccounts((prev) => [created, ...prev]))
        .catch((err) => setError(errorMessage(err)))
    },
    updateAccount: (item) => {
      if (isDemo) {
        const next = accounts.map((x) => x.id === item.id ? item : x)
        setAccounts(next)
        persistDemo('wk_accounts', next)
        return
      }
      if (!userId) return
      void databaseService.updateAccount(userId, item)
        .then((updated) => setAccounts((prev) => prev.map((x) => x.id === updated.id ? updated : x)))
        .catch((err) => setError(errorMessage(err)))
    },
    removeAccount: (id) => {
      if (isDemo) {
        const next = accounts.filter((x) => x.id !== id)
        setAccounts(next)
        persistDemo('wk_accounts', next)
        return
      }
      if (!userId) return
      void databaseService.deleteAccount(userId, id)
        .then(() => setAccounts((prev) => prev.filter((x) => x.id !== id)))
        .catch((err) => setError(errorMessage(err)))
    },
    addGoal: (item) => {
      if (isDemo) {
        const next = [{ ...item, id: uid() }, ...goals]
        setGoals(next)
        persistDemo('wk_goals', next)
        return
      }
      if (!userId) return
      void databaseService.createGoal(userId, item)
        .then((created) => setGoals((prev) => [created, ...prev]))
        .catch((err) => setError(errorMessage(err)))
    },
    updateGoal: (item) => {
      if (isDemo) {
        const next = goals.map((x) => x.id === item.id ? item : x)
        setGoals(next)
        persistDemo('wk_goals', next)
        return
      }
      if (!userId) return
      void databaseService.updateGoal(userId, item)
        .then((updated) => setGoals((prev) => prev.map((x) => x.id === updated.id ? updated : x)))
        .catch((err) => setError(errorMessage(err)))
    },
    removeGoal: (id) => {
      if (isDemo) {
        const next = goals.filter((x) => x.id !== id)
        setGoals(next)
        persistDemo('wk_goals', next)
        return
      }
      if (!userId) return
      void databaseService.deleteGoal(userId, id)
        .then(() => setGoals((prev) => prev.filter((x) => x.id !== id)))
        .catch((err) => setError(errorMessage(err)))
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
    },
  }), [accounts, error, goals, isDemo, loading, preferences, refresh, transactions, userId])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance deve ser usado dentro de FinanceProvider')
  return ctx
}
