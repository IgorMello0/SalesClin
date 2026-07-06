import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/api';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: 'grid_view', // More geometric and modern than 'dashboard'
    moduleCode: 'dashboard',
  },
  {
    title: 'Clientes',
    url: '/clients',
    icon: 'group', // Better than 'person_search' (detective)
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
    icon: 'calendar_month', // Has a grid, looks more modern than 'calendar_today'
    moduleCode: 'agendamentos',
  },
  {
    title: 'Comercial',
    url: '/sales-funnel',
    icon: 'filter_alt', // Real funnel shape instead of 3 lines ('filter_list')
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
    icon: 'account_balance_wallet', // Cleaner than 'payments'
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
    icon: 'bar_chart', // Classic and very clear
    moduleCode: 'relatorios',
  },
  {
    title: 'Metas',
    url: '/metas',
    icon: 'track_changes', // Target/bullseye is better for goals than 'trending_up'
    moduleCode: 'metas',
  },
  {
    title: 'Campanhas',
    url: '/campaigns',
    icon: 'rocket_launch', // Much cooler for marketing/campaigns than 'campaign' (megaphone)
    moduleCode: 'campanhas',
  },
  {
    title: 'Integrações',
    url: '/integrations',
    icon: 'extension', // Puzzle piece is universally understood for integrations
    moduleCode: 'integrations',
    ownerOnly: true,
    skipPermission: true,
  },
];

