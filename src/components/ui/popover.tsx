import * as React from "react"
import { cn } from "@/lib/utils"

const Popover = ({ open: controlledOpen, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  return <PopoverContext.Provider value={{ open, setOpen }}>{children}</PopoverContext.Provider>
}

const PopoverContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} })

const PopoverTrigger = ({ asChild, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { open, setOpen } = React.useContext(PopoverContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => { setOpen(!open); (children as any).props?.onClick?.(e) },
    })
  }
  return <button type="button" onClick={() => setOpen(!open)} {...props}>{children}</button>
}

const PopoverContent = ({ className, align = "center", sideOffset = 4, children, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: string; sideOffset?: number; ref?: React.Ref<HTMLDivElement> }) => {
  const { open, setOpen } = React.useContext(PopoverContext)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) setOpen(false)
    }
    const t = setTimeout(() => document.addEventListener("mousedown", handleClick), 0)
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handleClick) }
  }, [open, setOpen])

  if (!open) return null
  return (
    <div
      ref={(node) => {
        (contentRef as any).current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as any).current = node
      }}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
PopoverContent.displayName = "PopoverContent"

const PopoverAnchor = ({ children }: { children: React.ReactNode }) => <>{children}</>

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
