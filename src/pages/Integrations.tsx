import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  QrCode,
  RefreshCcw,
  Smartphone,
  Unplug,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { empresasApi, googleCalendarApi, whatsappMetaApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type IntegrationKey = 'whatsappQr' | 'whatsappOfficial' | 'instagram' | 'messenger' | 'googleCalendar';

type WhatsappStatus = {
  status?: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'LOADING';
  qrcode?: string | null;
  pairingCode?: string | null;
  qrcodeError?: string | null;
  instance?: string | null;
  webhookStatus?: 'configured' | 'error' | 'pending' | 'not_configured';
  message?: string;
};

type IntegrationOption = {
  id: IntegrationKey;
  title: string;
  eyebrow: string;
  description: string;
  status: string;
  available: boolean;
  logo: ReactNode;
};

const logoClass = 'h-7 w-7 object-contain';

const integrationOptions: IntegrationOption[] = [
  {
    id: 'whatsappQr',
    title: 'WhatsApp',
    eyebrow: 'QR Code',
    description: 'Conecte pelo QR Code gerenciado pelo SellClin e capture novos leads automaticamente.',
    status: 'Disponivel',
    available: true,
    logo: <img src="/integrations/whatsapp.webp" alt="WhatsApp" className={logoClass} />,
  },
  {
    id: 'whatsappOfficial',
    title: 'WhatsApp Oficial Meta',
    eyebrow: 'Cloud API',
    description: 'Conecte a API oficial da Meta para operacoes maiores e caminho oficial.',
    status: 'Oficial',
    available: true,
    logo: (
      <span className="relative flex h-8 w-8 items-center justify-center">
        <img src="/integrations/whatsapp.webp" alt="WhatsApp" className="h-7 w-7 object-contain" />
        <img src="/integrations/meta-logo.png" alt="Meta" className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white p-0.5 shadow-sm" />
      </span>
    ),
  },
  {
    id: 'instagram',
    title: 'Instagram',
    eyebrow: 'Social messaging',
    description: 'Receba DMs e comentarios do Instagram na central de conversas.',
    status: 'Em breve',
    available: false,
    logo: <img src="/integrations/instagram-icon.png" alt="Instagram" className={logoClass} />,
  },
  {
    id: 'messenger',
    title: 'Messenger',
    eyebrow: 'Meta inbox',
    description: 'Atenda conversas vindas do Facebook Messenger no mesmo fluxo.',
    status: 'Em breve',
    available: false,
    logo: <img src="/integrations/facebook-messenger-logo.png" alt="Messenger" className={logoClass} />,
  },
  {
    id: 'googleCalendar',
    title: 'Google Calendar',
    eyebrow: 'Agenda',
    description: 'Sincronize a agenda da clinica com o Google Calendar.',
    status: 'Disponivel',
    available: true,
    logo: <img src="/integrations/google-calendar.webp" alt="Google Calendar" className={logoClass} />,
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
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationKey | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappStatus>({ status: 'LOADING' });
  const [workingKey, setWorkingKey] = useState<IntegrationKey | null>(null);
  const selectedOption = integrationOptions.find((option) => option.id === selectedIntegration);
  const qrImage = useMemo(() => normalizeQrImage(whatsappStatus.qrcode), [whatsappStatus.qrcode]);

  const loadWhatsappStatus = async () => {
    const response = await empresasApi.getWhatsappStatus();
    if (response.success) {
      setWhatsappStatus(response.data || {});
    } else {
      setWhatsappStatus({ status: 'ERROR', message: response.error?.message || 'Nao foi possivel consultar WhatsApp.' });
    }
  };

  useEffect(() => {
    if (canManageIntegrations) {
      loadWhatsappStatus();
    }
  }, [canManageIntegrations]);

  const startWhatsapp = async () => {
    setWorkingKey('whatsappQr');
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
      setWorkingKey(null);
    }
  };

  const disconnectWhatsapp = async () => {
    setWorkingKey('whatsappQr');
    try {
      const response = await empresasApi.disconnectWhatsapp();
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel desconectar.');
      toast({ title: 'WhatsApp desconectado' });
      await loadWhatsappStatus();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setWorkingKey(null);
    }
  };

  const connectOfficialWhatsapp = async () => {
    setWorkingKey('whatsappOfficial');
    try {
      const response = await whatsappMetaApi.connect();
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
        return;
      }
      throw new Error(response.error?.message || 'Nao foi possivel iniciar a conexao oficial da Meta.');
    } catch (error: any) {
      toast({ title: 'Erro na Meta', description: error.message, variant: 'destructive' });
      setWorkingKey(null);
    }
  };

  const connectGoogleCalendar = async () => {
    setWorkingKey('googleCalendar');
    try {
      const response = await googleCalendarApi.connect();
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
        return;
      }
      throw new Error(response.error?.message || 'Nao foi possivel iniciar a conexao com Google Calendar.');
    } catch (error: any) {
      toast({ title: 'Erro no Google Calendar', description: error.message, variant: 'destructive' });
      setWorkingKey(null);
    }
  };

  const showComingSoon = (name: string) => {
    toast({
      title: `${name} em breve`,
      description: 'Este canal ja ficou no desenho da central, mas a conexao sera ativada na proxima etapa.',
    });
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
          Conecte agenda, WhatsApp e canais sociais para transformar mensagens novas em leads no SellClin.
        </p>
      </div>

      <Card className="mx-auto max-w-5xl rounded-[28px] border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Passo 1 de 2</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Escolha uma integracao</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIntegration(null)} disabled={!selectedIntegration}>
              Trocar canal
            </Button>
          </div>

          <div className="grid gap-3">
            {integrationOptions.map((option) => {
              const active = selectedIntegration === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => option.available ? setSelectedIntegration(option.id) : showComingSoon(option.title)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-blue-300 bg-blue-50/70 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
                    {option.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{option.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        option.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {option.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">{option.eyebrow}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">{option.description}</p>
                  </div>
                  {active ? <CheckCircle2 size={20} className="text-blue-600" /> : <ArrowRight size={18} className="text-slate-300" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedOption && (
        <Card className="mx-auto max-w-5xl rounded-[28px] border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
                  {selectedOption.logo}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">Passo 2 de 2</p>
                  <CardTitle className="mt-1">{selectedOption.title}</CardTitle>
                  <CardDescription>{selectedOption.description}</CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate('/conversations')}>
                Ir para Conversas
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {selectedIntegration === 'whatsappQr' && (
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <QrCode className="mt-0.5 text-slate-400" size={20} />
                    <div>
                      <p className="font-bold text-slate-900">QR Code gerenciado pelo SellClin</p>
                      <p className="mt-1 text-sm text-slate-500">
                        A clinica escaneia o QR Code e o SellClin cuida da instancia central, webhook e captura dos leads.
                      </p>
                    </div>
                  </div>

                  <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white p-4">
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
                          Clique em conectar para criar a sessao e buscar QR Code na Evolution central.
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
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Modo</p>
                    <p className="mt-2 text-sm font-black text-slate-900">Evolution central SellClin</p>
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Instancia</p>
                    <p className="mt-2 break-all font-mono text-sm text-slate-900">{whatsappStatus.instance || 'Aguardando conexao'}</p>
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Webhook</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {whatsappStatus.webhookStatus === 'configured' ? 'Configurado' : 'Pendente'}
                    </p>
                  </div>

                  <Button onClick={startWhatsapp} disabled={workingKey === 'whatsappQr'} className="w-full bg-emerald-600 font-bold hover:bg-emerald-700">
                    {workingKey === 'whatsappQr' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <QrCode size={16} className="mr-2" />}
                    {whatsappStatus.status === 'CONNECTED' ? 'Atualizar conexao' : 'Conectar WhatsApp'}
                  </Button>
                  <Button variant="outline" onClick={loadWhatsappStatus} disabled={workingKey === 'whatsappQr'} className="w-full">
                    <RefreshCcw size={16} className="mr-2" />
                    Atualizar status
                  </Button>
                  {whatsappStatus.status === 'CONNECTED' && (
                    <Button variant="outline" onClick={disconnectWhatsapp} disabled={workingKey === 'whatsappQr'} className="w-full text-red-600 hover:text-red-700">
                      <Unplug size={16} className="mr-2" />
                      Desconectar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {selectedIntegration === 'whatsappOfficial' && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="font-black text-blue-950">WhatsApp Business Platform</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-blue-800">
                  Use o fluxo oficial da Meta para vincular um numero do WhatsApp Business Cloud API.
                </p>
                <Button onClick={connectOfficialWhatsapp} disabled={workingKey === 'whatsappOfficial'} className="mt-4 bg-slate-950 font-bold hover:bg-slate-800">
                  {workingKey === 'whatsappOfficial' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ArrowRight size={16} className="mr-2" />}
                  Conectar com Meta
                </Button>
              </div>
            )}

            {selectedIntegration === 'googleCalendar' && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 text-blue-600" size={22} />
                  <div>
                    <p className="font-black text-slate-950">Sincronizar agenda</p>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                      Conecte a conta Google da clinica para manter compromissos e agenda sincronizados.
                    </p>
                    <Button onClick={connectGoogleCalendar} disabled={workingKey === 'googleCalendar'} className="mt-4 bg-slate-950 font-bold hover:bg-slate-800">
                      {workingKey === 'googleCalendar' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ArrowRight size={16} className="mr-2" />}
                      Conectar Google Calendar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Integrations;
