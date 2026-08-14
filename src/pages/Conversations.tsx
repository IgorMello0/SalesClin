import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bot, Clock3, Download, Image as ImageIcon, Inbox, Loader2, MessageCircle, Paperclip,
  Phone, Plus, RefreshCcw, Search, Send, Smile, User, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { aiAgentsApi, campaignsApi, conversationsApi, whatsappTemplatesApi } from '@/lib/api';
import type { WhatsAppTemplate } from '@/components/whatsapp/TemplateCatalog';

type Message = {
  id: number;
  sender: 'bot' | 'cliente' | 'profissional';
  content: string;
  origin?: string | null;
  rawJson?: { mediaUrl?: string; mediaType?: 'image' | 'video' | 'audio' } | null;
  createdAt: string;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | null;
  errorMessage?: string | null;
};

type Conversation = {
  id: number;
  phone?: string | null;
  agentId?: number | null;
  channel?: string | null;
  startedAt: string;
  updatedAt: string;
  lead?: { id: number; name: string; phone?: string | null; convertedAt?: string | null; convertedToClientId?: number | null } | null;
  client?: { id: number; name: string; phone?: string | null } | null;
  agent?: { id: number; name: string } | null;
  whatsappProvider?: string | null;
  serviceWindow?: { isOfficial: boolean; isOpen: boolean; expiresAt?: string | null; remainingSeconds?: number | null };
  mensagens: Message[];
};

type AiAgent = { id: number; name: string; isActive: boolean };
type PendingMedia = { file: File; previewUrl: string; type: 'image' | 'video' | 'audio' };
type PreviewImage = { url: string; alt: string };

const EMOJIS = ['😀', '😊', '😂', '😍', '🙏', '👍', '👏', '🎉', '❤️', '✅', '📅', '🦷', '💬', '✨', '🚀', '😉'];

function contactName(conversation: Conversation) {
  return conversation.client?.name || conversation.lead?.name || conversation.phone || 'Contato WhatsApp';
}

function contactPhone(conversation: Conversation) {
  return conversation.phone || conversation.client?.phone || conversation.lead?.phone || '';
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'WA';
}

function isConverted(conversation: Conversation) {
  return Boolean(conversation.lead?.convertedAt || conversation.lead?.convertedToClientId || conversation.client);
}

function messageDate(message: Message) {
  return new Date(message.createdAt);
}

function imageFileName(url: string) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return decodeURIComponent(pathname.split('/').filter(Boolean).pop() || 'imagem-whatsapp');
  } catch {
    return 'imagem-whatsapp';
  }
}

