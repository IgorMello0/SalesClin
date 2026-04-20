// Minimal stubs for menubar, navigation-menu, breadcrumb, pagination — not actively used
import * as React from "react"
import { cn } from "@/lib/utils"

export const Menubar = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex h-10 items-center space-x-1 rounded-md border bg-background p-1", className)} {...props}>{children}</div>
)
export const MenubarMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const MenubarTrigger = ({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={cn("flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none", className)} {...props}>{children}</button>
)
export const MenubarContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)} {...props}>{children}</div>
)
export const MenubarItem = ({ className, children, inset, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) => (
  <div className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground", inset && "pl-8", className)} {...props}>{children}</div>
)
export const MenubarSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
export const MenubarLabel = MenubarItem
export const MenubarCheckboxItem = MenubarItem
export const MenubarRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const MenubarRadioItem = MenubarItem
export const MenubarPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const MenubarSubContent = MenubarContent
export const MenubarSubTrigger = MenubarItem
export const MenubarGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const MenubarSub = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />
