import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { campaignsApi, leadsApi, clientsApi } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const safeFormat = (d: any, f: string = "dd/MM/yy 'às' HH:mm") => {
  try { return d ? format(new Date(d), f, { locale: ptBR }) : '—'; } catch { return '—'; }
};

const AUDIENCE_OPTIONS = [
  { value: 'all_leads', label: 'Todos os Leads', icon: 'person_add', desc: 'Enviar para todos os leads cadastrados' },
  { value: 'all_clients', label: 'Todos os Clientes', icon: 'group', desc: 'Enviar para todos os clientes cadastrados' },
  { value: 'both', label: 'Leads + Clientes', icon: 'groups', desc: 'Enviar para leads e clientes simultaneamente' },
  { value: 'leads_by_status', label: 'Leads por Etapa', icon: 'filter_alt', desc: 'Filtrar leads por etapa do funil' },
  { value: 'by_tags', label: 'Por Tags', icon: 'tag', desc: 'Filtrar contatos por tags específicas' },
];

const VARIABLES = [
  { key: '{{nome}}', label: 'Nome completo' },
  { key: '{{primeiro_nome}}', label: 'Primeiro nome' },
  { key: '{{telefone}}', label: 'Telefone' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600', icon: 'edit_note' },
  scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-700', icon: 'schedule' },
  sending: { label: 'Enviando...', color: 'bg-amber-100 text-amber-700', icon: 'send' },
  completed: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700', icon: 'check_circle' },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-700', icon: 'error' },
  canceled: { label: 'Cancelada', color: 'bg-slate-100 text-slate-500', icon: 'cancel' },
};

