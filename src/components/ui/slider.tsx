import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = ({ className, min = 0, max = 100, step = 1, value: controlledValue, defaultValue, onValueChange, ref, ...props }: Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> & { min?: number; max?: number; step?: number; value?: number[]; defaultValue?: number[]; onValueChange?: (value: number[]) => void; ref?: React.Ref<HTMLDivElement> }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || [0])
  const value = controlledValue ?? internalValue
  const percentage = ((value[0] - min) / (max - min)) * 100

  return (
    <div ref={ref} className={cn("relative flex w-full touch-none select-none items-center", className)} {...props}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => {
          const v = [Number(e.target.value)]
          setInternalValue(v)
          onValueChange?.(v)
        }}
        className="w-full h-2 bg-secondary/20 rounded-full appearance-none cursor-pointer accent-primary"
      />
    </div>
  )
}
Slider.displayName = "Slider"

export { Slider }
