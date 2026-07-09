import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Instagram,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCcw,
  Settings,
  Smartphone,
  Unplug,
} from 'lucide-react';
import { IntegrationsView } from './Settings';
import { useAuth } from '@/contexts/AuthContext';
import { empresasApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ChannelChoice = 'whatsapp' | 'instagram' | 'both';

type WhatsappStatus = {
  status?: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'LOADING';
  qrcode?: string | null;
  pairingCode?: string | null;
  qrcodeStatus?: 'ready' | 'empty' | 'error';
  qrcodeError?: string | null;
  instance?: string | null;
  evolutionMode?: 'managed' | 'custom';
  webhookUrl?: string | null;
  webhookStatus?: 'configured' | 'error' | 'pending' | 'not_configured';
  message?: string;
};

type MetaStatus = {
  configured?: boolean;
  connected?: boolean;
  displayPhoneNumber?: string | null;
  phoneNumberId?: string | null;
  message?: string;
};

const channelOptions: Array<{
  id: ChannelChoice;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Atender conversas e criar leads automaticamente.',
    icon: <MessageCircle size={22} className="text-emerald-500" />,
  },
  {
    id: 'instagram',
    title: 'Instagram',
    description: 'Preparar DMs e comentarios pelo caminho oficial da Meta.',
    icon: <Instagram size={22} className="text-pink-500" />,
  },
  {
    id: 'both',
    title: 'WhatsApp + Instagram',
    description: 'Os dois canais juntos na central de conversas.',
    icon: <span className="material-symbols-outlined text-xl text-slate-800">stacks</span>,
  },
];

