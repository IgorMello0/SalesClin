import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Payments from "./pages/Payments";
import Conversations from "./pages/Conversations";
import Settings from "./pages/Settings";
const Admin = lazy(() => import("./pages/Admin"));
import Profile from "./pages/Profile";
import ContractSignature from "./pages/ContractSignature";
import Catalogs from "./pages/Catalogs";
import CatalogDetail from "./pages/CatalogDetail";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";
import DentalTest from "./pages/DentalTest";
import SalesFunnel from "./pages/SalesFunnel";
import Goals from "./pages/Goals";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<AppLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="clients" element={<Clients />} />
                <Route path="reports" element={<Reports />} />
                <Route path="payments" element={<Payments />} />
                <Route path="conversations" element={<Conversations />} />
                <Route path="catalogs" element={<Catalogs />} />
                <Route path="catalogs/:id" element={<CatalogDetail />} />
                <Route path="settings" element={<Settings />} />
                <Route
                  path="admin"
                  element={
                    <Suspense fallback={<div />}> 
                      <Admin />
                    </Suspense>
                  }
                />
                <Route path="profile" element={<Profile />} />
                <Route path="contracts" element={<ContractSignature />} />
                <Route path="dental-test" element={<DentalTest />} />
                <Route path="sales-funnel" element={<SalesFunnel />} />
                <Route path="metas" element={<Goals />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
