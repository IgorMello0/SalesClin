import * as React from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { cn } from "@/lib/utils"

const buttonVariants = tv({
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  variants: {
    variant: {
      default:       "bg-primary text-white rounded-xl hover:bg-primary/90 btn-hover",
      destructive:   "bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90",
      outline:       "border border-slate-200 bg-white text-slate-600 rounded-xl hover:bg-slate-50 btn-hover",
      secondary:     "bg-secondary text-white rounded-xl hover:bg-secondary/80",
      ghost:         "hover:bg-accent hover:text-accent-foreground rounded-xl",
      link:          "text-primary underline-offset-4 hover:underline",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm:      "h-9 px-3",
      lg:      "h-11 px-8",
      xl:      "px-4 py-2.5",
      icon:    "h-10 w-10",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = ({ className, variant, size, ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
}
Button.displayName = "Button"

export { Button, buttonVariants }
