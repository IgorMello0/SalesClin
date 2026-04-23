import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredMenuItems = menuItems.filter((item) => {
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

  // User initials
  const initials = professional?.nome
    ? professional.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const roleName = professional?.role === 'admin' ? 'ADMIN' : 'PROFISSIONAL';

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

        {/* Right Side — Bell + Avatar Dropdown */}
        <div className="flex items-center gap-3 ml-4 shrink-0" ref={menuRef}>
          {/* Notification Bell */}
          <button
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Notificações"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {/* Red dot */}
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-primary" />
          </button>

          {/* Avatar */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-sm font-bold text-white hover:bg-white/25 transition-all cursor-pointer"
            title="Menu do usuário"
          >
            {initials}
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute top-14 right-4 w-64 bg-white rounded-2xl shadow-2xl shadow-black/15 border border-slate-100 py-2 text-slate-700 animate-fade-in-up overflow-hidden">
              {/* User info header */}
              <div className="px-5 py-4 border-b border-slate-100">
                <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">{roleName}</span>
                <p className="text-base font-bold text-slate-900 font-headline mt-0.5">{professional?.nome || 'Usuário'}</p>
              </div>

              {/* Menu items */}
              <div className="py-1.5">
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-slate-400">person_outline</span>
                  Meu Perfil
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-slate-400">settings</span>
                  Configurações
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-slate-100 pt-1.5">
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-red-500 hover:bg-red-50 w-full transition-colors"
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
  );
}

