import * as React from "react"
import { cn } from "@/lib/utils"

const ToggleGroup = ({ className, type, value: controlledValue, defaultValue, onValueChange, children, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { type?: "single" | "multiple"; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; ref?: React.Ref<HTMLDivElement> }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const value = controlledValue ?? internalValue
  const setValue = onValueChange ?? setInternalValue
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange: setValue }}>
      <div ref={ref} role="group" className={cn("flex items-center justify-center gap-1", className)} {...props}>
        {children}
      </div>
    </ToggleGroupContext.Provider>
  )
}

const ToggleGroupContext = React.createContext<{ value: string; onValueChange: (v: string) => void }>({ value: "", onValueChange: () => {} })

const ToggleGroupItem = ({ className, value, variant, size, ref, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; variant?: string; size?: string; ref?: React.Ref<HTMLButtonElement> }) => {
  const ctx = React.useContext(ToggleGroupContext)
  const isActive = ctx.value === value
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isActive}
      data-state={isActive ? "on" : "off"}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-3",
        isActive && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
