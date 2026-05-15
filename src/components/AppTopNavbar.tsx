import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: 'grid_view',
    moduleCode: 'dashboard',
  },
  {
    title: 'Clientes',
    url: '/clients',
    icon: 'group',
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
    icon: 'filter_alt',
    moduleCode: 'funnel',
  },
  {
    title: 'Financeiro',
    url: '/payments',
    icon: 'account_balance_wallet',
    moduleCode: 'pagamentos',
  },
  {
    title: 'Conversas',
    url: '/conversations',
    icon: 'message',
    moduleCode: 'conversas',
  },
  {
    title: 'Catálogos',
    url: '/catalogs',
    icon: 'inventory_2',
    moduleCode: 'catalogos',
  },
  {
    title: 'Contratos',
    url: '/contracts',
    icon: 'description',
    moduleCode: 'contratos',
  },
  {
    title: 'Metas',
    url: '/metas',
    icon: 'trending_up',
    moduleCode: 'metas',
  },
];

export function AppTopNavbar() {
  const { logout, hasModuleAccess, permissions, professional } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredMenuItems = menuItems.filter((item) => {
    // Restringir módulos não liberados na v1 apenas para admin
    const restrictedModules = ['Financeiro', 'Conversas', 'Catálogos', 'Contratos'];
    if (restrictedModules.includes(item.title) && professional?.role !== 'admin') {
      return false;
    }

    if (permissions.length === 0) return true;
    return hasModuleAccess(item.moduleCode);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // User initials
  const initials = professional?.name
    ? professional.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const roleName = professional?.role === 'admin' ? 'ADMIN' : (professional?.role === 'profissional' ? 'PROFISSIONAL' : (professional?.role?.toUpperCase() || 'COLABORADOR'));
  const isProfileActive = location.pathname === '/profile' || location.pathname === '/settings';

  return (
    <>
      <header className="sticky top-0 w-full z-50 bg-[#0B1525] text-white shadow-lg shadow-[#0B1525]/10 border-b border-white/5">
        <div className="w-full px-3 sm:px-4 lg:px-6 flex items-center h-14 sm:h-16">
          
          {/* Mobile hamburger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors mr-2"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 mr-4 lg:mr-6 shrink-0">
            <img
              alt="SalesClin Logo"
              className="h-8 sm:h-10 w-auto object-contain"
              src="/logo-site.png"
            />
          </Link>

          {/* Navigation Items — Desktop only */}
          <nav id="tour-menu" className="hidden lg:flex flex-1 justify-center items-center gap-2 md:gap-4 overflow-x-auto scrollbar-hide py-2">
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.url || 
                (item.url !== '/dashboard' && location.pathname.startsWith(item.url));
              
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className="flex flex-col items-center justify-center gap-1.5 group w-20 md:w-24 shrink-0 transition-all duration-200"
                  title={item.title}
                >
                  <span className={cn(
                    "material-symbols-outlined text-[24px] transition-colors",
                    isActive
                      ? "text-secondary drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                      : "text-slate-500 group-hover:text-slate-400"
                  )}>
                    {item.icon}
                  </span>
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest transition-colors font-headline mt-0.5",
                    isActive ? "text-secondary" : "text-slate-500 group-hover:text-slate-400"
                  )}>
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Spacer for mobile */}
          <div className="flex-1 lg:hidden" />

          {/* Right Side — Bell + Avatar Dropdown */}
          <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-4 shrink-0" ref={menuRef}>
            {/* Notification Bell */}
            <button
              className="relative flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
              title="Notificações"
            >
              <span className="material-symbols-outlined text-[22px] sm:text-[26px]">notifications</span>
              {/* Red dot */}
              <span className="absolute top-0 right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border-2 border-[#0B1525]" />
            </button>

            {/* Avatar */}
            <button
              id="tour-settings"
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer shadow-sm overflow-hidden",
                isProfileActive 
                  ? "border-2 border-secondary shadow-[0_0_12px_rgba(249,115,22,0.3)]" 
                  : "border border-white/20 hover:border-white/40"
              )}
              title="Menu do usuário"
            >
              {professional?.photoUrl ? (
                <img 
                  src={professional.photoUrl} 
                  alt="Foto do perfil" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className={cn(
                  "w-full h-full flex items-center justify-center",
                  isProfileActive ? "bg-secondary/10 text-secondary" : "bg-white/5 text-slate-300"
                )}>
                  {initials}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute top-14 right-2 sm:right-4 w-56 sm:w-64 bg-white rounded-2xl shadow-2xl shadow-black/15 border border-slate-100 py-2 text-slate-700 animate-fade-in-up overflow-hidden z-[100]">
                {/* User info header */}
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
                  <span className="text-[10px] sm:text-[11px] font-bold text-primary/60 uppercase tracking-wider">{roleName}</span>
                  <p className="text-sm sm:text-base font-bold text-slate-900 font-headline mt-0.5">{professional?.name || 'Usuário'}</p>
                </div>

                {/* Menu items */}
                <div className="py-1.5">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-400">person_outline</span>
                    Meu Perfil
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-400">settings</span>
                    Configurações
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-slate-100 pt-1.5">
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-medium text-red-500 hover:bg-red-50 w-full transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Sair da Conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <nav className="absolute top-14 left-0 right-0 bottom-0 bg-[#0B1525] overflow-y-auto animate-fade-in-up">
            <div className="p-4 space-y-1">
              {filteredMenuItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url !== '/dashboard' && location.pathname.startsWith(item.url));
                
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-sm font-medium",
                      isActive
                        ? "bg-white/10 text-secondary"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <span className={cn(
                      "material-symbols-outlined text-[22px]",
                      isActive ? "text-secondary" : "text-slate-500"
                    )}>
                      {item.icon}
                    </span>
                    {item.title}
                  </Link>
                );
              })}
            </div>

            {/* Mobile drawer footer */}
            <div className="border-t border-white/10 p-4 mt-2 space-y-1">
              <Link
                to="/profile"
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-[22px] text-slate-500">person_outline</span>
                Meu Perfil
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-[22px] text-slate-500">settings</span>
                Configurações
              </Link>
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">logout</span>
                Sair da Conta
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
