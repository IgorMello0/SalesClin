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
    title: 'Leads',
    url: '/clients',
    icon: 'group',
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
    <header className="sticky top-0 w-full z-50 bg-[#0B1525] text-white shadow-lg shadow-[#0B1525]/10 border-b border-white/5">
      <div className="w-full px-4 lg:px-6 flex items-center h-16">
        
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 mr-6 shrink-0">
          <img
            alt="SalesClin Logo"
            className="h-7 w-auto object-contain"
            src="/logo-salesclin.png"
          />
        </Link>

        {/* Navigation Items */}
        <nav className="flex-1 flex justify-center items-center gap-2 md:gap-4 overflow-x-auto scrollbar-hide py-2">
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

        {/* Right Side — Bell + Avatar Dropdown */}
        <div className="flex items-center gap-4 ml-4 shrink-0" ref={menuRef}>
          {/* Notification Bell */}
          <button
            className="relative flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
            title="Notificações"
          >
            <span className="material-symbols-outlined text-[26px]">notifications</span>
            {/* Red dot */}
            <span className="absolute top-0 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0B1525]" />
          </button>

          {/* Avatar */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[13px] font-bold text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all cursor-pointer shadow-sm"
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