function normalizeQrImage(qrcode?: string | null) {
  if (!qrcode) return null;
  return qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`;
}

const Integrations = () => {
  const { professional } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canManageIntegrations = professional?.role === 'admin' || professional?.role === 'profissional';
  const [selectedChannel, setSelectedChannel] = useState<ChannelChoice | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappStatus>({ status: 'LOADING' });
  const [metaStatus] = useState<MetaStatus | null>({ configured: false, connected: false });
  const [isWorkingWhatsapp, setIsWorkingWhatsapp] = useState(false);

  const shouldShowWhatsapp = selectedChannel === 'whatsapp' || selectedChannel === 'both';
  const shouldShowInstagram = selectedChannel === 'instagram' || selectedChannel === 'both';
  const qrImage = useMemo(() => normalizeQrImage(whatsappStatus.qrcode), [whatsappStatus.qrcode]);

  const loadStatuses = async () => {
    const [whatsapp] = await Promise.allSettled([
      empresasApi.getWhatsappStatus(),
    ]);

    if (whatsapp.status === 'fulfilled' && whatsapp.value.success) {
      setWhatsappStatus(whatsapp.value.data || {});
    } else {
      setWhatsappStatus({
        status: 'ERROR',
        message: whatsapp.status === 'fulfilled'
          ? whatsapp.value.error?.message
          : whatsapp.reason?.message || 'Nao foi possivel consultar WhatsApp.',
      });
    }
  };

  useEffect(() => {
    if (canManageIntegrations) {
      loadStatuses();
    }
  }, [canManageIntegrations]);

  const startWhatsapp = async () => {
    setIsWorkingWhatsapp(true);
    try {
      const response = await empresasApi.startWhatsappConnection();
      if (!response.success) {
        throw new Error(response.error?.message || 'Nao foi possivel iniciar a conexao do WhatsApp.');
      }
      setWhatsappStatus(response.data || {});
      toast({
        title: response.data?.qrcode || response.data?.pairingCode ? 'Conexao iniciada' : 'Status atualizado',
        description: response.data?.message || 'Acompanhe o QR Code ou o status da conexao.',
      });
    } catch (error: any) {
      setWhatsappStatus({ status: 'ERROR', message: error.message });
      toast({ title: 'Erro no WhatsApp', description: error.message, variant: 'destructive' });
    } finally {
      setIsWorkingWhatsapp(false);
    }
  };

  const connectMeta = () => {
    toast({
      title: 'Instagram em preparacao',
      description: 'O fluxo oficial da Meta para Instagram sera conectado na proxima etapa. Por enquanto, ative o WhatsApp para validar a inbox.',
    });
  };

  const disconnectWhatsapp = async () => {
    setIsWorkingWhatsapp(true);
    try {
      const response = await empresasApi.disconnectWhatsapp();
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel desconectar.');
      toast({ title: 'WhatsApp desconectado' });
      await loadStatuses();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsWorkingWhatsapp(false);
    }
  };

  if (!canManageIntegrations) {
    return (
      <div className="w-full p-4 sm:p-6 md:p-8">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Integracoes restritas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas administradores da clinica podem configurar integracoes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-2 text-center">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">Central de canais</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Onde sua IA vai atender?</h1>
        <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
          Conecte WhatsApp e Instagram para transformar mensagens novas em leads e conversas no SellClin.
        </p>
      </div>

      <Card className="mx-auto max-w-5xl rounded-[28px] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Passo 1 de 2</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Escolha o canal</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedChannel(null)} disabled={!selectedChannel}>
              Trocar canal
            </Button>
          </div>

          <div className="grid gap-3">
            {channelOptions.map((option) => {
              const active = selectedChannel === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedChannel(option.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-blue-300 bg-blue-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                    {option.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-950">{option.title}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">{option.description}</p>
                  </div>
                  {active ? <CheckCircle2 size={20} className="text-blue-600" /> : <ArrowRight size={18} className="text-slate-300" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedChannel && (
        <Card className="mx-auto max-w-5xl rounded-[28px] border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Passo 2 de 2</p>
                <CardTitle className="mt-1">Conectar canais</CardTitle>
                <CardDescription>Escaneie o WhatsApp ou autorize a Meta. Depois siga para a central de conversas.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/conversations')}>
                Ir para Conversas
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {shouldShowWhatsapp && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <MessageCircle size={22} />
                    </div>
                    <div>
                      <p className="font-black text-slate-950">WhatsApp</p>
                      <p className="text-xs font-medium text-slate-500">
                        {whatsappStatus.evolutionMode === 'custom' ? 'Evolution propria da clinica' : 'Gerenciado pelo SellClin'}
                      </p>
                    </div>
                  </div>
                  {whatsappStatus.status === 'CONNECTED' && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Conectado</span>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-3 rounded-2xl border border-white bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <QrCode className="mt-0.5 text-slate-400" size={20} />
                      <div>
                        <p className="font-bold text-slate-900">QR Code ou codigo de pareamento</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Abra o WhatsApp no celular, acesse Aparelhos conectados e escaneie o QR Code.
                        </p>
                      </div>
                    </div>

                    <div className="flex min-h-[220px] items-center justify-center rounded-2xl bg-slate-50 p-4">
                      {whatsappStatus.status === 'CONNECTED' ? (
                        <div className="text-center">
                          <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
                          <p className="mt-3 font-black text-slate-900">Numero conectado</p>
                          <p className="mt-1 text-sm text-slate-500">As mensagens recebidas ja podem virar leads e conversas.</p>
                        </div>
                      ) : qrImage ? (
                        <img src={qrImage} alt="WhatsApp QR Code" className="h-56 w-56 rounded-xl bg-white p-2 shadow-sm" />
                      ) : whatsappStatus.pairingCode ? (
                        <div className="text-center">
                          <Smartphone className="mx-auto text-blue-500" size={40} />
                          <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Codigo de pareamento</p>
                          <p className="mt-2 rounded-xl bg-white px-5 py-3 font-mono text-2xl font-black tracking-[0.25em] text-slate-950 shadow-sm">
                            {whatsappStatus.pairingCode}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <QrCode className="mx-auto text-slate-300" size={44} />
                          <p className="mt-3 font-black text-slate-900">Pronto para gerar conexao</p>
                          <p className="mt-1 max-w-sm text-sm text-slate-500">
                            Clique em conectar para criar a sessao e buscar QR Code na Evolution.
                          </p>
                        </div>
                      )}
                    </div>

                    {(whatsappStatus.message || whatsappStatus.qrcodeError) && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                        {whatsappStatus.qrcodeError || whatsappStatus.message}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Instancia</p>
                      <p className="mt-2 break-all font-mono text-sm text-slate-900">{whatsappStatus.instance || 'Aguardando conexao'}</p>
                      <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Webhook</p>
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        {whatsappStatus.webhookStatus === 'configured' ? 'Configurado' : 'Pendente'}
                      </p>
                    </div>

                    <Button onClick={startWhatsapp} disabled={isWorkingWhatsapp} className="w-full bg-emerald-600 font-bold hover:bg-emerald-700">
                      {isWorkingWhatsapp ? <Loader2 size={16} className="mr-2 animate-spin" /> : <QrCode size={16} className="mr-2" />}
                      {whatsappStatus.status === 'CONNECTED' ? 'Atualizar conexao' : 'Conectar WhatsApp'}
                    </Button>
                    <Button variant="outline" onClick={loadStatuses} disabled={isWorkingWhatsapp} className="w-full">
                      <RefreshCcw size={16} className="mr-2" />
                      Atualizar status
                    </Button>
                    {whatsappStatus.status === 'CONNECTED' && (
                      <Button variant="outline" onClick={disconnectWhatsapp} disabled={isWorkingWhatsapp} className="w-full text-red-600 hover:text-red-700">
                        <Unplug size={16} className="mr-2" />
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {shouldShowInstagram && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-500 ring-1 ring-pink-100">
                      <Instagram size={22} />
                    </div>
                    <div>
                      <p className="font-black text-slate-950">Instagram</p>
                      <p className="text-sm font-medium text-slate-500">
                        {metaStatus?.connected
                          ? `Conta conectada${metaStatus.displayPhoneNumber ? `: ${metaStatus.displayPhoneNumber}` : ''}`
                          : 'Fluxo oficial da Meta preparado para a proxima etapa.'}
                      </p>
                    </div>
                  </div>
                  <Button onClick={connectMeta} variant="outline" disabled={metaStatus?.connected === true} className="font-bold">
                    <Instagram size={16} className="mr-2" />
                    {metaStatus?.connected ? 'Instagram conectado' : 'Em breve'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mx-auto max-w-5xl">
        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-black text-slate-800">
            <Settings size={16} />
            Configuracoes avancadas de integracoes
          </summary>
          <div className="mt-5">
            <IntegrationsView />
          </div>
        </details>
      </div>
    </div>
  );
};

export default Integrations;
