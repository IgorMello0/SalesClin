// Sidebar component - DEPRECATED, replaced by AppTopNavbar
// Keeping minimal exports to prevent import errors from residual references
import * as React from "react"

const SidebarContext = React.createContext<any>({})
const SidebarProvider = ({ children, ...props }: { children: React.ReactNode; defaultOpen?: boolean }) => (
  <SidebarContext.Provider value={{ state: "collapsed", open: false, setOpen: () => {}, toggleSidebar: () => {} }}>
    {children}
  </SidebarContext.Provider>
)
const Sidebar = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { collapsible?: string }) => null
const SidebarContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
const SidebarHeader = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>
const SidebarFooter = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>
const SidebarInset = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>
const SidebarTrigger = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => null
const useSidebar = () => React.useContext(SidebarContext)

export { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarProvider, SidebarInset, SidebarTrigger, useSidebar }
