import * as React from "react"
import { cn } from "@/lib/utils"

const Breadcrumb = ({ ref, ...props }: React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement>; separator?: React.ReactNode }) => <nav ref={ref} aria-label="breadcrumb" {...props} />
const BreadcrumbList = ({ className, ref, ...props }: React.HTMLAttributes<HTMLOListElement> & { ref?: React.Ref<HTMLOListElement> }) => (
  <ol ref={ref} className={cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5", className)} {...props} />
)
const BreadcrumbItem = ({ className, ref, ...props }: React.HTMLAttributes<HTMLLIElement> & { ref?: React.Ref<HTMLLIElement> }) => (
  <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
)
const BreadcrumbLink = ({ className, asChild, ref, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { asChild?: boolean; ref?: React.Ref<HTMLAnchorElement> }) => (
  <a ref={ref} className={cn("transition-colors hover:text-foreground", className)} {...props} />
)
const BreadcrumbPage = ({ className, ref, ...props }: React.HTMLAttributes<HTMLSpanElement> & { ref?: React.Ref<HTMLSpanElement> }) => (
  <span ref={ref} role="link" aria-disabled="true" aria-current="page" className={cn("font-normal text-foreground", className)} {...props} />
)
const BreadcrumbSeparator = ({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
  <li role="presentation" aria-hidden="true" className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)} {...props}>
    {children ?? <span>/</span>}
  </li>
)
const BreadcrumbEllipsis = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span role="presentation" aria-hidden="true" className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>…</span>
)

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis }
