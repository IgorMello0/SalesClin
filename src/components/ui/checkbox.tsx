import * as React from "react"
import { cn } from "@/lib/utils"

const Checkbox = ({ className, checked, defaultChecked, onCheckedChange, ref, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & { checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean) => void; ref?: React.Ref<HTMLButtonElement> }) => {
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked || false)
  const isChecked = checked ?? internalChecked
  const toggle = () => {
    const next = !isChecked
    setInternalChecked(next)
    onCheckedChange?.(next)
  }

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      data-state={isChecked ? "checked" : "unchecked"}
      onClick={toggle}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isChecked && "bg-primary text-primary-foreground",
        className
      )}
      {...props}
    >
      {isChecked && (
        <span className="flex items-center justify-center text-current">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
      )}
    </button>
  )
}
Checkbox.displayName = "Checkbox"

export { Checkbox }