function downloadImage(url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = imageFileName(url);
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

const Conversations = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateParameters, setTemplateParameters] = useState<string[]>([]);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [, setClock] = useState(Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationsRequestInFlight = useRef(false);

  const loadConversations = async (silent = false) => {
    if (conversationsRequestInFlight.current) return;
    conversationsRequestInFlight.current = true;
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const response = await conversationsApi.list();
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel carregar as conversas.');
      const items = (response.data || []).map((conversation: Conversation) => ({
        ...conversation,
        mensagens: [...(conversation.mensagens || [])].sort((a, b) => messageDate(a).getTime() - messageDate(b).getTime()),
      }));
      items.sort((a, b) => {
        const aLast = a.mensagens.at(-1)?.createdAt || a.updatedAt || a.startedAt;
        const bLast = b.mensagens.at(-1)?.createdAt || b.updatedAt || b.startedAt;
        return new Date(bLast).getTime() - new Date(aLast).getTime();
      });
      setConversations(items);
      setSelectedId((current) => current && items.some((item) => item.id === current) ? current : items[0]?.id ?? null);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error.message || 'Erro ao carregar conversas.');
      if (!silent) toast({ title: 'Erro nas conversas', description: error.message, variant: 'destructive' });
    } finally {
      conversationsRequestInFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadConversations();
    void aiAgentsApi.list().then((response) => {
      if (response.success) setAgents((response.data || []).filter((agent: AiAgent) => agent.isActive));
    });
    void whatsappTemplatesApi.list('APPROVED').then((response) => {
      if (response.success) setTemplates(response.data || []);
    });
    const refreshTimer = window.setInterval(() => {
      if (!document.hidden) void loadConversations(true);
    }, 10000);
    const clockTimer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => { window.clearInterval(refreshTimer); window.clearInterval(clockTimer); };
  }, []);

  const selected = conversations.find((conversation) => conversation.id === selectedId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedId, selected?.mensagens.length]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const converted = isConverted(conversation);
      const matchesFilter = filter === 'all' || (filter === 'converted' ? converted : !converted);
      const matchesSearch = !query || contactName(conversation).toLowerCase().includes(query) || contactPhone(conversation).includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [conversations, filter, searchTerm]);

  const convertedCount = conversations.filter(isConverted).length;
  const activeCount = conversations.length - convertedCount;
  const conversionRate = conversations.length ? Math.round((convertedCount / conversations.length) * 100) : 0;

  const formatRelativeTime = (value: string) => {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return format(new Date(value), 'dd/MM', { locale: ptBR });
  };

  const getWindowRemaining = (conversation: Conversation | null) => {
    if (!conversation?.serviceWindow?.isOfficial) return null;
    if (!conversation.serviceWindow.expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(conversation.serviceWindow.expiresAt).getTime() - Date.now()) / 1000));
  };

  const formatWindowRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Janela encerrada';
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min restantes`;
  };

  const clearPendingMedia = () => {
    if (pendingMedia) URL.revokeObjectURL(pendingMedia.previewUrl);
    setPendingMedia(null);
  };

  const selectMedia = (file?: File) => {
    if (!file) return;
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : null;
    if (!type) {
      toast({ title: 'Arquivo nao suportado', description: 'Selecione uma imagem, video ou audio.', variant: 'destructive' });
      return;
    }
    clearPendingMedia();
    setPendingMedia({ file, type, previewUrl: URL.createObjectURL(file) });
  };

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!selected || (!content && !pendingMedia) || sending) return;
    const remaining = getWindowRemaining(selected);
    if (remaining !== null && remaining <= 0) {
      toast({ title: 'Janela de 24 horas encerrada', description: 'Na API oficial, use um template aprovado para retomar esta conversa.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      let media: { url: string; type: 'image' | 'video' | 'audio' } | undefined;
      if (pendingMedia) {
        setUploading(true);
        const upload = await campaignsApi.uploadMedia(pendingMedia.file);
        if (!upload.success || !upload.data?.url) throw new Error(upload.error?.message || 'Nao foi possivel enviar o arquivo.');
        media = { url: upload.data.url, type: pendingMedia.type };
      }
      const response = await conversationsApi.sendMessage(selected.id, content, media);
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel enviar a mensagem.');
      setNewMessage('');
      clearPendingMedia();
      await loadConversations(true);
    } catch (error: any) {
      toast({ title: 'Mensagem nao enviada', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const assignAgent = async (value: string) => {
    if (!selected || assigningAgent) return;
    if (value === 'new') {
      setShowAgentDialog(true);
      return;
    }
    setAssigningAgent(true);
    try {
      const response = await conversationsApi.update(selected.id, { agentId: value === 'manual' ? null : Number(value) });
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel alterar o atendimento.');
      await loadConversations(true);
      toast({ title: value === 'manual' ? 'Atendimento manual ativado' : 'Agente vinculado a conversa' });
    } catch (error: any) {
      toast({ title: 'Erro ao atribuir agente', description: error.message, variant: 'destructive' });
    } finally {
      setAssigningAgent(false);
    }
  };

  const createAgent = async () => {
    if (!agentName.trim() || !agentPrompt.trim() || creatingAgent) return;
    setCreatingAgent(true);
    try {
      const response = await aiAgentsApi.create({
        name: agentName.trim(),
        basePrompt: agentPrompt.trim(),
        temperature: 0.7,
        mode: 'assisted',
      });
      if (!response.success || !response.data) throw new Error(response.error?.message || 'Nao foi possivel criar o agente.');
      const created = response.data as AiAgent;
      setAgents((current) => [created, ...current]);
      setShowAgentDialog(false);
      setAgentName('');
      setAgentPrompt('');
      if (selected) await assignAgent(String(created.id));
    } catch (error: any) {
      toast({ title: 'Erro ao criar agente', description: error.message, variant: 'destructive' });
    } finally {
      setCreatingAgent(false);
    }
  };

  const windowRemaining = getWindowRemaining(selected);
  const officialWindowClosed = windowRemaining !== null && windowRemaining <= 0;

  const selectedTemplate = templates.find((template) => String(template.id) === selectedTemplateId);
  const templateParameterCount = useMemo(() => {
    if (!selectedTemplate) return 0;
    return (selectedTemplate.components || []).reduce((total, component) => {
      if (String(component.type || '').toUpperCase() !== 'BODY') return total;
      return total + (String(component.text || '').match(/\{\{[^}]+\}\}/g) || []).length;
    }, 0);
  }, [selectedTemplate]);

  useEffect(() => {
    setTemplateParameters((current) => Array.from({ length: templateParameterCount }, (_, index) => current[index] || ''));
  }, [templateParameterCount]);

  const sendTemplate = async () => {
    if (!selected || !selectedTemplate || sendingTemplate) return;
    if (templateParameters.some((value) => !value.trim())) {
      toast({ title: 'Preencha as variaveis', description: 'Todas as variaveis do template precisam de um valor.', variant: 'destructive' });
      return;
    }
    setSendingTemplate(true);
    try {
      const response = await conversationsApi.sendTemplate(selected.id, {
        templateId: selectedTemplate.id,
        parameterValues: templateParameters,
      });
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel enviar o template.');
      setShowTemplateDialog(false);
      await loadConversations(true);
      toast({ title: 'Template enviado', description: 'A conversa foi reaberta pela API Oficial.' });
    } catch (error: any) {
      toast({ title: 'Template nao enviado', description: error.message, variant: 'destructive' });
    } finally {
      setSendingTemplate(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-lg font-extrabold text-slate-950">Conversas</h1><span className="hidden text-xs font-medium text-slate-500 sm:block">WhatsApp da clinica</span></div>
          {loadError && <p className="mt-1 text-xs font-semibold text-red-600">{loadError}</p>}
        </div>
        <div className="hidden items-center gap-8 md:flex">
          {[{ label: 'Ativas', value: activeCount }, { label: 'Convertidas', value: convertedCount }, { label: 'Conversao', value: `${conversionRate}%` }].map((stat) => (
            <div key={stat.label} className="text-center"><p className="text-xl font-extrabold leading-none text-slate-950">{stat.value}</p><p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{stat.label}</p></div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => loadConversations(true)} disabled={refreshing}><RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Atualizar</Button>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-80 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="space-y-2 border-b border-slate-200 bg-slate-50 p-3">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input placeholder="Buscar por nome ou telefone" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="h-9 bg-white pl-9" /></div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-9 bg-white text-xs font-semibold">
                <SelectValue>
                  {filter === 'all' ? 'Todas as conversas' : filter === 'in_progress' ? 'Em andamento' : 'Convertidas'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent><SelectItem value="all">Todas as conversas</SelectItem><SelectItem value="in_progress">Em andamento</SelectItem><SelectItem value="converted">Convertidas</SelectItem></SelectContent></Select>
          </div>
          <div className="border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase text-slate-400">{filtered.length} conversa{filtered.length === 1 ? '' : 's'}</div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div> : filtered.length === 0 ? (
              <div className="px-6 py-16 text-center"><Inbox className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Nenhuma conversa real ainda</p><p className="mt-1 text-xs leading-relaxed text-slate-400">Quando uma mensagem chegar pelo webhook, ela aparecera aqui.</p></div>
            ) : filtered.map((conversation) => {
              const name = contactName(conversation);
              const lastMessage = conversation.mensagens.at(-1);
              const active = selectedId === conversation.id;
              const converted = isConverted(conversation);
              return (
                <button type="button" key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                  <div className="flex gap-3"><div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${active ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-700'}`}>{initials(name)}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-slate-900">{name}</p><span className="flex-shrink-0 text-[10px] text-slate-400">{formatRelativeTime(lastMessage?.createdAt || conversation.updatedAt || conversation.startedAt)}</span></div><p className="mt-0.5 truncate text-xs text-slate-500">{lastMessage?.content || 'Conversa iniciada'}</p><div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold"><span className={`h-1.5 w-1.5 rounded-full ${converted ? 'bg-emerald-500' : 'bg-sky-500'}`} /><span className={converted ? 'text-emerald-600' : 'text-sky-600'}>{converted ? 'Convertida' : 'Em andamento'}</span></div></div></div>
                </button>
              );
            })}
          </div>
        </aside>

        {selected ? (
          <section className="flex min-w-0 flex-1 flex-col bg-slate-50">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{initials(contactName(selected))}</div><div><p className="text-sm font-black text-slate-950">{contactName(selected)}</p><p className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{contactPhone(selected)}</p></div></div>
              <div className="flex items-center gap-2">
                {selected.serviceWindow?.isOfficial && <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${!officialWindowClosed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}><Clock3 className="h-3.5 w-3.5" />{formatWindowRemaining(windowRemaining || 0)}</span>}
                <Select value={selected.agentId ? String(selected.agentId) : 'manual'} onValueChange={assignAgent}>
                  <SelectTrigger disabled={assigningAgent} className="h-9 w-[190px] bg-white text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      {selected.agentId ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                      <SelectValue>
                        {selected.agentId ? agents.find(a => String(a.id) === String(selected.agentId))?.name : 'Atendimento manual'}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent><SelectItem value="manual">Atendimento manual</SelectItem>{agents.map((agent) => <SelectItem key={agent.id} value={String(agent.id)}>{agent.name}</SelectItem>)}<SelectItem value="new"><span className="flex items-center gap-2"><Plus className="h-3.5 w-3.5" />Novo agente</span></SelectItem></SelectContent></Select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8">
              {selected.mensagens.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center"><MessageCircle className="h-12 w-12 text-slate-300" /><p className="mt-3 font-bold text-slate-600">Conversa sem mensagens</p></div> : selected.mensagens.map((message, index) => {
                const incoming = message.sender === 'cliente';
                const previous = selected.mensagens[index - 1];
                const showDate = !previous || !isSameDay(messageDate(previous), messageDate(message));
                return (
                  <div key={message.id}>
                    {showDate && <div className="my-4 flex justify-center"><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-500">{format(messageDate(message), "dd 'de' MMMM", { locale: ptBR })}</span></div>}
                    <div className={`mb-3 flex ${incoming ? 'justify-start' : 'justify-end'}`}><div className="max-w-[78%] sm:max-w-[62%]"><div className={`overflow-hidden rounded-2xl text-sm leading-relaxed shadow-sm ${incoming ? 'rounded-bl-sm border border-slate-200 bg-white text-slate-800' : 'rounded-br-sm bg-slate-950 text-white'}`}>
                      {message.rawJson?.mediaUrl && message.rawJson.mediaType === 'image' && (
                        <button
                          type="button"
                          className="group block w-full cursor-zoom-in overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                          onClick={() => setPreviewImage({
                            url: message.rawJson!.mediaUrl!,
                            alt: message.content && !/^\[image\]$/.test(message.content) ? message.content : 'Imagem da conversa',
                          })}
                          aria-label="Ampliar imagem"
                        >
                          <img
                            src={message.rawJson.mediaUrl}
                            alt={message.content && !/^\[image\]$/.test(message.content) ? message.content : 'Imagem da conversa'}
                            className="max-h-72 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        </button>
                      )}
                      {message.rawJson?.mediaUrl && message.rawJson.mediaType === 'video' && <video src={message.rawJson.mediaUrl} controls className="max-h-72 w-full" />}
                      {message.rawJson?.mediaUrl && message.rawJson.mediaType === 'audio' && <audio src={message.rawJson.mediaUrl} controls className="m-2 max-w-[260px]" />}
                      {message.content && !/^\[(image|video|audio)\]$/.test(message.content) && <p className="px-4 py-2.5">{message.content}</p>}
                    </div><p className={`mt-1 text-[10px] text-slate-400 ${incoming ? 'text-left' : 'text-right'}`}>{!incoming && <span className={`mr-1 font-bold ${message.deliveryStatus === 'failed' ? 'text-red-600' : 'text-sky-600'}`}>{message.sender === 'bot' ? 'IA' : 'Voce'}{message.deliveryStatus ? ` · ${message.deliveryStatus === 'read' ? 'lida' : message.deliveryStatus === 'delivered' ? 'entregue' : message.deliveryStatus === 'failed' ? 'falhou' : 'enviada'}` : ''}</span>}{format(messageDate(message), 'HH:mm')}</p></div></div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 border-t border-slate-200 bg-white p-4">
              {pendingMedia && <div className="mx-auto mb-2 flex max-w-5xl items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-2">{pendingMedia.type === 'image' ? <img src={pendingMedia.previewUrl} alt="Previa" className="h-14 w-14 rounded object-cover" /> : <ImageIcon className="h-8 w-8 text-slate-500" />}<div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{pendingMedia.file.name}</p><p className="text-[10px] text-slate-500">{pendingMedia.type}</p></div><Button variant="ghost" size="icon" onClick={clearPendingMedia} aria-label="Remover anexo"><X className="h-4 w-4" /></Button></div>}
              {officialWindowClosed && <div className="mx-auto mb-2 flex max-w-5xl items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"><span>A janela de atendimento da Meta terminou. Para retomar, envie um template aprovado.</span><Button size="sm" onClick={() => setShowTemplateDialog(true)} disabled={templates.length === 0}>Usar template</Button></div>}
              <div className="relative mx-auto flex max-w-5xl items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={(event) => { selectMedia(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending || officialWindowClosed} aria-label="Anexar midia"><Paperclip className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setShowEmojis((open) => !open)} disabled={sending || officialWindowClosed} aria-label="Adicionar emoji"><Smile className="h-4 w-4" /></Button>
                {showEmojis && <div className="absolute bottom-14 left-10 z-20 grid w-56 grid-cols-8 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-xl">{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => { setNewMessage((value) => value + emoji); setShowEmojis(false); }} className="h-7 rounded text-lg hover:bg-slate-100">{emoji}</button>)}</div>}
                <Input value={newMessage} onChange={(event) => setNewMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Digite uma mensagem" disabled={sending || officialWindowClosed} className="h-11" />
                <Button size="icon" onClick={() => void sendMessage()} disabled={sending || (!newMessage.trim() && !pendingMedia) || officialWindowClosed} aria-label="Enviar mensagem">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">{uploading ? 'Enviando midia...' : 'A mensagem sera enviada pelo WhatsApp conectado a clinica.'}</p>
            </div>
          </section>
        ) : <section className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-8 text-center"><MessageCircle className="h-14 w-14 text-slate-300" /><p className="mt-4 font-bold text-slate-600">Selecione uma conversa</p><p className="mt-1 max-w-sm text-sm text-slate-400">As mensagens recebidas pelo WhatsApp conectado aparecerao nesta central.</p></section>}
      </main>

      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
        <DialogContent className="h-full w-full max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden bg-slate-950 p-0 sm:h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100vw-3rem)] sm:max-w-[1500px] [&>button]:border-white/15 [&>button]:bg-slate-900 [&>button]:text-white [&>button]:hover:bg-slate-800">
          <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 px-5 pr-20">
            <DialogTitle className="truncate text-sm font-semibold text-white">
              {previewImage ? imageFileName(previewImage.url) : 'Imagem da conversa'}
            </DialogTitle>
            {previewImage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                onClick={() => downloadImage(previewImage.url)}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </Button>
            )}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 sm:p-8">
            {previewImage && (
              <img
                src={previewImage.url}
                alt={previewImage.alt}
                className="max-h-full max-w-full object-contain shadow-2xl"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo agente de IA</DialogTitle>
            <DialogDescription>Defina a identidade e as orientacoes que serao usadas neste atendimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label htmlFor="agent-name">Nome do agente</Label><Input id="agent-name" value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder="Ex.: Assistente de agendamentos" /></div>
            <div className="space-y-2"><Label htmlFor="agent-prompt">Orientacoes do agente</Label><Textarea id="agent-prompt" value={agentPrompt} onChange={(event) => setAgentPrompt(event.target.value)} placeholder="Descreva o tom, objetivo e regras do atendimento." rows={7} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAgentDialog(false)}>Cancelar</Button><Button onClick={() => void createAgent()} disabled={creatingAgent || !agentName.trim() || !agentPrompt.trim()}>{creatingAgent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar e atribuir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar template aprovado</DialogTitle>
            <DialogDescription>Use um template da Meta para iniciar ou retomar a conversa fora da janela de 24 horas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                <SelectContent>{templates.map((template) => <SelectItem key={template.id} value={String(template.id)}>{template.name} · {template.language}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {templateParameters.map((value, index) => (
              <div key={index} className="space-y-2">
                <Label>Variavel {index + 1}</Label>
                <Input value={value} onChange={(event) => setTemplateParameters((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Valor de {{${index + 1}}}`} />
              </div>
            ))}
            {selectedTemplate && templateParameterCount === 0 && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Este template nao exige variaveis.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancelar</Button>
            <Button onClick={() => void sendTemplate()} disabled={!selectedTemplate || sendingTemplate || templateParameters.some((value) => !value.trim())}>{sendingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Conversations;
