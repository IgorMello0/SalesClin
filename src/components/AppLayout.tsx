import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppTopNavbar } from '@/components/AppTopNavbar';

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
    <div className="min-h-screen flex flex-col w-full bg-background font-body">
      {/* Top Navbar */}
      <AppTopNavbar />

      {/* Main content area */}
      {isFullScreen ? (
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      ) : (
        <main className="w-full flex-1 px-6 md:px-16 lg:px-24 py-6 md:py-10">
          <div className="max-w-[1400px] mx-auto animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      )}
    </div>
  );
};

export default AppLayout;