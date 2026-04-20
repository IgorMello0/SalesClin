// Toast - using sonner directly, these are compatibility shims
import * as React from "react"
import { cn } from "@/lib/utils"
import { tv, type VariantProps } from "tailwind-variants"

const toastVariants = tv({
  base: "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
  variants: {
    variant: {
      default: "border bg-background text-foreground",
      destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

// Re-export types for backward compatibility
export type ToastProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof toastVariants>
export type ToastActionElement = React.ReactElement

const ToastProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ToastViewport = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]", className)} {...props} />
)
const Toast = ({ className, variant, ref, ...props }: ToastProps & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
)
const ToastAction = ({ className, ref, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement>; altText?: string }) => (
  <button ref={ref} className={cn("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", className)} {...props} />
)
const ToastClose = ({ className, ref, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }) => (
  <button ref={ref} className={cn("absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100", className)} {...props}>✕</button>
)
const ToastTitle = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
)
const ToastDescription = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
)

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction, type ToastProps as ToastPropsBase, toastVariants }
