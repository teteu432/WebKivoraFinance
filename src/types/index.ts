export type TransactionType = 'receita' | 'despesa'
export type TransactionStatus = 'confirmado' | 'pendente'

export interface Transaction {
  id: string
  type: TransactionType
  description: string
  category: string
  amount: number
  date: string
  paymentMethod: string
  status: TransactionStatus
  notes?: string
}

export type AccountKind = 'pagar' | 'receber'
export type AccountStatus = 'pendente' | 'pago' | 'atrasado' | 'recebido' | 'previsto'

export interface Account {
  id: string
  kind: AccountKind
  name: string
  description: string
  category: string
  amount: number
  dueDate: string
  status: AccountStatus
  paymentMethod: string
  notes?: string
}

export interface Goal {
  id: string
  name: string
  description: string
  targetAmount: number
  savedAmount: number
  monthlyAmount: number
  targetDate: string
}

export interface UserPreferences {
  displayName: string
  mode: 'pessoal' | 'empresa'
}
