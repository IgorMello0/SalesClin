import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextType { open: boolean; setOpen: (v: boolean) => void }
const DropdownMenuContext = React.createContext<DropdownMenuContextType>({ open: false, setOpen: () => {} })

const DropdownMenu = ({ open: controlledOpen, onOpenChange, children }: { open?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  return <DropdownMenuContext.Provider value={{ open, setOpen }}>{children}</DropdownMenuContext.Provider>
}

const DropdownMenuTrigger = ({ asChild, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { open, setOpen } = React.useContext(DropdownMenuContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: () => setOpen(!open) })
  }
  return <button type="button" onClick={() => setOpen(!open)} className={className} {...props}>{children}</button>
}

const DropdownMenuContent = ({ className, children, align, sideOffset, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: string; sideOffset?: number; ref?: React.Ref<HTMLDivElement> }) => {
  const { open, setOpen } = React.useContext(DropdownMenuContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (contentRef.current && !contentRef.current.contains(e.target as Node)) setOpen(false) }
    const t = setTimeout(() => document.addEventListener("mousedown", h), 0)
    return () => { clearTimeout(t); document.removeEventListener("mousedown", h) }
  }, [open, setOpen])
  if (!open) return null
  return (
    <div ref={(n) => { (contentRef as any).current = n; if (typeof ref === "function") ref(n); else if (ref) (ref as any).current = n }}
      className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)} {...props}>
      {children}
    </div>
  )
}

const DropdownMenuItem = ({ className, inset, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; ref?: React.Ref<HTMLDivElement> }) => {
  const { setOpen } = React.useContext(DropdownMenuContext)
  return <div ref={ref} role="menuitem" onClick={() => setOpen(false)} className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className)} {...props} />
}

const DropdownMenuCheckboxItem = DropdownMenuItem
const DropdownMenuRadioItem = DropdownMenuItem
const DropdownMenuLabel = ({ className, inset, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />
)
const DropdownMenuSeparator = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
)
const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
)
const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => <div role="group">{children}</div>
const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
const DropdownMenuSub = DropdownMenu
const DropdownMenuSubContent = DropdownMenuContent
const DropdownMenuSubTrigger = DropdownMenuItem
const DropdownMenuRadioGroup = ({ children }: { children: React.ReactNode }) => <div role="radiogroup">{children}</div>
const DropdownMenuItemIndicator = () => null

export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup,
}
