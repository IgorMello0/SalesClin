import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"

// Sheet is a Dialog that slides in from a side
interface SheetContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}
const SheetContext = React.createContext<SheetContextType>({ open: false, onOpenChange: () => {} })

const Sheet = ({ open: controlledOpen, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  return <SheetContext.Provider value={{ open, onOpenChange: setOpen }}>{children}</SheetContext.Provider>
}

const SheetTrigger = ({ asChild, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { onOpenChange } = React.useContext(SheetContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => { onOpenChange(true); (children as any).props?.onClick?.(e) },
    })
  }
  return <button type="button" onClick={() => onOpenChange(true)} {...props}>{children}</button>
}

const SheetClose = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { onOpenChange } = React.useContext(SheetContext)
  return <button type="button" onClick={() => onOpenChange(false)} {...props}>{children}</button>
}

const SheetPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>

const sheetVariants = {
  top: "inset-x-0 top-0 border-b",
  bottom: "inset-x-0 bottom-0 border-t",
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
  right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
}

const SheetContent = ({ side = "right", className, children, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { side?: "top" | "bottom" | "left" | "right"; ref?: React.Ref<HTMLDivElement> }) => {
  const { open, onOpenChange } = React.useContext(SheetContext)

  React.useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false) }
    document.addEventListener("keydown", handleEsc)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleEsc)
      document.body.style.overflow = ""
    }
  }, [open, onOpenChange])

  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-[100] bg-white/10 backdrop-blur-md transition-all duration-300" onClick={() => onOpenChange(false)} />
      <div
        ref={ref}
        className={cn(
          "fixed z-[101] gap-4 bg-background p-6 shadow-2xl transition ease-in-out duration-300",
          sheetVariants[side],
          className
        )}
        {...props}
      >
        {children}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={() => onOpenChange(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>
  )
}
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = ({ className, ref, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { ref?: React.Ref<HTMLHeadingElement> }) => (
  <h2 ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
)
SheetTitle.displayName = "SheetTitle"

const SheetDescription = ({ className, ref, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { ref?: React.Ref<HTMLParagraphElement> }) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
)
SheetDescription.displayName = "SheetDescription"

export { Sheet, SheetPortal, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
