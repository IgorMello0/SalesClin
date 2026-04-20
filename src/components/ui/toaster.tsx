import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[420px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-lg border p-4 shadow-lg transition-all ${
            toast.variant === "destructive"
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border bg-background text-foreground"
          }`}
        >
          {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
          {toast.description && <p className="text-sm opacity-90 mt-1">{toast.description}</p>}
        </div>
      ))}
    </div>
  )
}
