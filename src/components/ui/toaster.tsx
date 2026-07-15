import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-[420px] w-full pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.variant === "destructive";
        const isSuccess = toast.variant === "success" || (toast.title && toast.title.toLowerCase().includes('sucesso'));
        
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-xl transition-all duration-300 animate-in slide-in-from-right-5 fade-in-50 bg-white group ${
              isError 
                ? "border-l-4 border-l-red-500 border-y-red-100 border-r-red-100" 
                : isSuccess
                  ? "border-l-4 border-l-emerald-500 border-y-emerald-100 border-r-emerald-100"
                  : "border-l-4 border-l-blue-500 border-y-slate-100 border-r-slate-100"
            }`}
          >
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 shrink-0">
                {isError ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Info className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 space-y-1 pr-6">
                {toast.title && (
                  <p className={`text-sm font-bold tracking-tight ${
                    isError ? "text-red-700" : isSuccess ? "text-emerald-700" : "text-slate-800"
                  }`}>
                    {toast.title}
                  </p>
                )}
                {toast.description && (
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
              
              <button 
                onClick={() => dismiss(toast.id)}
                className="absolute right-3 top-3 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
