import * as React from "react"
import { cn } from "@/lib/utils"

const Pagination = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />
)
const PaginationContent = ({ className, ref, ...props }: React.HTMLAttributes<HTMLUListElement> & { ref?: React.Ref<HTMLUListElement> }) => (
  <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
)
const PaginationItem = ({ className, ref, ...props }: React.HTMLAttributes<HTMLLIElement> & { ref?: React.Ref<HTMLLIElement> }) => (
  <li ref={ref} className={cn("", className)} {...props} />
)
const PaginationLink = ({ className, isActive, size = "icon", ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { isActive?: boolean; size?: string }) => (
  <a aria-current={isActive ? "page" : undefined} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium h-10 w-10", isActive && "border bg-background", className)} {...props} />
)
const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" className={cn("gap-1 pl-2.5", className)} {...props}>← Previous</PaginationLink>
)
const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" className={cn("gap-1 pr-2.5", className)} {...props}>Next →</PaginationLink>
)
const PaginationEllipsis = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>…</span>
)

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious }
