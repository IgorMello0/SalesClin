import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bot, Inbox, Loader2, MessageCircle, Phone, RefreshCcw, Search, Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { conversationsApi } from '@/lib/api';

type Message = {
  id: number;
  sender: 'bot' | 'cliente' | 'profissional';
  content: string;
  origin?: string | null;
  createdAt: string;
};

type Conversation = {
  id: number;
  phone?: string | null;
  agentId?: number | null;
  channel?: string | null;
  startedAt: string;
  updatedAt: string;
  lead?: {
    id: number;
    name: string;
    phone?: string | null;
    convertedAt?: string | null;
    convertedToClientId?: number | null;
  } | null;
  client?: { id: number; name: string; phone?: string | null } | null;
  agent?: { id: number; name: string } | null;
  mensagens: Message[];
};

function contactName(conversation: Conversation) {
  return conversation.client?.name || conversation.lead?.name || conversation.phone || 'Contato WhatsApp';
}

function contactPhone(conversation: Conversation) {
  return conversation.phone || conversation.client?.phone || conversation.lead?.phone || '';
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'WA';
}

function isConverted(conversation: Conversation) {
  return Boolean(conversation.lead?.convertedAt || conversation.lead?.convertedToClientId || conversation.client);
}

function messageDate(message: Message) {
  return new Date(message.createdAt);
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await conversationsApi.list();
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel carregar as conversas.');
      const items = (response.data || []).map((conversation: Conversation) => ({
        ...conversation,
        mensagens: [...(conversation.mensagens || [])].sort(
          (a, b) => messageDate(a).getTime() - messageDate(b).getTime(),
        ),
      }));
      items.sort((a, b) => {
        const aLast = a.mensagens.at(-1)?.createdAt || a.updatedAt || a.startedAt;
        const bLast = b.mensagens.at(-1)?.createdAt || b.updatedAt || b.startedAt;
        return new Date(bLast).getTime() - new Date(aLast).getTime();
      });
      setConversations(items);
      setSelectedId((current) => {
        if (current && items.some((item) => item.id === current)) return current;
        return items[0]?.id ?? null;
      });
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error.message || 'Erro ao carregar conversas.');
      if (!silent) toast({ title: 'Erro nas conversas', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(true), 5000);
    return () => window.clearInterval(timer);
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
      const matchesSearch = !query
        || contactName(conversation).toLowerCase().includes(query)
        || contactPhone(conversation).includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [conversations, filter, searchTerm]);

  const convertedCount = conversations.filter(isConverted).length;
  const activeCount = conversations.length - convertedCount;
  const conversionRate = conversations.length ? Math.round((convertedCount / conversations.length) * 100) : 0;

  const formatRelativeTime = (value: string) => {
    const date = new Date(value);
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!selected || !content || sending) return;

    setSending(true);
    try {
      const response = await conversationsApi.sendMessage(selected.id, content);
      if (!response.success) throw new Error(response.error?.message || 'Nao foi possivel enviar a mensagem.');
      setNewMessage('');
      await loadConversations(true);
    } catch (error: any) {
      toast({ title: 'Mensagem nao enviada', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-extrabold text-slate-950">Conversas</h1>
            <span className="hidden text-xs font-medium text-slate-500 sm:block">WhatsApp da clínica</span>
          </div>
          {loadError && <p className="mt-1 text-xs font-semibold text-red-600">{loadError}</p>}
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {[
            { label: 'Ativas', value: activeCount },
            { label: 'Convertidas', value: convertedCount },
            { label: 'Conversao', value: `${conversionRate}%` },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-extrabold leading-none text-slate-950">{stat.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => loadConversations(true)} disabled={refreshing}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-80 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="space-y-2 border-b border-slate-200 bg-slate-50 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou telefone"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-9 bg-white pl-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-9 bg-white text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as conversas</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="converted">Convertidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase text-slate-400">
            {filtered.length} conversa{filtered.length === 1 ? '' : 's'}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Inbox className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600">Nenhuma conversa real ainda</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Quando uma mensagem chegar pelo webhook, ela aparecerá aqui.</p>
              </div>
            ) : filtered.map((conversation) => {
              const name = contactName(conversation);
              const lastMessage = conversation.mensagens.at(-1);
              const active = selectedId === conversation.id;
              const converted = isConverted(conversation);
              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${active ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex gap-3">
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${active ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                        <span className="flex-shrink-0 text-[10px] text-slate-400">
                          {formatRelativeTime(lastMessage?.createdAt || conversation.updatedAt || conversation.startedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{lastMessage?.content || 'Conversa iniciada'}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold">
                        <span className={`h-1.5 w-1.5 rounded-full ${converted ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                        <span className={converted ? 'text-emerald-600' : 'text-sky-600'}>{converted ? 'Convertida' : 'Em andamento'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {selected ? (
          <section className="flex min-w-0 flex-1 flex-col bg-slate-50">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {initials(contactName(selected))}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">{contactName(selected)}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{contactPhone(selected)}</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                {selected.agentId ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                {selected.agentId ? selected.agent?.name || 'IA configurada' : 'Atendimento manual'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8">
              {selected.mensagens.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle className="h-12 w-12 text-slate-300" />
                  <p className="mt-3 font-bold text-slate-600">Conversa sem mensagens</p>
                </div>
              ) : selected.mensagens.map((message, index) => {
                const incoming = message.sender === 'cliente';
                const previous = selected.mensagens[index - 1];
                const showDate = !previous || !isSameDay(messageDate(previous), messageDate(message));
                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="my-4 flex justify-center">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-500">
                          {format(messageDate(message), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <div className={`mb-3 flex ${incoming ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[78%] sm:max-w-[62%]">
                        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${incoming ? 'rounded-bl-sm border border-slate-200 bg-white text-slate-800' : 'rounded-br-sm bg-slate-950 text-white'}`}>
                          {message.content}
                        </div>
                        <p className={`mt-1 text-[10px] text-slate-400 ${incoming ? 'text-left' : 'text-right'}`}>
                          {!incoming && <span className="mr-1 font-bold text-sky-600">{message.sender === 'bot' ? 'IA' : 'Você'}</span>}
                          {format(messageDate(message), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 border-t border-slate-200 bg-white p-4">
              <div className="mx-auto flex max-w-5xl items-center gap-3">
                <Input
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Digite uma mensagem"
                  disabled={sending}
                  className="h-11"
                />
                <Button size="icon" onClick={() => void sendMessage()} disabled={sending || !newMessage.trim()} aria-label="Enviar mensagem">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">A mensagem será enviada pelo WhatsApp conectado à clínica.</p>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-8 text-center">
            <MessageCircle className="h-14 w-14 text-slate-300" />
            <p className="mt-4 font-bold text-slate-600">Selecione uma conversa</p>
            <p className="mt-1 max-w-sm text-sm text-slate-400">As mensagens recebidas pelo WhatsApp conectado aparecerão nesta central.</p>
          </section>
        )}
      </main>
    </div>
  );
};

export default Conversations;
