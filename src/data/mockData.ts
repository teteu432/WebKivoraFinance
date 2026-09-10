import type { Account, Goal, Transaction, UserPreferences } from '../types'

const d = (offset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

export const defaultTransactions: Transaction[] = [
  { id: 't1', type: 'receita', description: 'Salário', category: 'Salário', amount: 4200, date: d(-8), paymentMethod: 'PIX', status: 'confirmado' },
  { id: 't2', type: 'receita', description: 'Projeto Web Kivora', category: 'Vendas', amount: 2300, date: d(-4), paymentMethod: 'PIX', status: 'confirmado' },
  { id: 't3', type: 'despesa', description: 'Aluguel', category: 'Moradia', amount: 1450, date: d(-7), paymentMethod: 'Boleto', status: 'confirmado' },
  { id: 't4', type: 'despesa', description: 'Combustível', category: 'Transporte', amount: 620, date: d(-5), paymentMethod: 'Cartão', status: 'confirmado' },
  { id: 't5', type: 'despesa', description: 'Mercado', category: 'Alimentação', amount: 780, date: d(-3), paymentMethod: 'Cartão', status: 'confirmado' },
  { id: 't6', type: 'despesa', description: 'Internet e celular', category: 'Serviços', amount: 220, date: d(-2), paymentMethod: 'Débito', status: 'confirmado' },
  { id: 't7', type: 'despesa', description: 'Streaming', category: 'Assinaturas', amount: 89.9, date: d(-1), paymentMethod: 'Cartão', status: 'confirmado' },
  { id: 't8', type: 'receita', description: 'Freelance', category: 'Vendas', amount: 850, date: d(-34), paymentMethod: 'PIX', status: 'confirmado' },
  { id: 't9', type: 'despesa', description: 'Curso', category: 'Educação', amount: 390, date: d(-35), paymentMethod: 'Cartão', status: 'confirmado' },
  { id: 't10', type: 'despesa', description: 'Farmácia', category: 'Saúde', amount: 160, date: d(-36), paymentMethod: 'PIX', status: 'confirmado' }
]

export const defaultAccounts: Account[] = [
  { id: 'a1', kind: 'pagar', name: 'Cartão de crédito', description: 'Fatura mensal', category: 'Outros', amount: 1280, dueDate: d(1), status: 'pendente', paymentMethod: 'Boleto' },
  { id: 'a2', kind: 'pagar', name: 'Energia', description: 'Conta de energia', category: 'Moradia', amount: 238, dueDate: d(4), status: 'pendente', paymentMethod: 'PIX' },
  { id: 'a3', kind: 'pagar', name: 'Hospedagem', description: 'Infraestrutura Web Kivora', category: 'Serviços', amount: 119, dueDate: d(12), status: 'pendente', paymentMethod: 'Cartão' },
  { id: 'a4', kind: 'pagar', name: 'Conta antiga', description: 'Exemplo de atraso', category: 'Outros', amount: 95, dueDate: d(-2), status: 'atrasado', paymentMethod: 'PIX' },
  { id: 'a5', kind: 'receber', name: 'Cliente Alpha', description: 'Landing page', category: 'Vendas', amount: 950, dueDate: d(6), status: 'previsto', paymentMethod: 'PIX' },
  { id: 'a6', kind: 'receber', name: 'Cliente Beta', description: 'Manutenção mensal', category: 'Vendas', amount: 129, dueDate: d(10), status: 'previsto', paymentMethod: 'PIX' }
]

export const defaultGoals: Goal[] = [
  { id: 'g1', name: 'Reserva de emergência', description: 'Construir 6 meses de reserva', targetAmount: 12000, savedAmount: 4200, monthlyAmount: 700, targetDate: d(360) },
  { id: 'g2', name: 'Novo equipamento', description: 'Notebook para desenvolvimento', targetAmount: 7000, savedAmount: 1750, monthlyAmount: 500, targetDate: d(300) }
]

export const defaultPreferences: UserPreferences = { displayName: 'Mateus', mode: 'pessoal' }
