import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { AppTopNavbar } from '@/components/AppTopNavbar';
import { AppSidebar } from '@/components/AppSidebar';

const AppLayout = () => {
  const { professional, isLoading } = useAuth();
  const { layout } = useLayout();
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

  if (layout === 'side') {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row w-full bg-background font-body overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Main content area */}
          {isFullScreen ? (
            <div className="flex-1 overflow-hidden">
              <Outlet />
            </div>
          ) : (
            <main className="w-full flex-1 px-3 sm:px-6 md:px-12 lg:px-24 py-4 sm:py-6 md:py-10 overflow-y-auto">
              <div className="max-w-[1400px] mx-auto animate-fade-in-up">
                <Outlet />
              </div>
            </main>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-background font-body">
      {/* Top Navbar */}
      <AppTopNavbar />

      {/* Main content area */}
      {isFullScreen ? (
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      ) : (
        <main className="w-full flex-1 px-3 sm:px-6 md:px-12 lg:px-24 py-4 sm:py-6 md:py-10">
          <div className="max-w-[1400px] mx-auto animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      )}
    </div>
  );
};

export default AppLayout;