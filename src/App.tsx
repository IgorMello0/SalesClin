import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LayoutProvider } from "./contexts/LayoutContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SelectPlan from "./pages/SelectPlan";
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
import Leads from "./pages/Leads";
import SalesFunnel from "./pages/SalesFunnel";
import Goals from "./pages/Goals";
import FAQ from "./pages/FAQ";
import FunilPage from "./pages/FunilPage";
import AgendaPage from "./pages/AgendaPage";
import MetasPage from "./pages/MetasPage";
import PrecosPage from "./pages/PrecosPage";
import ClientesPage from "./pages/ClientesPage";
import SobrePage from "./pages/SobrePage";
import Campaigns from "./pages/Campaigns";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LayoutProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/select-plan" element={<SelectPlan />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/funcionalidades/funil" element={<FunilPage />} />
                <Route path="/funcionalidades/agenda" element={<AgendaPage />} />
                <Route path="/funcionalidades/metas" element={<MetasPage />} />
                <Route path="/precos" element={<PrecosPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/sobre" element={<SobrePage />} />
                <Route path="/" element={<AppLayout />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="appointments" element={<ProtectedRoute moduleCode="agendamentos" moduleName="Agenda"><Appointments /></ProtectedRoute>} />
                  <Route path="clients" element={<ProtectedRoute moduleCode="clientes" moduleName="Clientes"><Clients /></ProtectedRoute>} />
                  <Route path="leads" element={<ProtectedRoute moduleCode="clientes" moduleName="Leads"><Leads /></ProtectedRoute>} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="payments" element={<ProtectedRoute moduleCode="pagamentos" moduleName="Financeiro"><Payments /></ProtectedRoute>} />
                  <Route path="conversations" element={<ProtectedRoute moduleCode="conversas" moduleName="Conversas"><Conversations /></ProtectedRoute>} />
                  <Route path="catalogs" element={<ProtectedRoute moduleCode="catalogos" moduleName="Catálogos"><Catalogs /></ProtectedRoute>} />
                  <Route path="catalogs/:id" element={<ProtectedRoute moduleCode="catalogos" moduleName="Catálogos"><CatalogDetail /></ProtectedRoute>} />
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
                  <Route path="contracts" element={<ProtectedRoute moduleCode="contratos" moduleName="Contratos"><ContractSignature /></ProtectedRoute>} />
                  <Route path="dental-test" element={<DentalTest />} />
                  <Route path="sales-funnel" element={<ProtectedRoute moduleCode="funnel" moduleName="Comercial"><SalesFunnel /></ProtectedRoute>} />
                  <Route path="metas" element={<ProtectedRoute moduleCode="metas" moduleName="Metas"><Goals /></ProtectedRoute>} />
                  <Route path="campaigns" element={<ProtectedRoute moduleCode="campanhas" moduleName="Campanhas"><Campaigns /></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LayoutProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
