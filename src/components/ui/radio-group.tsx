import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroup = ({ className, value: controlledValue, defaultValue, onValueChange, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { value?: string; defaultValue?: string; onValueChange?: (value: string) => void; ref?: React.Ref<HTMLDivElement> }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const value = controlledValue ?? internalValue
  const setValue = onValueChange ?? setInternalValue
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange: setValue }}>
      <div ref={ref} role="radiogroup" className={cn("grid gap-2", className)} {...props} />
    </RadioGroupContext.Provider>
  )
}
RadioGroup.displayName = "RadioGroup"

const RadioGroupContext = React.createContext<{ value: string; onValueChange: (v: string) => void }>({ value: "", onValueChange: () => {} })

const RadioGroupItem = ({ className, value, ref, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> & { value: string; ref?: React.Ref<HTMLButtonElement> }) => {
  const ctx = React.useContext(RadioGroupContext)
  const isChecked = ctx.value === value
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isChecked}
      data-state={isChecked ? "checked" : "unchecked"}
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {isChecked && (
        <span className="flex items-center justify-center">
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        </span>
      )}
    </button>
  )
}
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