export default function Campaigns() {
  const { professional } = useAuth();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [viewCampaign, setViewCampaign] = useState<any>(null);
  const [isViewLoading, setIsViewLoading] = useState(false);

  // Create form state
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [previewRecipients, setPreviewRecipients] = useState(0);

  // Media attachments
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | ''>('');

  // Delay settings
  const [minDelay, setMinDelay] = useState(180);
  const [maxDelay, setMaxDelay] = useState(200);

  // Anti-ban variations
  const [randomize, setRandomize] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);
  const [newVariation, setNewVariation] = useState('');

  // Tags filter states
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagTarget, setTagTarget] = useState<'both' | 'leads' | 'clients'>('both');

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await campaignsApi.getAll({ pageSize: 50 });
      if (res.success) setCampaigns(res.data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Load available tags dynamically
  useEffect(() => {
    if (!professional?.id) return;
    (async () => {
      try {
        const tagsSet = new Set<string>();
        const [rLeads, rClients] = await Promise.all([
          leadsApi.getAll({ professionalId: Number(professional.id), pageSize: 1000 }),
          clientsApi.getAll({ pageSize: 1000 })
        ]);
        if (rLeads.success && rLeads.data) {
          rLeads.data.forEach((l: any) => {
            if (Array.isArray(l.tags)) l.tags.forEach((t: string) => { if (t) tagsSet.add(t); });
          });
        }
        if (rClients.success && rClients.data) {
          rClients.data.forEach((c: any) => {
            if (Array.isArray(c.tags)) c.tags.forEach((t: string) => { if (t) tagsSet.add(t); });
          });
        }
        setAvailableTags(Array.from(tagsSet).sort());
      } catch (e) {
        console.error('Error fetching tags:', e);
      }
    })();
  }, [professional?.id, campaigns]);

  // Preview count when audience changes
  useEffect(() => {
    if (!audienceType || !professional?.id) { setPreviewRecipients(0); return; }
    (async () => {
      try {
        let count = 0;
        if (audienceType === 'by_tags') {
          if (selectedTags.length === 0) { setPreviewRecipients(0); return; }
          if (tagTarget === 'leads' || tagTarget === 'both') {
            const r = await leadsApi.getAll({ professionalId: Number(professional.id), pageSize: 1000 });
            if (r.success) {
              count += (r.data || []).filter((l: any) => 
                l.phone && 
                Array.isArray(l.tags) && 
                l.tags.some((t: string) => selectedTags.includes(t))
              ).length;
            }
          }
          if (tagTarget === 'clients' || tagTarget === 'both') {
            const r = await clientsApi.getAll({ pageSize: 1000 });
            if (r.success) {
              count += (r.data || []).filter((c: any) => 
                c.phone && 
                Array.isArray(c.tags) && 
                c.tags.some((t: string) => selectedTags.includes(t))
              ).length;
            }
          }
        } else {
          if (audienceType === 'all_leads' || audienceType === 'leads_by_status' || audienceType === 'both') {
            const r = await leadsApi.getAll({ professionalId: Number(professional.id), pageSize: 1000 });
            if (r.success) count += (r.data || []).filter((l: any) => l.phone).length;
          }
          if (audienceType === 'all_clients' || audienceType === 'both') {
            const r = await clientsApi.getAll({ pageSize: 1000 });
            if (r.success) count += (r.data || []).filter((c: any) => c.phone).length;
          }
        }
        setPreviewRecipients(count);
      } catch { setPreviewRecipients(0); }
    })();
  }, [audienceType, professional?.id, selectedTags, tagTarget]);

  const resetForm = () => {
    setStep(1); setName(''); setMessage(''); setAudienceType(''); setSelectedTags([]); setTagTarget('both');
    setMediaUrl(''); setMediaType(''); setMinDelay(180); setMaxDelay(200); setRandomize(false); setVariations([]); setNewVariation('');
    setIsCreating(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !message.trim() || !audienceType) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return;
    }
    if (audienceType === 'by_tags' && selectedTags.length === 0) {
      toast({ title: 'Selecione pelo menos uma tag', variant: 'destructive' }); return;
    }
    setIsSending(true);
    try {
      const audienceFilter = audienceType === 'by_tags' ? { tags: selectedTags, target: tagTarget } : undefined;
      const res = await campaignsApi.create({ 
        name, 
        message, 
        audienceType, 
        audienceFilter,
        mediaUrl: mediaUrl.trim() || null,
        mediaType: mediaUrl.trim() ? mediaType : null,
        minDelay: Number(minDelay),
        maxDelay: Number(maxDelay),
        randomize,
        variations: randomize && variations.length > 0 ? variations : null
      });
      if (res.success) {
        toast({ title: 'Campanha criada!' });
        resetForm(); loadCampaigns();
      } else {
        toast({ title: res.error?.message || 'Erro ao criar', variant: 'destructive' });
      }
    } catch { toast({ title: 'Erro ao criar campanha', variant: 'destructive' }); }
    finally { setIsSending(false); }
  };

  const handleSend = async (id: number) => {
    try {
      const res = await campaignsApi.send(id);
      if (res.success) {
        toast({ title: '🚀 Campanha iniciada!' });
        loadCampaigns();
        // Poll progress
        const interval = setInterval(async () => {
          const p = await campaignsApi.getProgress(id);
          if (p.success && (p.data.status === 'completed' || p.data.status === 'failed')) {
            clearInterval(interval);
            loadCampaigns();
            toast({ title: p.data.status === 'completed' ? '✅ Campanha concluída!' : '❌ Campanha falhou' });
          } else { loadCampaigns(); }
        }, 3000);
      }
    } catch { toast({ title: 'Erro ao enviar', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await campaignsApi.delete(id);
      if (res.success) { toast({ title: 'Campanha excluída' }); loadCampaigns(); }
    } catch { toast({ title: 'Erro ao excluir', variant: 'destructive' }); }
  };

  const viewDetails = async (id: number) => {
    setIsViewLoading(true);
    try {
      const res = await campaignsApi.getById(id);
      if (res.success) setViewCampaign(res.data);
    } catch { toast({ title: 'Erro ao carregar detalhes', variant: 'destructive' }); }
    finally { setIsViewLoading(false); }
  };

  const insertVariable = (v: string) => setMessage(prev => prev + v);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-1">Dispare mensagens automáticas para leads e clientes via WhatsApp.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-secondary hover:bg-secondary/90 text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-secondary/20">
          <span className="material-symbols-outlined mr-2 text-lg">campaign</span>
          Nova Campanha
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: campaigns.length, icon: 'mail', color: 'text-blue-600 bg-blue-50' },
          { label: 'Enviadas', value: campaigns.filter(c => c.status === 'completed').length, icon: 'check_circle', color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rascunhos', value: campaigns.filter(c => c.status === 'draft').length, icon: 'edit_note', color: 'text-slate-600 bg-slate-50' },
          { label: 'Em envio', value: campaigns.filter(c => c.status === 'sending').length, icon: 'send', color: 'text-amber-600 bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <span className="material-symbols-outlined text-xl">{s.icon}</span>
            </div>
            <div><p className="text-2xl font-bold text-primary">{s.value}</p><p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-primary text-sm uppercase tracking-wider">Histórico de Campanhas</h2>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span><p className="mt-2 text-sm">Carregando...</p></div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200">campaign</span>
            <p className="mt-3 text-muted-foreground font-medium">Nenhuma campanha criada ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Crie sua primeira campanha de mensagens em massa!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {campaigns.map((c) => {
              const st = STATUS_MAP[c.status] || STATUS_MAP.draft;
              return (
                <div key={c.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${st.color}`}>
                    <span className="material-symbols-outlined text-xl">{st.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-primary text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.totalRecipients} destinatários • {safeFormat(c.createdAt)}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {c.status === 'sending' && (
                      <div className="flex items-center gap-2 mr-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${c.totalRecipients ? (c.sentCount / c.totalRecipients) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{c.sentCount}/{c.totalRecipients}</span>
                      </div>
                    )}
                    {c.status === 'completed' && (
                      <span className="text-xs text-muted-foreground font-mono mr-2">
                        ✅ {c.sentCount} • ❌ {c.failedCount}
                      </span>
                    )}
                    <Badge className={`${st.color} border-0 text-[10px] font-bold`}>{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => viewDetails(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors" title="Detalhes">
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    {c.status === 'draft' && (
                      <>
                        <button onClick={() => handleSend(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors" title="Enviar">
                          <span className="material-symbols-outlined text-lg">send</span>
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ CREATE CAMPAIGN DIALOG ═══ */}
      <Dialog open={isCreating} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white rounded-3xl">
          <div className="h-1 w-full bg-gradient-to-r from-secondary to-orange-400" />
          <div className="p-6 sm:p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-xl font-extrabold text-primary">
                {step === 1 ? '📋 Configurar Campanha' : step === 2 ? '✍️ Compor Mensagem' : '🚀 Confirmar Envio'}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-3">
                {[1,2,3].map(s => (
                  <div key={s} className={`h-1.5 rounded-full flex-1 transition-all ${s <= step ? 'bg-secondary' : 'bg-slate-100'}`} />
                ))}
              </div>
            </DialogHeader>

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nome da Campanha</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Promoção de Junho" className="rounded-xl h-11" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Audiência</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AUDIENCE_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setAudienceType(opt.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${audienceType === opt.value ? 'border-secondary bg-secondary/5' : 'border-slate-100 hover:border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-lg ${audienceType === opt.value ? 'text-secondary' : 'text-slate-400'}`}>{opt.icon}</span>
                          <span className="font-bold text-sm text-primary">{opt.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  {audienceType === 'by_tags' && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/60 space-y-4">
                      {/* Target Select */}
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Quem deve receber?</label>
                        <div className="flex gap-2">
                          {[
                            { value: 'both', label: 'Todos' },
                            { value: 'leads', label: 'Apenas Leads' },
                            { value: 'clients', label: 'Apenas Clientes' },
                          ].map((t) => (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => setTagTarget(t.value as any)}
                              className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                                tagTarget === t.value
                                  ? 'bg-secondary text-white border-secondary shadow-md shadow-secondary/15'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tag list */}
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Selecione as Tags</label>
                        {availableTags.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhuma tag cadastrada no sistema.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-xl border border-slate-100">
                            {availableTags.map((tag) => {
                              const isSelected = selectedTags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() =>
                                    setSelectedTags((prev) =>
                                      isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20'
                                      : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    {isSelected ? 'check_box' : 'add'}
                                  </span>
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {audienceType && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-secondary">group</span>
                      <strong>{previewRecipients}</strong> destinatários com telefone válido
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => { if (name && audienceType) setStep(2); else toast({ title: 'Preencha todos os campos', variant: 'destructive' }); }}
                    className="bg-primary text-white rounded-xl px-6 h-10 font-bold">
                    Próximo <span className="material-symbols-outlined text-sm ml-1">chevron_right</span>
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Text Message Input */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Mensagem Principal</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                    placeholder="Olá {{primeiro_nome}}, temos uma novidade especial para você! ✨"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary" />
                </div>

                {/* Variables */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Variáveis Dinâmicas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map(v => (
                      <button key={v.key} onClick={() => insertVariable(v.key)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono hover:border-secondary hover:bg-secondary/5 transition-colors">
                        {v.key} <span className="text-muted-foreground ml-1">({v.label})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media Attachment section */}
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wide">
                    <span className="material-symbols-outlined text-base">attach_file</span>
                    Anexar Mídia (Opcional)
                  </div>
                  <div>
                    <Input 
                      value={mediaUrl} 
                      onChange={e => {
                        const val = e.target.value;
                        setMediaUrl(val);
                        if (val && !mediaType) setMediaType('image');
                      }} 
                      placeholder="URL do arquivo (ex: https://site.com/imagem.png)" 
                      className="rounded-xl h-10 bg-white" 
                    />
                  </div>
                  {mediaUrl.trim() !== '' && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase">Formato do Arquivo</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'image', label: '🖼️ Imagem' },
                          { value: 'video', label: '🎥 Vídeo' },
                          { value: 'audio', label: '🔊 Áudio' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setMediaType(opt.value as any)}
                            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                              mediaType === opt.value
                                ? 'bg-secondary text-white border-secondary shadow-md shadow-secondary/15'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Anti-ban & Delay settings */}
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wide">
                      <span className="material-symbols-outlined text-base text-[#F97316]">shield</span>
                      Segurança & Intervalo Seguro (Anti-Ban)
                    </div>
                  </div>

                  {/* Delay range inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Atraso Mínimo (segundos)</label>
                      <Input 
                        type="number" 
                        value={minDelay === 0 ? '' : minDelay} 
                        onChange={e => setMinDelay(e.target.value === '' ? 0 : Number(e.target.value))} 
                        placeholder="Ex: 180" 
                        className="rounded-xl h-10 bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Atraso Máximo (segundos)</label>
                      <Input 
                        type="number" 
                        value={maxDelay === 0 ? '' : maxDelay} 
                        onChange={e => setMaxDelay(e.target.value === '' ? 0 : Number(e.target.value))} 
                        placeholder="Ex: 200" 
                        className="rounded-xl h-10 bg-white" 
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic mt-1">
                    *Recomendado: 180 a 200 segundos por envio para máxima proteção da sua linha.
                  </p>

                  <div className="border-t border-slate-200/60 pt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="chk-randomize" 
                        checked={randomize} 
                        onChange={e => setRandomize(e.target.checked)} 
                        className="w-4 h-4 rounded border-slate-300 text-secondary focus:ring-secondary accent-[#F97316]" 
                      />
                      <label htmlFor="chk-randomize" className="text-xs font-bold text-slate-700 cursor-pointer">
                        Randomizar variações de texto (Evita bloqueio do WhatsApp)
                      </label>
                    </div>

                    {randomize && (
                      <div className="space-y-2 mt-2 bg-white p-3 rounded-xl border border-slate-100">
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase">Adicionar variações da mensagem</label>
                        <div className="flex gap-2">
                          <Input 
                            value={newVariation} 
                            onChange={e => setNewVariation(e.target.value)} 
                            placeholder="Adicione outra variação do texto..." 
                            className="rounded-lg h-9 bg-slate-50 border-slate-200 text-xs" 
                          />
                          <Button 
                            type="button"
                            onClick={() => {
                              if (newVariation.trim()) {
                                setVariations([...variations, newVariation.trim()]);
                                setNewVariation('');
                              }
                            }}
                            className="bg-[#F97316] text-white hover:bg-orange-600 rounded-lg px-3 h-9 text-xs font-bold"
                          >
                            Add
                          </Button>
                        </div>

                        {variations.length > 0 && (
                          <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
                            {variations.map((v, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs">
                                <span className="truncate flex-1 pr-2 text-slate-600 font-medium">{v}</span>
                                <button 
                                  type="button" 
                                  onClick={() => setVariations(variations.filter((_, i) => i !== idx))} 
                                  className="text-red-500 hover:text-red-700 font-bold"
                                >
                                  ✖
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 font-semibold italic mt-1">
                          *Adicione mensagens com palavras ou saudações diferentes. O sistema enviará aleatoriamente uma delas para cada lead.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {message && (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wide mb-1.5">Preview da Mensagem Principal</p>
                    <p className="text-sm text-emerald-800 whitespace-pre-wrap">
                      {message.replace(/\{\{nome\}\}/gi, 'João da Silva').replace(/\{\{primeiro_nome\}\}/gi, 'João').replace(/\{\{telefone\}\}/gi, '(11) 99999-9999')}
                    </p>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl h-10">
                    <span className="material-symbols-outlined text-sm mr-1">chevron_left</span> Voltar
                  </Button>
                  <Button onClick={() => { if (message.trim()) setStep(3); else toast({ title: 'Escreva a mensagem', variant: 'destructive' }); }}
                    className="bg-primary text-white rounded-xl px-6 h-10 font-bold">
                    Próximo <span className="material-symbols-outlined text-sm ml-1">chevron_right</span>
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Campanha</span><span className="font-bold text-primary">{name}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Audiência</span><span className="font-bold text-primary">{AUDIENCE_OPTIONS.find(a => a.value === audienceType)?.label}</span></div>
                  {audienceType === 'by_tags' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tags selecionadas</span>
                      <span className="font-bold text-primary">{selectedTags.join(', ')} ({tagTarget === 'both' ? 'Todos' : tagTarget === 'leads' ? 'Apenas Leads' : 'Apenas Clientes'})</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Destinatários</span><span className="font-bold text-primary">{previewRecipients} contatos</span></div>
                  
                  {/* Media confirmation */}
                  {mediaUrl.trim() && (
                    <div className="flex justify-between text-sm bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-muted-foreground">Anexo de Mídia ({mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : 'Áudio'})</span>
                      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-secondary underline truncate max-w-xs">{mediaUrl}</a>
                    </div>
                  )}

                  {/* Delay confirmation */}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Intervalo de Envio</span><span className="font-bold text-primary">{minDelay}s a {maxDelay}s (aleatório)</span></div>

                  {/* Variations confirmation */}
                  {randomize && variations.length > 0 && (
                    <div className="text-sm space-y-1">
                      <span className="text-muted-foreground">Variações Anti-Ban</span>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-xs text-slate-500 max-h-24 overflow-y-auto space-y-1">
                        <p className="font-bold text-slate-700">Mensagem 1 (Principal):</p>
                        <p className="italic truncate mb-2">{message}</p>
                        {variations.map((v, i) => (
                          <div key={i}>
                            <p className="font-bold text-slate-700">Mensagem {i + 2}:</p>
                            <p className="italic truncate">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <hr className="border-slate-200" />
                  <div><p className="text-xs text-muted-foreground mb-1">Mensagem Principal:</p><p className="text-sm whitespace-pre-wrap bg-white rounded-lg p-3 border border-slate-100">{message}</p></div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5">info</span>
                  <p className="text-xs text-amber-700">A campanha será salva como rascunho. Você poderá enviar depois clicando no botão de envio na lista.</p>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl h-10">
                    <span className="material-symbols-outlined text-sm mr-1">chevron_left</span> Voltar
                  </Button>
                  <Button onClick={handleCreate} disabled={isSending}
                    className="bg-secondary hover:bg-secondary/90 text-white rounded-xl px-8 h-11 font-bold shadow-lg shadow-secondary/20">
                    {isSending ? <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span> : <span className="material-symbols-outlined mr-2">campaign</span>}
                    Criar Campanha
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ VIEW CAMPAIGN DIALOG ═══ */}
      <Dialog open={!!viewCampaign} onOpenChange={(o) => !o && setViewCampaign(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 bg-white rounded-3xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-secondary to-orange-400" />
          {viewCampaign && (
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[80vh]">
              <DialogHeader className="mb-5">
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-xl font-extrabold text-primary">{viewCampaign.name}</DialogTitle>
                  <Badge className={`${(STATUS_MAP[viewCampaign.status] || STATUS_MAP.draft).color} border-0 text-[10px] font-bold`}>
                    {(STATUS_MAP[viewCampaign.status] || STATUS_MAP.draft).label}
                  </Badge>
                </div>
                {viewCampaign.audienceType === 'by_tags' && viewCampaign.audienceFilter?.tags && (
                  <div className="mt-2 flex flex-wrap gap-1 items-center">
                    <span className="text-xs text-muted-foreground font-semibold mr-1">Tags filtradas:</span>
                    {viewCampaign.audienceFilter.tags.map((t: string) => (
                      <Badge key={t} variant="secondary" className="text-[10px] bg-orange-50 text-secondary border border-orange-100/50 hover:bg-orange-50">{t}</Badge>
                    ))}
                    <span className="text-[10px] text-muted-foreground font-bold uppercase ml-2 bg-slate-100 px-2 py-0.5 rounded">
                      {viewCampaign.audienceFilter.target === 'both' ? 'Todos' : viewCampaign.audienceFilter.target === 'leads' ? 'Apenas Leads' : 'Apenas Clientes'}
                    </span>
                  </div>
                )}
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total', value: viewCampaign.totalRecipients, icon: 'group', color: 'bg-blue-50 text-blue-600' },
                  { label: 'Enviados', value: viewCampaign.sentCount, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Falhas', value: viewCampaign.failedCount, icon: 'error', color: 'bg-red-50 text-red-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                    <span className={`material-symbols-outlined text-xl ${s.color.split(' ')[1]}`}>{s.icon}</span>
                    <p className="text-lg font-bold text-primary">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Mensagem Principal</p>
                  <p className="text-sm whitespace-pre-wrap">{viewCampaign.message}</p>
                </div>

                {/* Render media attachments if any */}
                {viewCampaign.mediaUrl && (
                  <div className="border-t border-slate-200/60 pt-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Mídia Anexada ({viewCampaign.mediaType === 'image' ? 'Imagem' : viewCampaign.mediaType === 'video' ? 'Vídeo' : 'Áudio'})</p>
                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-100/80">
                      <span className="material-symbols-outlined text-secondary text-lg">
                        {viewCampaign.mediaType === 'image' ? 'image' : viewCampaign.mediaType === 'video' ? 'video_file' : 'volume_up'}
                      </span>
                      <a href={viewCampaign.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-secondary hover:underline truncate max-w-xs sm:max-w-md">
                        {viewCampaign.mediaUrl}
                      </a>
                    </div>
                  </div>
                )}

                {/* Render anti-ban security parameters */}
                <div className="border-t border-slate-200/60 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Configurações de Atraso</span>
                    <span className="font-semibold text-slate-700">{viewCampaign.minDelay || 180} a {viewCampaign.maxDelay || 200} segundos por contato</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Randomização de Textos</span>
                    <span className="font-semibold text-slate-700">
                      {viewCampaign.randomize ? '✅ Ativado' : '❌ Desativado'}
                    </span>
                  </div>
                </div>

                {viewCampaign.randomize && viewCampaign.variations && Array.isArray(viewCampaign.variations) && viewCampaign.variations.length > 0 && (
                  <div className="border-t border-slate-200/60 pt-3 space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Variações Alternadas</span>
                    <div className="bg-white p-2 rounded-lg border border-slate-100 space-y-1">
                      {viewCampaign.variations.map((v: string, idx: number) => (
                        <p key={idx} className="text-slate-600 truncate italic">Variação {idx + 1}: "{v}"</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {viewCampaign.recipients?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Destinatários ({viewCampaign.recipients.length})</p>
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0"><tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase">Nome</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase">Telefone</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase">Tipo</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-muted-foreground uppercase">Status</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {viewCampaign.recipients.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{r.phone}</td>
                            <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{r.sourceType === 'lead' ? 'Lead' : 'Cliente'}</Badge></td>
                            <td className="px-3 py-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                r.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                                r.status === 'failed' ? 'bg-red-100 text-red-700' :
                                r.status === 'skipped' ? 'bg-slate-100 text-slate-500' :
                                'bg-amber-100 text-amber-700'
                              }`}>{r.status === 'sent' ? 'Enviado' : r.status === 'failed' ? 'Falhou' : r.status === 'skipped' ? 'Ignorado' : 'Pendente'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
