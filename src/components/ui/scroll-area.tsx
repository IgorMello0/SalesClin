import * as React from "react"
import { cn } from "@/lib/utils"

const ScrollArea = ({ className, children, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("relative overflow-auto", className)} {...props}>
    {children}
  </div>
)
ScrollArea.displayName = "ScrollArea"

const ScrollBar = ({ orientation = "vertical", className }: { orientation?: "vertical" | "horizontal"; className?: string }) => null

export { ScrollArea, ScrollBar }
