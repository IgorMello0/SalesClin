import { useAuth } from '@/contexts/AuthContext';
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
    title: 'Funil',
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
];

export function AppTopNavbar() {
  const { logout, hasModuleAccess, permissions, professional } = useAuth();
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

  return (
    <header className="sticky top-0 w-full z-50 bg-primary text-white shadow-lg shadow-primary/10">
      <div className="w-full px-4 lg:px-6 flex items-center h-14">
        
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 mr-6 shrink-0">
          <img
            alt="SalesClin Logo"
            className="h-7 w-auto object-contain"
            src="/logo-salesclin.png"
          />
        </Link>

        {/* Navigation Items */}
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.url || 
              (item.url !== '/dashboard' && location.pathname.startsWith(item.url));
            
            return (
              <Link
                key={item.title}
                to={item.url}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold tracking-wide font-headline transition-all duration-200 rounded-lg whitespace-nowrap shrink-0",
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                )}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="hidden md:inline">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1 ml-4 shrink-0">
          {/* Profile */}
          <Link
            to="/profile"
            title="Meu Perfil"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              location.pathname === '/profile'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white'
            )}
          >
            <span className="material-symbols-outlined text-xl">account_circle</span>
          </Link>

          {/* Settings */}
          <Link
            to="/settings"
            title="Configurações"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              location.pathname === '/settings'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white'
            )}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sair"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:bg-red-500/20 hover:text-red-300 transition-all"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
