import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';

const AppLayout = () => {
  const { professional, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!professional) {
    return <Navigate to="/login" replace />;
  }

  const isFullScreen = location.pathname === '/conversations';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background font-body">
        <AppSidebar />
        <SidebarInset className="w-full bg-transparent overflow-x-hidden flex flex-col">
          {/* Top header — hidden in full-screen routes like /conversations */}
          {!isFullScreen && (
            <header className="sticky top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/20 shadow-sm transition-all duration-300">
              <div className="w-full px-4 md:px-8 py-3 flex justify-between items-center h-16">
                <div className="flex items-center gap-4 flex-1">
                  <SidebarTrigger className="text-primary hover:bg-slate-100 rounded-lg p-2" />
                  <div className="relative flex-1 max-w-md animate-fade-in-up">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                    <input
                      className="pl-10 pr-4 py-2 bg-slate-100/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 w-full text-on-surface placeholder-slate-400 transition-all focus:bg-white focus:shadow-sm"
                      placeholder="Pesquisar..."
                      type="text"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6 animate-fade-in-up ml-4">
                  <button className="hidden sm:block px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg btn-hover shadow-sm">
                    Novo Cliente
                  </button>
                  <div className="flex items-center gap-4">
                    <button className="text-slate-400 hover:text-primary transition-colors relative flex items-center btn-hover">
                      <span className="material-symbols-outlined">notifications</span>
                      <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full ring-2 ring-white"></span>
                    </button>
                    <button className="text-slate-400 hover:text-primary transition-colors btn-hover hidden xs:block">
                      <span className="material-symbols-outlined">calendar_today</span>
                    </button>
                    <div className="flex items-center gap-3 pl-2">
                      <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm hover:ring-2 hover:ring-primary/10 transition-all cursor-pointer overflow-hidden">
                        <img
                          alt="User Profile"
                          className="w-full h-full object-cover"
                          src={`https://ui-avatars.com/api/?name=${professional.name}&background=random`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          )}

          {/* Main content area */}
          {isFullScreen ? (
            <div className="flex-1 overflow-hidden">
              <Outlet />
            </div>
          ) : (
            <main className="w-full min-h-screen p-4 md:p-10">
              <div className="animate-fade-in-up">
                <Outlet />
              </div>
            </main>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;