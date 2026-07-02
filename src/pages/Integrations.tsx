import { IntegrationsView } from './Settings';
import { useAuth } from '@/contexts/AuthContext';

const Integrations = () => {
  const { professional } = useAuth();
  const canManageIntegrations = professional?.role === 'admin' || professional?.role === 'profissional';

  if (!canManageIntegrations) {
    return (
      <div className="w-full p-4 sm:p-6 md:p-8">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Integrações restritas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas administradores da clínica podem configurar integrações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 md:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integracoes</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Conecte canais de mensagens, agenda e automacoes da clinica.
        </p>
      </div>

      <IntegrationsView />
    </div>
  );
};

export default Integrations;
