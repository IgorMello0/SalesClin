import * as React from "react"
import { cn } from "@/lib/utils"

const Collapsible = ({ open: controlledOpen, onOpenChange, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { open?: boolean; onOpenChange?: (open: boolean) => void }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div className={cn(className)} data-state={open ? "open" : "closed"} {...props}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

const CollapsibleContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} })

const CollapsibleTrigger = ({ asChild, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
  const { open, setOpen } = React.useContext(CollapsibleContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: () => setOpen(!open),
    })
  }
  return <button type="button" onClick={() => setOpen(!open)} {...props}>{children}</button>
}

const CollapsibleContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { open } = React.useContext(CollapsibleContext)
  if (!open) return null
  return <div className={cn(className)} {...props}>{children}</div>
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
