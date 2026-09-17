import { supabase } from '../lib/supabase'
import type { Account, Goal, GoalContribution, Transaction, UserPreferences } from '../types'

const requireClient = () => {
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

type TransactionRow = { id:string; type:Transaction['type']; description:string; category:string; amount:number|string; date:string; payment_method:string; status:Transaction['status']; notes:string|null; source_account_id:string|null }
type AccountRow = { id:string; kind:Account['kind']; name:string; description:string; category:string; amount:number|string; due_date:string; status:Account['status']; payment_method:string; notes:string|null }
type GoalRow = { id:string; name:string; description:string; target_amount:number|string; saved_amount:number|string; monthly_amount:number|string; target_date:string }
type GoalContributionRow = { id:string; goal_id:string; amount:number|string; contribution_date:string; notes:string|null }

const transactionFromRow = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  description: row.description,
  category: row.category,
  amount: Number(row.amount),
  date: row.date,
  paymentMethod: row.payment_method,
  status: row.status,
  notes: row.notes ?? undefined,
  sourceAccountId: row.source_account_id ?? undefined,
})

const accountFromRow = (row: AccountRow): Account => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  description: row.description,
  category: row.category,
  amount: Number(row.amount),
  dueDate: row.due_date,
  status: row.status,
  paymentMethod: row.payment_method,
  notes: row.notes ?? undefined,
})

const goalFromRow = (row: GoalRow): Goal => ({
  id: row.id,
  name: row.name,
  description: row.description,
  targetAmount: Number(row.target_amount),
  savedAmount: Number(row.saved_amount),
  monthlyAmount: Number(row.monthly_amount),
  targetDate: row.target_date,
})

const goalContributionFromRow = (row: GoalContributionRow): GoalContribution => ({
  id: row.id,
  goalId: row.goal_id,
  amount: Number(row.amount),
  date: row.contribution_date,
  notes: row.notes ?? undefined,
})

