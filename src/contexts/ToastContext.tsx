import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  kind: ToastKind
}

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = makeId()
    setToasts((current) => [...current.slice(-3), { id, message, kind }])
    window.setTimeout(() => removeToast(id), 4200)
  }, [removeToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info
          return (
            <div className={`toast ${toast.kind}`} key={toast.id} role="status">
              <Icon size={18} />
              <span>{toast.message}</span>
              <button type="button" className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Fechar notificação">
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return context
}
