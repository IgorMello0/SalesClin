import * as React from "react"
import { cn } from "@/lib/utils"

const HoverCard = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  return <HoverCardContext.Provider value={{ open, setOpen }}>{children}</HoverCardContext.Provider>
}
const HoverCardContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} })

const HoverCardTrigger = ({ asChild, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) => {
  const { setOpen } = React.useContext(HoverCardContext)
  return <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} {...props}>{children}</div>
}

const HoverCardContent = ({ className, align, sideOffset, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: string; sideOffset?: number; ref?: React.Ref<HTMLDivElement> }) => {
  const { open } = React.useContext(HoverCardContext)
  if (!open) return null
  return <div ref={ref} className={cn("z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md", className)} {...props} />
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
