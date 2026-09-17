import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  danger = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <Modal title={title} onClose={() => { if (!loading) onClose() }}>
      <div className="confirm-dialog">
        <div className={`confirm-icon ${danger ? 'danger' : 'warning'}`}>
          <AlertTriangle size={22} />
        </div>
        <p>{message}</p>
        <div className="form-actions">
          <button type="button" className="secondary-btn" disabled={loading} onClick={onClose}>
            {cancelLabel}
          </button>
          <button type="button" className={danger ? 'danger-btn' : 'primary-btn'} disabled={loading} onClick={() => void onConfirm()}>
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
