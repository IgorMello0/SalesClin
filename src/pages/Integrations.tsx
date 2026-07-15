import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCcw,
  Unplug,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { googleCalendarApi, whatsappMetaApi, whatsappUazapiApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type IntegrationKey = 'whatsappOfficial' | 'whatsappUazapi' | 'instagram' | 'messenger' | 'googleCalendar';

type MetaStatus = {
  connected?: boolean;
  status?: string;
  serverSecretConfigured?: boolean;
  phoneNumberId?: string | null;
  wabaId?: string | null;
  businessId?: string | null;
  displayPhoneNumber?: string | null;
  webhookVerifyToken?: string | null;
  webhookUrl?: string | null;
  hasAccessToken?: boolean;
  hasTwoStepPin?: boolean;
};

type MetaForm = {
  phoneNumberId: string;
  wabaId: string;
  businessId: string;
  accessToken: string;
  webhookVerifyToken: string;
  twoStepPin: string;
  displayPhoneNumber: string;
};

type UazapiStatus = {
  serverConfigured?: boolean;
  configured?: boolean;
  connected?: boolean;
  loggedIn?: boolean;
  status?: string;
  providerStatus?: string;
  instanceId?: string | null;
  instanceName?: string | null;
  webhookUrl?: string | null;
  qrcode?: string | null;
  pairingCode?: string | null;
  profileName?: string | null;
  owner?: string | null;
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
    id: 'whatsappOfficial',
    title: 'WhatsApp Oficial',
    eyebrow: 'Cloud API',
    description: 'Use Phone Number ID, WABA ID e token permanente da propria clinica.',
    status: 'Disponivel',
    available: true,
    logo: (
      <span className="relative flex h-8 w-8 items-center justify-center">
        <img src="/integrations/whatsapp.webp" alt="WhatsApp" className="h-7 w-7 object-contain" />
        <img src="/integrations/meta-logo.png" alt="Meta" className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white p-0.5 shadow-sm" />
      </span>
    ),
  },
  {
    id: 'whatsappUazapi',
    title: 'WhatsApp Não Oficial',
    eyebrow: 'WhatsApp',
    description: 'Conecte por QR Code ou codigo de pareamento, sem preencher credenciais tecnicas.',
    status: 'Disponivel',
    available: true,
    logo: (
      <span className="relative flex h-8 w-8 items-center justify-center">
        <img src="/integrations/whatsapp.webp" alt="WhatsApp" className="h-7 w-7 object-contain" />
        <QrCode className="absolute -bottom-1 -right-1 h-4 w-4 rounded bg-white p-0.5 text-slate-700 shadow-sm" />
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

const emptyMetaForm: MetaForm = {
  phoneNumberId: '',
  wabaId: '',
  businessId: '',
  accessToken: '',
  webhookVerifyToken: '',
  twoStepPin: '',
  displayPhoneNumber: '',
};

const Integrations = () => {
  const { professional } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canManageIntegrations = professional?.role === 'admin' || professional?.role === 'profissional';
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationKey | null>(null);
  const [workingKey, setWorkingKey] = useState<IntegrationKey | 'meta-save' | 'meta-disconnect' | 'uazapi-qr' | 'uazapi-pair' | 'uazapi-disconnect' | null>(null);
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [metaForm, setMetaForm] = useState<MetaForm>(emptyMetaForm);
  const [uazapiStatus, setUazapiStatus] = useState<UazapiStatus | null>(null);
  const [uazapiPhone, setUazapiPhone] = useState('');
  const [uazapiPolling, setUazapiPolling] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const selectedOption = integrationOptions.find((option) => option.id === selectedIntegration);

  const loadMetaStatus = async () => {
    const response = await whatsappMetaApi.status();
    if (!response.success) {
      throw new Error(response.error?.message || 'Nao foi possivel consultar WhatsApp Oficial.');
    }

    const data = response.data || {};
    setMetaStatus(data);
    setMetaForm((current) => ({
      ...current,
      phoneNumberId: data.phoneNumberId || '',
      wabaId: data.wabaId || '',
      businessId: data.businessId || '',
      accessToken: '',
      webhookVerifyToken: data.webhookVerifyToken || '',
      twoStepPin: '',
      displayPhoneNumber: data.displayPhoneNumber || '',
    }));
  };

  const loadUazapiStatus = async () => {
    const response = await whatsappUazapiApi.status();
    if (!response.success) {
      throw new Error(response.error?.message || 'Nao foi possivel consultar a conexao do WhatsApp.');
    }
    setUazapiStatus((current) => ({ ...current, ...(response.data || {}) }));
  };

  useEffect(() => {
    if (!canManageIntegrations) return;

    Promise.allSettled([loadMetaStatus(), loadUazapiStatus()]).then((results) => {
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') {
        toast({ title: 'Erro ao carregar integracoes', description: failed.reason?.message, variant: 'destructive' });
      }
    });
  }, [canManageIntegrations]);

  useEffect(() => {
    if (!uazapiPolling) return;

    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const response = await whatsappUazapiApi.status();
        if (cancelled || !response.success) return;
        const data = response.data || {};
        setUazapiStatus((current) => ({ ...current, ...data }));
        if (data.connected || data.qrcode || data.pairingCode || attempts >= 30) {
          setUazapiPolling(false);
        }
      } catch {
        if (attempts >= 30) setUazapiPolling(false);
      }
    };

    const timer = window.setInterval(poll, 2000);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [uazapiPolling]);

  const copyText = async (value?: string | null, label = 'Texto') => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copiado` });
  };

  const saveMetaConfig = async () => {
    setWorkingKey('meta-save');
    try {
      const response = await whatsappMetaApi.configure({
        phoneNumberId: metaForm.phoneNumberId.trim(),
        wabaId: metaForm.wabaId.trim(),
        businessId: metaForm.businessId.trim(),
        accessToken: metaForm.accessToken.trim(),
        webhookVerifyToken: metaForm.webhookVerifyToken.trim(),
        twoStepPin: metaForm.twoStepPin.trim(),
        displayPhoneNumber: metaForm.displayPhoneNumber.trim(),
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Nao foi possivel salvar a Meta.');
      }

      toast({ title: 'WhatsApp Oficial salvo', description: 'Agora configure a URL e o verify token no app da Meta.' });
      await loadMetaStatus();
    } catch (error: any) {
      toast({ title: 'Erro na Meta', description: error.message, variant: 'destructive' });
    } finally {
      setWorkingKey(null);
    }
  };

  const disconnectMeta = async () => {
    if (!confirm('Desconectar o WhatsApp Oficial desta clinica?')) return;
    setWorkingKey('meta-disconnect');
    try {
      const response = await whatsappMetaApi.disconnect();
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel desconectar.');
      toast({ title: 'WhatsApp Oficial desconectado' });
      await loadMetaStatus();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setWorkingKey(null);
    }
  };

  const connectUazapi = async (usePairingCode = false) => {
    if (usePairingCode && uazapiPhone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Informe o telefone', description: 'Use DDI e DDD, por exemplo 5511999999999.', variant: 'destructive' });
      return;
    }

    setWorkingKey(usePairingCode ? 'uazapi-pair' : 'uazapi-qr');
    try {
      const response = await whatsappUazapiApi.connect(usePairingCode ? uazapiPhone : undefined);
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel conectar o WhatsApp.');
      const data = response.data || {};
      setUazapiStatus(data);
      setUazapiPolling(!data.connected && !data.qrcode && !data.pairingCode);
      toast({
        title: usePairingCode ? 'Codigo solicitado' : 'QR Code solicitado',
        description: response.data?.message || 'Conexao iniciada.',
      });
    } catch (error: any) {
      setUazapiPolling(false);
      toast({ title: 'Erro ao conectar WhatsApp', description: String(error.message || '').replace(/UAZAPI/gi, 'servico de conexao'), variant: 'destructive' });
    } finally {
      setWorkingKey(null);
    }
  };

  const disconnectUazapi = async () => {
    if (!confirm('Remover esta conexao do WhatsApp?')) return;
    setWorkingKey('uazapi-disconnect');
    try {
      const response = await whatsappUazapiApi.disconnect();
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel desconectar.');
      setUazapiStatus(null);
      await loadUazapiStatus();
      toast({ title: 'WhatsApp desconectado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setWorkingKey(null);
    }
  };

  const qrCodeSource = (() => {
    const value = uazapiStatus?.qrcode?.trim();
    if (!value) return null;
    if (value.startsWith('data:image/')) return value;
    return /^[A-Za-z0-9+/=]+$/.test(value) ? `data:image/png;base64,${value}` : null;
  })();

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
          Conecte agenda e canais oficiais para transformar mensagens novas em leads no SellClin.
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            {selectedIntegration === 'whatsappOfficial' && (
              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                <div className="space-y-5">
                  {!metaStatus?.serverSecretConfigured && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                      A integracao oficial ainda nao esta disponivel. Entre em contato com o suporte do SellClin.
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Phone Number ID</Label>
                      <Input
                        value={metaForm.phoneNumberId}
                        onChange={(event) => setMetaForm({ ...metaForm, phoneNumberId: event.target.value })}
                        placeholder="100234567890123"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp Business Account ID</Label>
                      <Input
                        value={metaForm.wabaId}
                        onChange={(event) => setMetaForm({ ...metaForm, wabaId: event.target.value })}
                        placeholder="100234567890456"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Permanent Access Token</Label>
                      <div className="relative">
                        <Input
                          type={showToken ? 'text' : 'password'}
                          value={metaForm.accessToken}
                          onChange={(event) => setMetaForm({ ...metaForm, accessToken: event.target.value })}
                          placeholder={metaStatus?.hasAccessToken ? 'Token salvo. Preencha apenas se quiser trocar.' : 'EAA...'}
                          className="pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Webhook Verify Token</Label>
                      <Input
                        value={metaForm.webhookVerifyToken}
                        onChange={(event) => setMetaForm({ ...metaForm, webhookVerifyToken: event.target.value })}
                        placeholder="Crie uma chave sua"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Two-step PIN</Label>
                      <Input
                        value={metaForm.twoStepPin}
                        onChange={(event) => setMetaForm({ ...metaForm, twoStepPin: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                        placeholder="Opcional"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Webhook Callback URL</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <Input value={metaStatus?.webhookUrl || 'Salve a configuracao para gerar a URL'} readOnly className="bg-white font-mono text-xs" />
                      <Button type="button" variant="outline" onClick={() => copyText(metaStatus?.webhookUrl, 'URL')}>
                        <Copy size={16} className="mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-500">
                      No painel da Meta, cole essa URL em Webhooks e use exatamente o Verify Token salvo acima.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={saveMetaConfig} disabled={workingKey === 'meta-save'} className="font-bold">
                      {workingKey === 'meta-save' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CheckCircle2 size={16} className="mr-2" />}
                      Salvar WhatsApp Oficial
                    </Button>
                    <Button variant="outline" onClick={() => loadMetaStatus()} disabled={!!workingKey} className="font-bold">
                      Atualizar status
                    </Button>
                    {metaStatus?.connected && (
                      <Button variant="outline" onClick={disconnectMeta} disabled={workingKey === 'meta-disconnect'} className="font-bold text-red-600 hover:text-red-700">
                        {workingKey === 'meta-disconnect' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Unplug size={16} className="mr-2" />}
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Status</p>
                    <p className={`mt-2 text-sm font-black ${metaStatus?.connected ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {metaStatus?.connected ? 'Conectado' : 'Pendente'}
                    </p>
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Phone Number ID</p>
                    <p className="mt-2 break-all font-mono text-sm text-slate-900">{metaStatus?.phoneNumberId || '-'}</p>
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Token</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{metaStatus?.hasAccessToken ? 'Salvo' : 'Nao salvo'}</p>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                    <MessageCircle className="mb-2 h-5 w-5" />
                    <p className="font-black">Mensagem recebida vira lead</p>
                    <p className="mt-1 leading-relaxed">
                      O webhook identifica a clinica pelo Phone Number ID ou pela URL unica, cria o lead e salva a conversa.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedIntegration === 'whatsappUazapi' && (
              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                <div className="space-y-5">
                  {uazapiStatus?.serverConfigured === false && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                      A conexao por QR Code esta temporariamente indisponivel. Entre em contato com o suporte do SellClin.
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <QrCode className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-black text-slate-950">Conectar com QR Code</p>
                        <p className="mt-1 text-sm font-medium text-slate-600">
                          Abra WhatsApp no celular, acesse Aparelhos conectados e escaneie o codigo.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-5">
                      {qrCodeSource ? (
                        <img src={qrCodeSource} alt="QR Code para conectar WhatsApp" className="h-56 w-56 object-contain" />
                      ) : uazapiStatus?.connected ? (
                        <div className="text-center">
                          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                          <p className="mt-3 font-black text-slate-950">WhatsApp conectado</p>
                          <p className="mt-1 text-sm text-slate-500">{uazapiStatus.profileName || uazapiStatus.owner || 'Instancia ativa'}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <QrCode className="mx-auto h-12 w-12 text-slate-300" />
                          <p className="mt-3 font-black text-slate-900">Pronto para gerar o QR Code</p>
                          <p className="mt-1 max-w-sm text-sm text-slate-500">Clique no botao abaixo para criar a instancia e iniciar a conexao.</p>
                        </div>
                      )}
                    </div>

                    {!uazapiStatus?.connected && (
                      <Button
                        onClick={() => connectUazapi(false)}
                        disabled={!!workingKey || uazapiPolling || uazapiStatus?.serverConfigured === false}
                        className="mt-4 w-full bg-emerald-600 font-bold hover:bg-emerald-700"
                      >
                        {workingKey === 'uazapi-qr' || uazapiPolling ? <Loader2 size={16} className="mr-2 animate-spin" /> : <QrCode size={16} className="mr-2" />}
                        {uazapiPolling ? 'Aguardando QR Code...' : 'Gerar QR Code'}
                      </Button>
                    )}
                  </div>

                  {!uazapiStatus?.connected && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                      <p className="font-black text-slate-950">Conectar sem QR Code</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Informe o telefone com DDI e DDD para gerar um codigo de pareamento.
                      </p>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={uazapiPhone}
                          onChange={(event) => setUazapiPhone(event.target.value.replace(/\D/g, '').slice(0, 15))}
                          placeholder="5511999999999"
                          inputMode="numeric"
                        />
                        <Button
                          variant="outline"
                          onClick={() => connectUazapi(true)}
                          disabled={!!workingKey || uazapiPolling || uazapiStatus?.serverConfigured === false}
                          className="font-bold"
                        >
                          {workingKey === 'uazapi-pair' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCcw size={16} className="mr-2" />}
                          Gerar codigo
                        </Button>
                      </div>
                      {uazapiStatus?.pairingCode && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Codigo de pareamento</p>
                          <p className="mt-2 font-mono text-2xl font-black tracking-widest text-slate-950">{uazapiStatus.pairingCode}</p>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Status</p>
                    <p className={`mt-2 text-sm font-black ${uazapiStatus?.connected ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {uazapiStatus?.connected ? 'Conectado' : uazapiStatus?.configured ? 'Aguardando conexao' : 'Nao configurado'}
                    </p>
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Instancia</p>
                    <p className="mt-2 break-all font-mono text-xs text-slate-900">{uazapiStatus?.instanceName || '-'}</p>
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Webhook</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{uazapiStatus?.configured ? 'Configurado automaticamente' : 'Pendente'}</p>
                  </div>

                  <Button variant="outline" onClick={loadUazapiStatus} disabled={!!workingKey} className="w-full font-bold">
                    <RefreshCcw size={16} className="mr-2" />
                    Atualizar status
                  </Button>

                  {uazapiStatus?.configured && (
                    <Button
                      variant="outline"
                      onClick={disconnectUazapi}
                      disabled={workingKey === 'uazapi-disconnect'}
                      className="w-full font-bold text-red-600 hover:text-red-700"
                    >
                      {workingKey === 'uazapi-disconnect' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Unplug size={16} className="mr-2" />}
                      Remover instancia
                    </Button>
                  )}

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <MessageCircle className="mb-2 h-5 w-5" />
                    <p className="font-black">Mensagem recebida vira lead</p>
                    <p className="mt-1 leading-relaxed">Numeros novos entram no funil e a conversa fica salva sem duplicar mensagens.</p>
                  </div>
                </div>
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