export const databaseService = {
  async getPreferences(userId: string, fallbackName = 'Usuário'): Promise<UserPreferences> {
    const client = requireClient()
    const { data, error } = await client
      .from('profiles')
      .select('display_name, mode')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      const { error: insertError } = await client.from('profiles').insert({
        id: userId,
        display_name: fallbackName,
        mode: 'pessoal',
      })
      if (insertError && insertError.code !== '23505') throw insertError
      return { displayName: fallbackName, mode: 'pessoal' }
    }
    return {
      displayName: data.display_name || fallbackName,
      mode: data.mode === 'empresa' ? 'empresa' : 'pessoal',
    }
  },

  async updatePreferences(userId: string, value: UserPreferences) {
    const client = requireClient()
    const { error } = await client.from('profiles').update({
      display_name: value.displayName,
      mode: value.mode,
    }).eq('id', userId)
    if (error) throw error
  },

  async listTransactions(userId: string): Promise<Transaction[]> {
    const client = requireClient()
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => transactionFromRow(row as TransactionRow))
  },

  async createTransaction(userId: string, item: Omit<Transaction, 'id'>): Promise<Transaction> {
    const client = requireClient()
    const { data, error } = await client.from('transactions').insert({
      user_id: userId,
      type: item.type,
      description: item.description,
      category: item.category,
      amount: item.amount,
      date: item.date,
      payment_method: item.paymentMethod,
      status: item.status,
      notes: item.notes || null,
      source_account_id: item.sourceAccountId || null,
    }).select().single()
    if (error) throw error
    return transactionFromRow(data as TransactionRow)
  },

  async updateTransaction(userId: string, item: Transaction): Promise<Transaction> {
    const client = requireClient()
    const { data, error } = await client.from('transactions').update({
      type: item.type,
      description: item.description,
      category: item.category,
      amount: item.amount,
      date: item.date,
      payment_method: item.paymentMethod,
      status: item.status,
      notes: item.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id).eq('user_id', userId).select().single()
    if (error) throw error
    return transactionFromRow(data as TransactionRow)
  },

  async deleteTransaction(userId: string, id: string) {
    const client = requireClient()
    const { error } = await client.from('transactions').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
  },

  async listAccounts(userId: string): Promise<Account[]> {
    const client = requireClient()
    const { data, error } = await client
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row) => accountFromRow(row as AccountRow))
  },

  async createAccount(userId: string, item: Omit<Account, 'id'>): Promise<Account> {
    const client = requireClient()
    const { data, error } = await client.from('accounts').insert({
      user_id: userId,
      kind: item.kind,
      name: item.name,
      description: item.description,
      category: item.category,
      amount: item.amount,
      due_date: item.dueDate,
      status: item.status,
      payment_method: item.paymentMethod,
      notes: item.notes || null,
    }).select().single()
    if (error) throw error
    return accountFromRow(data as AccountRow)
  },

  async updateAccount(userId: string, item: Account): Promise<Account> {
    const client = requireClient()
    const { data, error } = await client.from('accounts').update({
      kind: item.kind,
      name: item.name,
      description: item.description,
      category: item.category,
      amount: item.amount,
      due_date: item.dueDate,
      status: item.status,
      payment_method: item.paymentMethod,
      notes: item.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id).eq('user_id', userId).select().single()
    if (error) throw error
    return accountFromRow(data as AccountRow)
  },

  async deleteAccount(userId: string, id: string) {
    const client = requireClient()
    const { error } = await client.from('accounts').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
  },

  async settleAccount(userId: string, accountId: string, settlementDate: string): Promise<{ account: Account; transaction: Transaction }> {
    const client = requireClient()
    const { data, error } = await client.rpc('settle_account', {
      p_account_id: accountId,
      p_date: settlementDate,
    })
    if (error) throw error
    const payload = data as { account?: AccountRow; transaction?: TransactionRow } | null
    if (!payload?.account || !payload?.transaction) throw new Error('Não foi possível concluir a baixa da conta.')
    const account = accountFromRow(payload.account)
    const transaction = transactionFromRow(payload.transaction)
    // Defesa adicional: a função do banco já valida auth.uid(), mas mantemos o parâmetro
    // para que a assinatura do serviço continue consistente com as demais operações.
    void userId
    return { account, transaction }
  },

  async reopenAccount(userId: string, accountId: string): Promise<Account> {
    const client = requireClient()
    const { data, error } = await client.rpc('reopen_account', { p_account_id: accountId })
    if (error) throw error
    const payload = data as { account?: AccountRow } | null
    if (!payload?.account) throw new Error('Não foi possível reabrir a conta.')
    void userId
    return accountFromRow(payload.account)
  },

  async listGoals(userId: string): Promise<Goal[]> {
    const client = requireClient()
    const { data, error } = await client
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('target_date', { ascending: true })
    if (error) throw error
    return (data ?? []).map((row) => goalFromRow(row as GoalRow))
  },

  async listGoalContributions(userId: string): Promise<GoalContribution[]> {
    const client = requireClient()
    const { data, error } = await client
      .from('goal_contributions')
      .select('*')
      .eq('user_id', userId)
      .order('contribution_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((row) => goalContributionFromRow(row as GoalContributionRow))
  },

  async addGoalContribution(userId: string, goalId: string, amount: number, date: string, notes?: string): Promise<{ goal: Goal; contribution: GoalContribution }> {
    const client = requireClient()
    const { data, error } = await client.rpc('add_goal_contribution', {
      p_goal_id: goalId,
      p_amount: amount,
      p_date: date,
      p_notes: notes || null,
    })
    if (error) throw error
    const payload = data as { goal?: GoalRow; contribution?: GoalContributionRow } | null
    if (!payload?.goal || !payload?.contribution) throw new Error('Não foi possível registrar o aporte.')
    void userId
    return {
      goal: goalFromRow(payload.goal),
      contribution: goalContributionFromRow(payload.contribution),
    }
  },

  async removeGoalContribution(userId: string, contributionId: string): Promise<Goal> {
    const client = requireClient()
    const { data, error } = await client.rpc('remove_goal_contribution', { p_contribution_id: contributionId })
    if (error) throw error
    const payload = data as { goal?: GoalRow } | null
    if (!payload?.goal) throw new Error('Não foi possível remover o aporte.')
    void userId
    return goalFromRow(payload.goal)
  },

  async createGoal(userId: string, item: Omit<Goal, 'id'>): Promise<Goal> {
    const client = requireClient()
    const { data, error } = await client.from('goals').insert({
      user_id: userId,
      name: item.name,
      description: item.description,
      target_amount: item.targetAmount,
      saved_amount: item.savedAmount,
      monthly_amount: item.monthlyAmount,
      target_date: item.targetDate,
    }).select().single()
    if (error) throw error
    return goalFromRow(data as GoalRow)
  },

  async updateGoal(userId: string, item: Goal): Promise<Goal> {
    const client = requireClient()
    const { data, error } = await client.from('goals').update({
      name: item.name,
      description: item.description,
      target_amount: item.targetAmount,
      saved_amount: item.savedAmount,
      monthly_amount: item.monthlyAmount,
      target_date: item.targetDate,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id).eq('user_id', userId).select().single()
    if (error) throw error
    return goalFromRow(data as GoalRow)
  },

  async deleteGoal(userId: string, id: string) {
    const client = requireClient()
    const { error } = await client.from('goals').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
  },
}
