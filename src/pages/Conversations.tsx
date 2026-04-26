import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_CONVERSATIONS: any[] = [
  {
    id: '1', clientName: 'Ana Beatriz Santos', clientPhone: '+55 11 99876-5432', avatar: 'AB',
    status: 'in_progress', lastMessage: 'Sim! Quando vocês têm disponibilidade?',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 3), unread: 2, isAI: true,
    messages: [
      { id: 'm1', from: 'client', text: 'Olá! Gostaria de saber mais sobre o tratamento de depilação a laser.', time: new Date(Date.now() - 1000 * 60 * 12) },
      { id: 'm2', from: 'ai', text: 'Olá, Ana! Tudo bem? Aqui é a assistente virtual da SalesClin. Ficamos felizes com o seu interesse! A depilação a laser é um dos nossos tratamentos mais populares. Qual região do corpo você tem interesse?', time: new Date(Date.now() - 1000 * 60 * 11) },
      { id: 'm3', from: 'client', text: 'Axilas e virilha.', time: new Date(Date.now() - 1000 * 60 * 8) },
      { id: 'm4', from: 'ai', text: 'Ótima escolha! Para axilas e virilha, recomendamos um pacote de 6 sessões para resultados definitivos. Posso agendar uma avaliação gratuita para você?', time: new Date(Date.now() - 1000 * 60 * 7) },
      { id: 'm5', from: 'client', text: 'Sim! Quando vocês têm disponibilidade?', time: new Date(Date.now() - 1000 * 60 * 3) },
    ],
  },
  {
    id: '2', clientName: 'Carlos Mendes', clientPhone: '+55 21 98765-4321', avatar: 'CM',
    status: 'converted', lastMessage: 'Perfeito! Confirmado para terça às 14h.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 45), unread: 0, isAI: false,
    messages: [
      { id: 'm1', from: 'client', text: 'Boa tarde! Tenho interesse em botox para o rosto.', time: new Date(Date.now() - 1000 * 60 * 90) },
      { id: 'm2', from: 'ai', text: 'Boa tarde, Carlos! O botox facial é indicado para suavizar rugas de expressão. Poderia me dizer qual região te incomoda mais?', time: new Date(Date.now() - 1000 * 60 * 88) },
      { id: 'm3', from: 'client', text: 'Testa e ao redor dos olhos.', time: new Date(Date.now() - 1000 * 60 * 80) },
      { id: 'm4', from: 'ai', text: 'Entendido! Tenho disponibilidade terça-feira às 14h com a Dra. Paula. Você confirma?', time: new Date(Date.now() - 1000 * 60 * 70) },
      { id: 'm5', from: 'client', text: 'Perfeito! Confirmado para terça às 14h.', time: new Date(Date.now() - 1000 * 60 * 45) },
    ],
  },
  {
    id: '3', clientName: 'Fernanda Lima', clientPhone: '+55 31 97654-3210', avatar: 'FL',
    status: 'abandoned', lastMessage: 'Vou pensar e retorno em breve, obrigada!',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 5), unread: 0, isAI: true,
    messages: [
      { id: 'm1', from: 'client', text: 'Qual o preço do pacote de peeling?', time: new Date(Date.now() - 1000 * 60 * 60 * 6) },
      { id: 'm2', from: 'ai', text: 'Olá, Fernanda! Nossos pacotes de peeling variam conforme o tipo e a quantidade de sessões. O pacote inicial com 3 sessões sai por R$450,00. Gostaria de agendar uma avaliação?', time: new Date(Date.now() - 1000 * 60 * 60 * 5.5) },
      { id: 'm3', from: 'client', text: 'Vou pensar e retorno em breve, obrigada!', time: new Date(Date.now() - 1000 * 60 * 60 * 5) },
    ],
  },
  {
    id: '4', clientName: 'Juliana Rocha', clientPhone: '+55 11 94567-8901', avatar: 'JR',
    status: 'in_progress', lastMessage: 'Quanto tempo dura cada sessão?',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 15), unread: 1, isAI: true,
    messages: [
      { id: 'm1', from: 'client', text: 'Vocês fazem tratamento para manchas no rosto?', time: new Date(Date.now() - 1000 * 60 * 20) },
      { id: 'm2', from: 'ai', text: 'Olá, Juliana! Sim, temos protocolos específicos para manchas com uso de laser e peelings químicos. Depende do tipo e profundidade das manchas. Podemos agendar uma avaliação gratuita para indicar o melhor tratamento!', time: new Date(Date.now() - 1000 * 60 * 18) },
      { id: 'm3', from: 'client', text: 'Quanto tempo dura cada sessão?', time: new Date(Date.now() - 1000 * 60 * 15) },
    ],
  },
  {
    id: '5', clientName: 'Roberto Alves', clientPhone: '+55 41 93456-7890', avatar: 'RA',
    status: 'converted', lastMessage: 'Ótimo! Até segunda então.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), unread: 0, isAI: false,
    messages: [
      { id: 'm1', from: 'client', text: 'Tenho interesse em emagrecimento. Quais tratamentos vocês oferecem?', time: new Date(Date.now() - 1000 * 60 * 60 * 3) },
      { id: 'm2', from: 'ai', text: 'Oi, Roberto! Trabalhamos com criolipólise, ultrassom cavitacional e radiofrequência. São excelentes para redução de medidas. Quer agendar uma avaliação?', time: new Date(Date.now() - 1000 * 60 * 60 * 2.5) },
      { id: 'm3', from: 'client', text: 'Sim! Segunda de manhã tem horário?', time: new Date(Date.now() - 1000 * 60 * 60 * 2.2) },
      { id: 'm4', from: 'ai', text: 'Segunda às 9h está disponível! Confirmo seu nome na agenda?', time: new Date(Date.now() - 1000 * 60 * 60 * 2.1) },
      { id: 'm5', from: 'client', text: 'Ótimo! Até segunda então.', time: new Date(Date.now() - 1000 * 60 * 60 * 2) },
    ],
  },
];

