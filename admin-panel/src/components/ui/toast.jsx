import * as React from "react"
import { X } from "lucide-react"
import { ToastContext } from "./toastContext"

// Utility function to merge classNames
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const toast = React.useCallback(({ title, description, variant = "default" }) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, title, description, variant }])
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ title, description, variant, onClose }) {
  const variantStyles = {
    default: "bg-white border-gray-200",
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
  }

  const iconColors = {
    default: "text-gray-600",
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-yellow-600",
  }

  return (
    <div
      className={cn(
        "pointer-events-auto w-full rounded-lg border p-4 shadow-lg transition-all animate-in slide-in-from-right",
        variantStyles[variant]
      )}
    >
      <div className="flex gap-3">
        <div className="flex-1">
          {title && (
            <div className={cn("font-semibold text-sm", iconColors[variant])}>
              {title}
            </div>
          )}
          {description && (
            <div className="text-sm text-gray-600 mt-1">{description}</div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export { ToastProvider }
