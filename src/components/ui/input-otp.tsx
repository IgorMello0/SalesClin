// Input OTP - uses input-otp which is standalone
import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { cn } from "@/lib/utils"

const InputOTP = ({ className, containerClassName, ref, ...props }: React.ComponentPropsWithoutRef<typeof OTPInput> & { ref?: React.Ref<HTMLInputElement> }) => (
  <OTPInput ref={ref} containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)} className={cn("disabled:cursor-not-allowed", className)} {...props} />
)
InputOTP.displayName = "InputOTP"

const InputOTPGroup = ({ className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
)
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = ({ index, className, ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { index: number; ref?: React.Ref<HTMLDivElement> }) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const slot = inputOTPContext.slots[index]
  if (!slot) return null
  const { char, hasFakeCaret, isActive } = slot
  return (
    <div ref={ref} className={cn("relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md", isActive && "z-10 ring-2 ring-ring ring-offset-background", className)} {...props}>
      {char}
      {hasFakeCaret && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" /></div>}
    </div>
  )
}
InputOTPSlot.displayName = "InputOTPSlot"

const InputOTPSeparator = ({ ref, ...props }: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) => (
  <div ref={ref} role="separator" {...props}>-</div>
)
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
