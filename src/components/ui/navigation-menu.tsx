import * as React from "react"
import { cn } from "@/lib/utils"

export const NavigationMenu = ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <nav className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)} {...props}>{children}</nav>
)
export const NavigationMenuList = ({ className, children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
  <ul className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)} {...props}>{children}</ul>
)
export const NavigationMenuItem = ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => <li {...props}>{children}</li>
export const NavigationMenuTrigger = ({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={cn("group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground", className)} {...props}>{children}</button>
)
export const NavigationMenuContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("left-0 top-0 w-full", className)} {...props}>{children}</div>
)
export const NavigationMenuLink = ({ className, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a className={cn("block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground", className)} {...props}>{children}</a>
)
export const NavigationMenuViewport = () => null
export const NavigationMenuIndicator = () => null
export const navigationMenuTriggerStyle = () => "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
