import { usePackageStore } from '@/store'
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export default function Toast() {
  const { toasts, removeToast } = usePackageStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slide-up min-w-[280px] ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="text-sm flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-0.5 rounded hover:bg-black/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
