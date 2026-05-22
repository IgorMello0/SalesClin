import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: 'dashboard',
    moduleCode: 'dashboard',
  },
  {
    title: 'Clientes',
    url: '/clients',
    icon: 'person_search',
    moduleCode: 'clientes',
  },
  {
    title: 'Leads',
    url: '/leads',
    icon: 'person_add',
    moduleCode: 'clientes',
  },
  {
    title: 'Agenda',
    url: '/appointments',
    icon: 'calendar_today',
    moduleCode: 'agendamentos',
  },
  {
    title: 'Comercial',
    url: '/sales-funnel',
    icon: 'filter_list',
    moduleCode: 'funnel',
  },
  {
    title: 'Tarefas',
    url: '/tasks',
    icon: 'task_alt',
    moduleCode: 'tarefas',
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
  {
    title: 'Campanhas',
    url: '/campaigns',
    icon: 'campaign',
    moduleCode: 'campanhas',
  },
];

export function AppSidebar() {
  const { logout, hasModuleAccess, permissions } = useAuth();
  const { isMobileSidebarOpen, setMobileSidebarOpen, isSidebarCollapsed, setSidebarCollapsed } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredMenuItems = menuItems.filter((item) => {
    if (permissions.length === 0) return true;
    return hasModuleAccess(item.moduleCode);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Prevent scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileSidebarOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  return (
    <>
      {/* Mobile Hamburger Header (Visible only on lg:hidden when layout is 'side') */}
      <div className="lg:hidden sticky top-0 w-full z-40 bg-[#0B1525] border-b border-white/5 flex items-center px-4 h-14 sm:h-16">
        <button 
          onClick={() => setMobileSidebarOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors mr-2"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <Link to="/dashboard" className="flex items-center">
          <img
            alt="SalesClin Logo"
            className="h-8 w-auto object-contain"
            src="/logo-oficial-v3.png"
          />
        </Link>
      </div>

      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[#0B1525] text-white flex flex-col border-r border-white/5 transition-all duration-300 lg:relative lg:translate-x-0",
        isMobileSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
        !isMobileSidebarOpen && (isSidebarCollapsed ? "lg:w-20" : "lg:w-64")
      )}>
        
        {/* Sidebar Header */}
        <div className={cn(
          "py-6 px-4 flex items-center shrink-0 transition-all duration-300 border-b border-white/5 mb-2",
          isSidebarCollapsed && !isMobileSidebarOpen ? "flex-col gap-4 px-2" : "justify-between px-6"
        )}>
          {isSidebarCollapsed && !isMobileSidebarOpen ? (
             <Link to="/dashboard" className="transition-transform hover:scale-110">
               <img alt="S" className="h-8 w-8 object-contain" src="/favicon.png" onError={(e) => {
                 (e.target as HTMLImageElement).src = "/logo-oficial-v3.png";
                 (e.target as HTMLImageElement).className = "h-6 w-auto object-contain";
               }} />
             </Link>
          ) : (
            <Link to="/dashboard" className="flex-1">
              <img 
                alt="SalesClin Logo" 
                className="h-8 w-auto object-contain max-w-[140px]" 
                src="/logo-oficial-v3.png" 
              />
            </Link>
          )}

          {/* New Toggle Button inside header (Desktop only) */}
          <button 
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <span className="material-symbols-outlined text-2xl">
              {isSidebarCollapsed ? 'menu_open' : 'menu'}
            </span>
          </button>

          {/* Close button for mobile */}
          <button 
            className="lg:hidden text-slate-400 hover:text-white p-2"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div id="tour-menu" className={cn(
          "flex-1 overflow-y-auto scrollbar-hide py-2 space-y-1.5 transition-all",
          isSidebarCollapsed && !isMobileSidebarOpen ? "px-2" : "px-4"
        )}>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.url || (item.url !== '/dashboard' && location.pathname.startsWith(item.url));
            const showOnlyIcons = isSidebarCollapsed && !isMobileSidebarOpen;

            return (
              <Link
                key={item.title}
                to={item.url}
                className={cn(
                  "flex items-center transition-all rounded-xl overflow-hidden group/item",
                  showOnlyIcons ? "justify-center p-3" : "gap-3 px-4 py-3",
                  isActive 
                    ? 'bg-white/10 text-secondary shadow-lg shadow-black/10 scale-[1.02]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
                title={showOnlyIcons ? item.title : undefined}
              >
                <span className={cn(
                  "material-symbols-outlined shrink-0 transition-transform duration-300",
                  showOnlyIcons ? "text-2xl" : "text-xl",
                  isActive ? "text-secondary" : "group-hover/item:scale-110"
                )}>{item.icon}</span>
                {!showOnlyIcons && (
                  <span className="truncate text-sm font-semibold tracking-wide font-headline">{item.title}</span>
                )}
              </Link>
            );
          })}
        </div>
        
        <div id="tour-settings" className={cn(
          "p-4 mt-auto shrink-0 border-t border-white/5 transition-all",
          isSidebarCollapsed && !isMobileSidebarOpen ? "p-2" : "p-4"
        )}>
          <div className="space-y-0.5">
            <Link 
              to="/profile"
              className={cn(
                "flex items-center transition-all rounded-xl",
                isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center p-3" : "gap-3 px-4 py-2",
                location.pathname === '/profile' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
              title={isSidebarCollapsed && !isMobileSidebarOpen ? "Meu Perfil" : undefined}
            >
              <span className="material-symbols-outlined text-xl shrink-0">account_circle</span>
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="text-sm font-medium">Meu Perfil</span>}
            </Link>
            <Link 
              to="/settings"
              className={cn(
                "flex items-center transition-all rounded-xl",
                isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center p-3" : "gap-3 px-4 py-2",
                location.pathname === '/settings' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              )}
              title={isSidebarCollapsed && !isMobileSidebarOpen ? "Configurações" : undefined}
            >
              <span className="material-symbols-outlined text-xl shrink-0">settings</span>
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="text-sm font-medium">Configurações</span>}
            </Link>
            <button 
              onClick={handleLogout}
              className={cn(
                "flex items-center w-full transition-all text-slate-400 hover:bg-red-500/10 rounded-xl text-left hover:text-red-400",
                isSidebarCollapsed && !isMobileSidebarOpen ? "justify-center p-3" : "gap-3 px-4 py-2"
              )}
              title={isSidebarCollapsed && !isMobileSidebarOpen ? "Sair" : undefined}
            >
              <span className="material-symbols-outlined text-xl shrink-0">logout</span>
              {(!isSidebarCollapsed || isMobileSidebarOpen) && <span className="text-sm font-medium">Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}