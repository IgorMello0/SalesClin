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
  {
    title: 'Integrações',
    url: '/integrations',
    icon: 'hub',
    moduleCode: 'integrations',
    ownerOnly: true,
    skipPermission: true,
  },
];

export function AppSidebar() {
  const { professional, logout, hasModuleAccess, permissionsLoaded, switchCompany } = useAuth();
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

    // Módulos que NÃO estão no MVP (Gestão Financeira, Conversas, Análises/Relatórios)
    // Devem aparecer APENAS para a conta do desenvolvedor (admin@admin.com)
    const nonMVPModules = ['pagamentos', 'conversas', 'relatorios'];
    // Definido como false para ocultar funções antigas e simular a visão real do cliente/profissional
    const isDeveloper = false;
    
    if (nonMVPModules.includes(item.moduleCode) && !isDeveloper) {
      return false;
    }

    if (!permissionsLoaded) return false;
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
            alt="SellClin Logo"
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
        "fixed inset-y-0 left-0 z-50 bg-[#0B1525] text-white flex flex-col border-r border-white/5 transition-all duration-300 lg:sticky lg:h-screen lg:top-0 lg:translate-x-0",
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
                alt="SellClin Logo"
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
        
        {/* Clinic Switcher */}
        {professional?.companies && professional.companies.length > 0 && (
          <div className="px-4 py-1.5 mb-1.5 border-b border-white/5 relative z-50">
            {isSidebarCollapsed && !isMobileSidebarOpen ? (
              <div className="relative group/company flex justify-center">
                <button 
                  onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-all text-secondary"
                  title="Mudar de Clínica"
                >
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                </button>
                {companyMenuOpen && (
                  <div className="absolute left-13 top-0 w-60 bg-[#0B1525] rounded-xl shadow-2xl border border-white/10 py-2 text-white animate-fade-in-up z-[100]">
                    <div className="px-4 py-2 border-b border-white/5 bg-white/5">
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
                              ? "bg-white/10 text-secondary" 
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
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
                  className="w-full flex items-center justify-between bg-[#03071233] hover:bg-[#03071266] px-3 py-2 rounded-xl border-none transition-all duration-300 text-left group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">storefront</span>
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-slate-100 transition-colors truncate">
                      {professional.companies.find(c => c.id === professional.companyId)?.name || professional.companyName || 'Clínica'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-slate-500 group-hover:text-slate-300 transition-colors shrink-0 ml-1">
                    expand_more
                  </span>
                </button>
                
                {companyMenuOpen && (
                  <div className="absolute top-10 left-0 right-0 bg-[#0B1525] rounded-xl shadow-2xl border border-white/10 py-2 text-white animate-fade-in-up z-[100]">
                    <div className="px-4 py-2 border-b border-white/5 bg-white/5">
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
                              ? "bg-white/10 text-secondary" 
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
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
                  showOnlyIcons ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  isActive 
                    ? 'bg-white/10 text-secondary shadow-lg shadow-black/10 scale-[1.02]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
                title={showOnlyIcons ? item.title : undefined}
              >
                <span className={cn(
                  "material-symbols-outlined shrink-0 transition-transform duration-300",
                  showOnlyIcons ? "text-[22px]" : "text-[18px]",
                  isActive ? "text-secondary" : "group-hover/item:scale-110"
                )}>{item.icon}</span>
                {!showOnlyIcons && (
                  <span className="truncate text-xs font-semibold tracking-wide font-headline">{item.title}</span>
                )}
              </Link>
            );
          })}
        </div>
        
        {/* Profile Footer */}
        <div id="tour-settings" className={cn(
          "p-4 mt-auto shrink-0 border-t border-white/5 relative",
          isSidebarCollapsed && !isMobileSidebarOpen ? "p-2 flex justify-center" : "p-4"
        )}>
          {isSidebarCollapsed && !isMobileSidebarOpen ? (
            // Collapsed Profile (Only avatar showing, clicking opens the absolute menu)
            <div className="relative group/profile flex justify-center">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-10 h-10 rounded-full hover:ring-2 hover:ring-secondary/50 transition-all flex items-center justify-center bg-white/5 overflow-hidden border border-white/10"
              >
                {professional?.photoUrl ? (
                  <img src={getImageUrl(professional.photoUrl)} alt={professional.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-300">
                    {professional?.name ? professional.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                  </span>
                )}
              </button>
              
              {profileMenuOpen && (
                <div className="absolute left-12 bottom-0 w-48 bg-[#0B1525] rounded-xl shadow-2xl border border-white/10 py-1.5 text-white animate-fade-in-up z-[100]">
                  <div className="px-4 py-2 border-b border-white/5 bg-white/5">
                    <p className="text-xs font-bold text-slate-200 truncate">{professional?.name || 'Usuário'}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{professional?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/settings?tab=profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      Meu Perfil
                    </Link>
                    {(professional?.role === 'admin' || professional?.role === 'profissional') && (
                      <Link
                        to="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
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
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Expanded Profile Card
            <div className="relative">
              <div className="flex items-center justify-between bg-white/5 px-3 py-2.5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                    {professional?.photoUrl ? (
                      <img src={getImageUrl(professional.photoUrl)} alt={professional.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-300">
                        {professional?.name ? professional.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      {professional?.name || 'Usuário'}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {professional?.specialization || 'Profissional'}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center shrink-0 transition-colors"
                  title="Opções de Perfil"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>

              {profileMenuOpen && (
                <div className="absolute bottom-14 left-0 right-0 bg-[#0B1525] rounded-xl shadow-2xl border border-white/10 py-1.5 text-white animate-fade-in-up z-[100]">
                  <div className="py-1">
                    <Link
                      to="/settings?tab=profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                      Meu Perfil
                    </Link>
                    {(professional?.role === 'admin' || professional?.role === 'profissional') && (
                      <Link
                        to="/settings"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px] text-slate-400">settings</span>
                        Configurações
                      </Link>
                    )}
                    <div className="border-t border-white/5 my-1" />
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
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
