// Minimal stubs — these components are not actively used but must exist for imports
export const ContextMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ContextMenuTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ContextMenuContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ContextMenuItem = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>
export const ContextMenuCheckboxItem = ContextMenuItem
export const ContextMenuRadioItem = ContextMenuItem
export const ContextMenuLabel = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>
export const ContextMenuSeparator = () => <hr />
export const ContextMenuShortcut = ({ children }: { children: React.ReactNode }) => <span>{children}</span>
export const ContextMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ContextMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ContextMenuSub = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ContextMenuSubContent = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ContextMenuSubTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const ContextMenuRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>