export function AppSidebar() {
  const { professional, logout, hasModuleAccess, hasPermission, permissionsLoaded, switchCompany } = useAuth();
  const { isMobileSidebarOpen, setMobileSidebarOpen, isSidebarCollapsed, setSidebarCollapsed } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const filteredMenuItems = menuItems.filter((item) => {
    if ((item as any).ownerOnly && !['admin', 'profissional'].includes(String(professional?.role))) {
      return false;
    }

    if ((item as any).skipPermission) {
      return true;
    }

    const nonMVPModules = ['pagamentos', 'conversas', 'relatorios'];
    const isDeveloper = false;
    
    if (nonMVPModules.includes(item.moduleCode) && !isDeveloper) {
      return false;
    }

    if (!permissionsLoaded) return false;
    
    const hasAccess = hasModuleAccess(item.moduleCode);
    if (!hasAccess) return false;

    if (item.url === '/clients' && !hasPermission('clientes', 'verClientes')) {
      return false;
    }
    if (item.url === '/leads' && !hasPermission('clientes', 'verLeads')) {
      return false;
    }

    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  return (
    <>
      <div className="lg:hidden sticky top-0 w-full z-40 bg-white border-b border-slate-100 flex items-center px-4 h-14 sm:h-16">
        <button 
          onClick={() => setMobileSidebarOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors mr-2"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <Link to="/dashboard" className="flex items-center">
          <img
            alt="SellClin Logo"
            className="h-8 w-auto object-contain"
            src="/logo-oficial-v3.png"
            style={{ filter: 'brightness(0)' }}
          />
        </Link>
      </div>

      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white text-slate-700 flex flex-col border-r border-slate-100 transition-all duration-300 lg:sticky lg:h-screen lg:top-0 lg:translate-x-0 shadow-[2px_0_10px_rgba(0,0,0,0.02)]",
        isMobileSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
        !isMobileSidebarOpen && (isSidebarCollapsed ? "lg:w-20" : "lg:w-56")
      )}>
        
        {/* Sidebar Header */}
        <div className={cn(
          "py-6 flex items-center shrink-0 transition-all duration-300 mb-2",
          isSidebarCollapsed && !isMobileSidebarOpen ? "flex-col gap-4 px-2" : "justify-between px-6"
        )}>
          {isSidebarCollapsed && !isMobileSidebarOpen ? (
             <Link to="/dashboard" className="transition-transform hover:scale-110">
               <img alt="S" className="h-8 w-8 object-contain" src="/favicon.png" style={{ filter: 'brightness(0)' }} onError={(e) => {
                 (e.target as HTMLImageElement).src = "/logo-oficial-v3.png";
                 (e.target as HTMLImageElement).className = "h-6 w-auto object-contain";
               }} />
             </Link>
          ) : (
            <Link to="/dashboard" className="flex-1">
              <img 
                alt="SellClin Logo"
                className="h-8 w-auto object-contain max-w-[140px]" 
                src="/logo-oficial-v3.png" 
                style={{ filter: 'brightness(0)' }}
              />
            </Link>
          )}

          <button 
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
            title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            <span className="material-symbols-outlined text-[22px]">
              {isSidebarCollapsed ? 'left_panel_open' : 'left_panel_close'}
            </span>
          </button>

          <button 
            className="lg:hidden text-slate-400 hover:text-slate-700 p-2"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-60 mb-2" />
        
        {/* Clinic Switcher */}
        {professional?.companies && professional.companies.length > 0 && (
          <div className="px-4 py-2 relative z-50">
            {isSidebarCollapsed && !isMobileSidebarOpen ? (
              <div className="relative group/company flex justify-center">
                <button 
                  onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  title="Mudar de Clínica"
                >
                  <span className="material-symbols-outlined text-[22px]">storefront</span>
                </button>
                {companyMenuOpen && (
                  <div className="absolute left-13 top-0 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 text-slate-700 animate-fade-in-up z-[100]">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mudar de Clínica</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {professional.companies.map((company) => (
                        <button
                          key={company.id}
                          onClick={() => {
                            setCompanyMenuOpen(false);
                            switchCompany(company.id);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold transition-colors text-left",
                            company.id === professional.companyId 
                              ? "bg-primary/5 text-primary" 
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <span className="material-symbols-outlined text-[16px] shrink-0">
                            {company.id === professional.companyId ? 'check_circle' : 'business'}
                          </span>
                          <span className="truncate">{company.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
                  className="w-full flex items-center justify-between bg-transparent hover:bg-slate-50 px-3 py-2.5 rounded-xl transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-slate-700 transition-colors">storefront</span>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                      {professional.companies.find(c => c.id === professional.companyId)?.name || professional.companyName || 'Clínica'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 ml-1">
                    expand_more
                  </span>
                </button>
                
                {companyMenuOpen && (
                  <div className="absolute top-10 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 py-2 text-slate-700 animate-fade-in-up z-[100]">
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mudar de Clínica</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {professional.companies.map((company) => (
                        <button
                          key={company.id}
                          onClick={() => {
                            setCompanyMenuOpen(false);
                            switchCompany(company.id);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors text-left",
                            company.id === professional.companyId 
                              ? "bg-primary/5 text-primary" 
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <span className="material-symbols-outlined text-[16px] shrink-0">
                            {company.id === professional.companyId ? 'check_circle' : 'business'}
                          </span>
                          <span className="truncate">{company.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {professional?.companies && professional.companies.length > 0 && (
          <div className="mx-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-60 my-1" />
        )}
        
        <div id="tour-menu" className={cn(
          "flex-1 overflow-y-auto scrollbar-hide py-2 space-y-1 transition-all",
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
                  showOnlyIcons ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-2",
                  isActive 
                    ? 'bg-slate-50 text-slate-900' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
                title={showOnlyIcons ? item.title : undefined}
              >
                <span className={cn(
                  "material-symbols-outlined shrink-0 transition-transform duration-300",
                  showOnlyIcons ? "text-[22px]" : "text-[18px]",
                  isActive ? "text-secondary" : "group-hover/item:scale-110"
                )}>{item.icon}</span>
                {!showOnlyIcons && (
                  <span className={cn(
                    "truncate text-xs font-semibold tracking-wide font-headline",
                    isActive ? "font-bold" : ""
                  )}>{item.title}</span>
                )}
              </Link>
            );
          })}
        </div>
        
        {/* Profile Footer */}
        <div id="tour-settings" className={cn(
          "p-4 mt-auto shrink-0 relative",
          isSidebarCollapsed && !isMobileSidebarOpen ? "p-2 flex justify-center" : "p-4"
        )}>
          {isSidebarCollapsed && !isMobileSidebarOpen ? (
            // Collapsed Profile (Only avatar showing, clicking opens the absolute menu)
            <div className="relative group/profile flex justify-center">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-10 h-10 rounded-full hover:ring-2 hover:ring-primary/20 transition-all flex items-center justify-center bg-slate-50 overflow-hidden border border-slate-200"
              >
                {professional?.photoUrl ? (
                  <img src={getImageUrl(professional.photoUrl)} alt={professional.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-500">
                    {professional?.name ? professional.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                  </span>
                )}
              </button>
              
              {profileMenuOpen && (
                <div className="absolute left-12 bottom-0 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-slate-700 animate-fade-in-up z-[100]">
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-800 truncate">{professional?.name || 'Usuário'}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{professional?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/settings?tab=profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      Meu Perfil
                    </Link>
                    {(professional?.role === 'admin' || professional?.role === 'profissional') && (
                      <Link
                        to="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">settings</span>
                        Configurações
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Expanded Profile Card - FLATTENED
            <div className="relative">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-full flex items-center justify-between bg-transparent hover:bg-slate-50 px-2 py-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 overflow-hidden">
                    {professional?.photoUrl ? (
                      <img src={getImageUrl(professional.photoUrl)} alt={professional.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        {professional?.name ? professional.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                      {professional?.name || 'Usuário'}
                    </span>
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-500 transition-colors truncate">
                      {professional?.specialization || 'Profissional'}
                    </span>
                  </div>
                </div>
                
                <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-slate-600 transition-colors shrink-0">
                  expand_less
                </span>
              </button>

              {profileMenuOpen && (
                <div className="absolute bottom-14 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-slate-700 animate-fade-in-up z-[100]">
                  <div className="py-1">
                    <Link
                      to="/settings?tab=profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                      Meu Perfil
                    </Link>
                    {(professional?.role === 'admin' || professional?.role === 'profissional') && (
                      <Link
                        to="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px] text-slate-400">settings</span>
                        Configurações
                      </Link>
                    )}
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-[16px] text-slate-400">logout</span>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
