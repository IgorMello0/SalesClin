import * as React from "react"
import { cn } from "@/lib/utils"

const Separator = ({ className, orientation = "horizontal", decorative = true, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical"; decorative?: boolean; ref?: React.Ref<HTMLDivElement> }) => (
  <div
    ref={ref}
    role={decorative ? "none" : "separator"}
    aria-orientation={!decorative ? orientation : undefined}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
)
Separator.displayName = "Separator"

export { Separator }