const statusConfig: any = {
  in_progress: { label: 'Em andamento', dot: 'bg-sky-400', text: 'text-sky-600' },
  converted:   { label: 'Convertida',   dot: 'bg-emerald-400', text: 'text-emerald-600' },
  abandoned:   { label: 'Encerrada',    dot: 'bg-slate-400', text: 'text-slate-500' },
};

const Conversations = () => {
  const [conversations] = useState(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>(MOCK_CONVERSATIONS[0].id);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const selected = conversations.find(c => c.id === selectedId);

  const filtered = conversations.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch =
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.clientPhone.includes(searchTerm);
    return matchFilter && matchSearch;
  });

  const totalConverted = conversations.filter(c => c.status === 'converted').length;
  const totalActive    = conversations.filter(c => c.status === 'in_progress').length;
  const convRate       = conversations.length > 0 ? Math.round((totalConverted / conversations.length) * 100) : 0;

  const formatTime = (date: Date) => {
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return format(date, 'dd/MM', { locale: ptBR });
  };

  return (
    // Full-height layout: remove all page padding, use 100% of remaining screen
    <div
      className="flex flex-col"
      style={{ height: '100vh' }}
    >
      {/* ── Top Bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-extrabold text-primary font-headline tracking-tight">Conversas</h2>
          <span className="text-xs text-on-surface-variant hidden sm:block">WhatsApp &amp; IA</span>
        </div>

        {/* Mini stats */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Ativas',      value: totalActive,       color: 'text-primary' },
            { label: 'Convertidas', value: totalConverted,    color: 'text-primary' },
            { label: 'Conversão',   value: `${convRate}%`,   color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-extrabold ${s.color} font-headline leading-none`}>{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            IA Ativa
          </span>
          <Button variant="outline" size="sm" aria-label="Configurar IA">
            <span className="material-symbols-outlined text-base">settings</span>
            <span className="hidden sm:inline">Configurar IA</span>
          </Button>
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Conversation List */}
        <div className="w-72 lg:w-80 flex-shrink-0 flex flex-col border-r border-slate-100 bg-white">

          {/* Search + Filter */}
          <div className="p-3 space-y-2 border-b border-slate-100 bg-slate-50/60">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-white border-slate-200 text-sm"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs font-bold text-slate-500 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-sm">
                <SelectItem value="all">Todas as conversas</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="converted">Convertidas</SelectItem>
                <SelectItem value="abandoned">Encerradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Count label */}
          <div className="px-4 py-2 bg-slate-50/40">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filtered.length} conversa{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Conversation Items — scrollable */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-center py-16 px-4">
                <span className="material-symbols-outlined text-slate-300 text-4xl">search_off</span>
                <p className="text-sm text-muted-foreground mt-2">Nenhuma conversa</p>
              </div>
            )}
            {filtered.map(conv => {
              const st = statusConfig[conv.status] || statusConfig.abandoned;
              const isActive = conv.id === selectedId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50/80 transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-primary/5 border-l-[3px] border-l-primary'
                      : 'hover:bg-slate-50/70 border-l-[3px] border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-black text-primary-foreground transition-all ${
                        isActive ? 'bg-primary' : 'bg-slate-400 group-hover:bg-slate-500 text-white'
                      }`}>
                        {conv.avatar}
                      </div>
                      {conv.isAI && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-sky-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="material-symbols-outlined text-white" style={{ fontSize: 9 }}>smart_toy</span>
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-sm font-bold truncate ${isActive ? 'text-primary' : 'text-slate-700'}`}>
                          {conv.clientName}
                        </span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{formatTime(conv.lastMessageTime)}</span>
                      </div>

                      <p className="text-xs text-slate-500 truncate leading-snug mb-1.5">{conv.lastMessage}</p>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] font-bold">
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          <span className={st.text}>{st.label}</span>
                        </span>
                        {conv.unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-secondary text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Chat Window */}
        {selected ? (
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/20">

            {/* Chat Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-black text-primary-foreground">
                  {selected.avatar}
                </div>
                <div>
                  <p className="font-black text-primary font-headline text-sm leading-tight">{selected.clientName}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-green-500" style={{ fontSize: 12 }}>phone_iphone</span>
                    <p className="text-[11px] text-muted-foreground">{selected.clientPhone}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selected.isAI ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-600 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_toy</span> IA respondendo
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-full">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person</span> Humano
                  </span>
                )}
                <Button variant="outline" size="sm" aria-label="Agendar">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                  <span className="hidden lg:inline">Agendar</span>
                </Button>
                <Button variant="outline" size="icon" aria-label="Ver perfil">
                  <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 16 }}>person</span>
                </Button>
                <Button variant="outline" size="icon" aria-label="Mais opções">
                  <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 16 }}>more_vert</span>
                </Button>
              </div>
            </div>

            {/* Messages — grow to fill remaining space */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {selected.messages.map((msg: any, i: number) => {
                const isClient = msg.from === 'client';
                const showDate = i === 0;
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center mb-3">
                        <span className="text-[10px] font-bold text-slate-400 bg-white/80 border border-slate-100 px-3 py-1 rounded-full shadow-sm">
                          {format(msg.time, "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-end gap-2 ${isClient ? 'justify-start' : 'justify-end'}`}>
                      {isClient && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 flex-shrink-0">
                          {selected.avatar}
                        </div>
                      )}
                      <div className={`max-w-[60%] lg:max-w-[55%]`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isClient
                            ? 'bg-white text-slate-700 rounded-bl-sm border border-slate-100/80'
                            : 'bg-primary text-white rounded-br-sm'
                        }`}>
                          {msg.text}
                        </div>
                        <p className={`text-[10px] text-slate-400 mt-0.5 ${isClient ? 'pl-1' : 'text-right pr-1'}`}>
                          {!isClient && <span className="font-bold text-sky-500 mr-1">{selected.isAI ? 'IA' : 'Você'}</span>}
                          {formatTime(msg.time)}
                        </p>
                      </div>
                      {!isClient && (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>smart_toy</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Bar */}
            <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" aria-label="Emoji">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>sentiment_satisfied</span>
                </Button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setNewMessage('')}
                    placeholder="Digite uma mensagem..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                  />
                </div>
                <Button variant="ghost" size="icon" aria-label="Anexar">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>attach_file</span>
                </Button>
                <Button size="icon" aria-label="Enviar">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Ao enviar, você assume o controle manual — a IA será pausada.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 bg-slate-50/20">
            <div className="w-20 h-20 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 36 }}>chat</span>
            </div>
            <p className="font-black text-slate-500 font-headline">Selecione uma conversa</p>
            <p className="text-sm text-muted-foreground max-w-xs">Clique em um contato da lista para visualizar o histórico</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;