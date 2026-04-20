import * as React from "react"
import { cn } from "@/lib/utils"

// Tabs implementation without Radix
interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}
const TabsContext = React.createContext<TabsContextType>({ value: "", onValueChange: () => {} })

const Tabs = ({ defaultValue, value: controlledValue, onValueChange, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (value: string) => void }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const value = controlledValue ?? internalValue
  const setValue = onValueChange ?? setInternalValue
  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue }}>
      <div className={cn(className)} {...props}>{children}</div>
    </TabsContext.Provider>
  )
}

const TabsList = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div
    ref={ref}
    role="tablist"
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
)
TabsList.displayName = "TabsList"

const TabsTrigger = ({ className, value, ref, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; ref?: React.Ref<HTMLButtonElement> }) => {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx.value === value
  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-background text-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
}
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = ({ className, value, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string; ref?: React.Ref<HTMLDivElement> }) => {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null
  return (
    <div
      ref={ref}
      role="tabpanel"
      data-state={ctx.value === value ? "active" : "inactive"}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
