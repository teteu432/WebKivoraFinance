export const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ')

export const normalizeEmail = (value: string) => value.trim().toLowerCase()

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value))

export const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

const MAX_MONEY = 999_999_999_999.99
export const isValidMoney = (value: number) => Number.isFinite(value) && value > 0 && value <= MAX_MONEY
export const isValidNonNegativeMoney = (value: number) => Number.isFinite(value) && value >= 0 && value <= MAX_MONEY

export const passwordChecks = (password: string) => ({
  length: password.length >= 8,
  upper: /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(password),
  lower: /[a-záàâãéêíóôõúç]/.test(password),
  number: /\d/.test(password),
})

export const isStrongPassword = (password: string) => {
  const checks = passwordChecks(password)
  return checks.length && checks.upper && checks.lower && checks.number
}

export const passwordStrengthLabel = (password: string) => {
  const checks = passwordChecks(password)
  const score = Object.values(checks).filter(Boolean).length
  if (!password) return { score: 0, label: '' }
  if (score <= 1) return { score: 1, label: 'Fraca' }
  if (score === 2) return { score: 2, label: 'Regular' }
  if (score === 3) return { score: 3, label: 'Boa' }
  return { score: 4, label: 'Forte' }
}
