import * as React from "react"
import { cn } from "@/lib/utils"

const Accordion = ({ type = "single", collapsible, value: controlledValue, defaultValue, onValueChange, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { type?: "single" | "multiple"; collapsible?: boolean; value?: string; defaultValue?: string; onValueChange?: (value: string) => void }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const value = controlledValue ?? internalValue
  const setValue = onValueChange ?? setInternalValue
  return (
    <AccordionContext.Provider value={{ value, onValueChange: (v) => { if (collapsible && v === value) setValue(""); else setValue(v); } }}>
      <div className={cn(className)} {...props}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionCtx { value: string; onValueChange: (v: string) => void }
const AccordionContext = React.createContext<AccordionCtx>({ value: "", onValueChange: () => {} })

const AccordionItem = ({ className, value, children, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string; ref?: React.Ref<HTMLDivElement> }) => (
  <AccordionItemContext.Provider value={value}>
    <div ref={ref} className={cn("border-b", className)} data-state={undefined} {...props}>{children}</div>
  </AccordionItemContext.Provider>
)
AccordionItem.displayName = "AccordionItem"
const AccordionItemContext = React.createContext("")

const AccordionTrigger = ({ className, children, ref, ...props }: React.HTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> }) => {
  const ctx = React.useContext(AccordionContext)
  const itemValue = React.useContext(AccordionItemContext)
  const isOpen = ctx.value === itemValue
  return (
    <h3 className="flex">
      <button
        ref={ref}
        type="button"
        aria-expanded={isOpen}
        data-state={isOpen ? "open" : "closed"}
        onClick={() => ctx.onValueChange(itemValue)}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform duration-200"><path d="m6 9 6 6 6-6"/></svg>
      </button>
    </h3>
  )
}
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = ({ className, children, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => {
  const ctx = React.useContext(AccordionContext)
  const itemValue = React.useContext(AccordionItemContext)
  const isOpen = ctx.value === itemValue
  if (!isOpen) return null
  return (
    <div
      ref={ref}
      data-state={isOpen ? "open" : "closed"}
      className={cn("overflow-hidden text-sm transition-all", className)}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  )
}
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
