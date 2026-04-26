import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: 'dashboard',
    moduleCode: 'dashboard',
  },
  {
    title: 'Leads',
    url: '/clients',
    icon: 'person_search',
    moduleCode: 'clientes',
  },
  {
    title: 'Agenda',
    url: '/appointments',
    icon: 'calendar_today',
    moduleCode: 'agendamentos',
  },
  {
    title: 'Funil de Vendas',
    url: '/sales-funnel',
    icon: 'filter_list',
    moduleCode: 'funnel',
  },
  {
    title: 'Gestão Financeira',
    url: '/payments',
    icon: 'payments',
    moduleCode: 'pagamentos',
  },
  {
    title: 'Conversas',
    url: '/conversations',
    icon: 'message',
    moduleCode: 'conversas',
  },
  {
    title: 'Análises',
    url: '/reports',
    icon: 'insights',
    moduleCode: 'relatorios',
  },
  {
    title: 'Metas',
    url: '/metas',
    icon: 'trending_up',
    moduleCode: 'metas',
  },
];

export function AppSidebar() {
  const { logout, hasModuleAccess, permissions } = useAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const isCollapsed = state === "collapsed";

  const filteredMenuItems = menuItems.filter((item) => {
    if (permissions.length === 0) return true;
    return hasModuleAccess(item.moduleCode);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-primary text-primary-foreground transition-all duration-300">
      <SidebarHeader className={cn("py-8 transition-all duration-300", isCollapsed ? "px-4" : "px-8")}>
        <div className="flex items-center justify-center w-full min-h-[40px]">
          {isCollapsed ? (
             <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center border border-sky-400/30 animate-in zoom-in duration-300 shadow-lg shadow-sky-500/10">
                <span className="material-symbols-outlined text-primary-foreground text-3xl">rocket_launch</span>
             </div>
          ) : (
            <img 
              alt="SalesClin Logo" 
              className="w-full h-auto object-contain max-w-[160px] animate-in fade-in zoom-in duration-300" 
              src="/logo-salesclin.png" 
            />
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className={cn("transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        <nav className="flex-1 space-y-2">
          {filteredMenuItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              title={isCollapsed ? item.title : ""}
              className={cn(
                "flex items-center gap-3 py-3 text-sm font-semibold tracking-wide font-headline transition-all rounded-xl overflow-hidden group/item",
                isCollapsed ? "justify-center px-0 w-14 mx-auto" : "px-4",
                location.pathname === item.url 
                  ? 'bg-white/10 text-primary-foreground shadow-lg shadow-black/10 scale-[1.02]' 
                  : 'text-primary-foreground/60 hover:bg-white/5 hover:text-primary-foreground'
              )}
            >
              <span className={cn(
                "material-symbols-outlined text-xl shrink-0 transition-transform duration-300",
                isCollapsed ? "text-2xl" : "group-hover/item:scale-110"
              )}>{item.icon}</span>
              {!isCollapsed && <span className="truncate animate-in slide-in-from-left-2 duration-300">{item.title}</span>}
            </Link>
          ))}
        </nav>
      </SidebarContent>
      
      <SidebarFooter className={cn("pb-8 mt-auto transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        <div className="space-y-2">

          
          <div className={cn("pt-3 border-t space-y-0.5 border-white/10 overflow-hidden", isCollapsed ? "flex flex-col items-center" : "")}>
            <Link 
              to="/profile"
              title={isCollapsed ? "Meu Perfil" : ""}
              className={cn(
                "flex items-center gap-3 py-1.5 text-sm font-medium transition-all rounded-xl",
                isCollapsed ? "justify-center w-14" : "px-4",
                location.pathname === '/profile' ? 'bg-white/10 text-primary-foreground' : 'text-primary-foreground/60 hover:bg-white/5 hover:text-primary-foreground'
              )}
            >
              <span className="material-symbols-outlined text-xl shrink-0">account_circle</span>
              {!isCollapsed && <span className="animate-in fade-in duration-300">Meu Perfil</span>}
            </Link>
            <Link 
              to="/settings"
              title={isCollapsed ? "Configurações" : ""}
              className={cn(
                "flex items-center gap-3 py-1.5 text-sm font-medium transition-all rounded-xl",
                isCollapsed ? "justify-center w-14" : "px-4",
                location.pathname === '/settings' ? 'bg-white/10 text-primary-foreground' : 'text-primary-foreground/60 hover:bg-white/5 hover:text-primary-foreground'
              )}
            >
              <span className="material-symbols-outlined text-xl shrink-0">settings</span>
              {!isCollapsed && <span className="animate-in fade-in duration-300">Configurações</span>}
            </Link>
            <button 
              onClick={handleLogout}
              title={isCollapsed ? "Sair" : ""}
              className={cn(
                "flex items-center gap-3 py-3 text-sm font-medium hover:text-red-400 transition-all text-primary-foreground/60 hover:bg-red-500/10 rounded-xl text-left",
                isCollapsed ? "justify-center w-14" : "px-4 w-full"
              )}
            >
              <span className="material-symbols-outlined text-xl shrink-0 font-bold">logout</span>
              {!isCollapsed && <span className="animate-in fade-in duration-300">Sair</span>}
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}