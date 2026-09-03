import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

let toastSeq = 0

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const TONES = {
  success: 'border-emerald-200 bg-white text-emerald-900',
  error: 'border-rose-200 bg-white text-rose-800',
  info: 'border-brand/20 bg-white text-brand-dark',
}

const ICON_TONES = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  info: 'text-brand',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'success') => {
      if (!message) return
      const id = ++toastSeq
      setToasts((prev) => [...prev.slice(-3), { id, message, type }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[7000] flex w-[min(calc(100%-2rem),24rem)] flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info
          return (
            <div
              key={toast.id}
              role="status"
              className={`toast-enter pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[var(--shadow-card)] ${
                TONES[toast.type] || TONES.info
              }`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_TONES[toast.type] || ICON_TONES.info}`} />
              <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-full p-0.5 text-muted hover:bg-surface hover:text-ink"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
