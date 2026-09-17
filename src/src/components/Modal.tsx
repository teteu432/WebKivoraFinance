import { X } from 'lucide-react'
import { useEffect, type MouseEvent, type ReactNode } from 'react'

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button === 0 && event.target === event.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="wk-modal-title">
        <div className="modal-head">
          <h3 id="wk-modal-title">{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
