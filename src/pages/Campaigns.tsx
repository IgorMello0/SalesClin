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
  { value: 'spreadsheet', label: 'Planilha', icon: 'table_chart', desc: 'Importar contatos por CSV ou TSV' },
];

const VARIABLES = [
  { key: '{{nome}}', label: 'Nome completo' },
  { key: '{{primeiro_nome}}', label: 'Primeiro nome' },
  { key: '{{telefone}}', label: 'Telefone' },
  { key: '{{data}}', label: 'Data da planilha' },
  { key: '{{hora}}', label: 'Hora da planilha' },
  { key: '{{especialista}}', label: 'Dr/especialista da planilha' },
  { key: '{{proxima_data}}', label: 'Data da próxima consulta' },
  { key: '{{proxima_hora}}', label: 'Hora da próxima consulta' },
  { key: '{{ultima_data}}', label: 'Data da última consulta' },
  { key: '{{ultima_hora}}', label: 'Hora da última consulta' },
];

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600', icon: 'edit_note' },
  scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-700', icon: 'schedule' },
  sending: { label: 'Enviando...', color: 'bg-amber-100 text-amber-700', icon: 'send' },
  completed: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700', icon: 'check_circle' },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-700', icon: 'error' },
  canceled: { label: 'Cancelada', color: 'bg-slate-100 text-slate-500', icon: 'cancel' },
};

const SPREADSHEET_CONTACT_LIMIT = 5000;
const SPREADSHEET_TEMPLATE_FILE = 'modelo-disparo-sellclin.csv';
const SPREADSHEET_TEMPLATE_ROWS = [
  ['nome', 'telefone', 'data', 'hora', 'especialista'],
  ['Joao Silva', '5511999999999', '15/07/2026', '14:30', 'Dra. Ana'],
  ['Maria Souza', '5511988887777', '16/07/2026', '09:00', 'Dr. Pedro'],
  ['Clinica Exemplo', '11977776666', '17/07/2026', '11:15', 'Equipe SellClin'],
];

type SpreadsheetContact = {
  name: string;
  phone: string;
  date?: string;
  time?: string;
  specialist?: string;
};

type SpreadsheetStats = {
  totalImported: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  truncated: boolean;
  missingPhoneColumn?: boolean;
};

function splitSpreadsheetLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseSpreadsheetContacts(text: string) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const emptyStats: SpreadsheetStats = {
    totalImported: Math.max(0, lines.length - 1),
    validRows: 0,
    duplicateRows: 0,
    invalidRows: 0,
    truncated: false,
  };
  if (lines.length < 2) return { contacts: [], stats: emptyStats };

  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
  const headers = splitSpreadsheetLine(firstLine, delimiter)
    .map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const nameIndex = headers.findIndex(h => ['nome', 'name', 'cliente', 'contato'].includes(h));
  const phoneIndex = headers.findIndex(h => ['telefone', 'phone', 'whatsapp', 'celular', 'numero'].includes(h));
  const dateIndex = headers.findIndex(h => ['data', 'date', 'dia', 'data_agendamento', 'data_consulta', 'consulta_data'].includes(h));
  const timeIndex = headers.findIndex(h => ['hora', 'horario', 'time', 'hora_agendamento', 'hora_consulta', 'consulta_hora'].includes(h));
  const specialistIndex = headers.findIndex(h => ['especialista', 'profissional', 'dr', 'dra', 'doutor', 'doutora', 'medico', 'medica', 'doctor'].includes(h));

  if (phoneIndex === -1) {
    return { contacts: [], stats: { ...emptyStats, missingPhoneColumn: true } };
  }

  const seen = new Set<string>();
  const contacts: SpreadsheetContact[] = [];
  const dataLines = lines.slice(1);
  const rowsToProcess = dataLines.slice(0, SPREADSHEET_CONTACT_LIMIT);
  let duplicateRows = 0;
  let invalidRows = 0;

  for (const line of rowsToProcess) {
    const columns = splitSpreadsheetLine(line, delimiter);
    const phone = String(columns[phoneIndex] || '').replace(/\D/g, '');
    const name = nameIndex >= 0 ? String(columns[nameIndex] || '').trim() : '';
    const date = dateIndex >= 0 ? String(columns[dateIndex] || '').trim() : '';
    const time = timeIndex >= 0 ? String(columns[timeIndex] || '').trim() : '';
    const specialist = specialistIndex >= 0 ? String(columns[specialistIndex] || '').trim() : '';
    if (!phone) {
      invalidRows++;
      continue;
    }
    if (seen.has(phone)) {
      duplicateRows++;
      continue;
    }
    seen.add(phone);
    contacts.push({ name: name || 'Contato', phone, date, time, specialist });
  }

  return {
    contacts,
    stats: {
      totalImported: dataLines.length,
      validRows: contacts.length,
      duplicateRows,
      invalidRows,
      truncated: dataLines.length > SPREADSHEET_CONTACT_LIMIT,
    },
  };
}

function downloadSpreadsheetTemplate() {
  const csv = SPREADSHEET_TEMPLATE_ROWS
    .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = SPREADSHEET_TEMPLATE_FILE;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Campaigns() {
  const { professional } = useAuth();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [viewCampaign, setViewCampaign] = useState<any>(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; type: 'image' | 'video' | 'audio' }[]>([]);

  // Delay settings
  const [minDelay, setMinDelay] = useState(180);
  const [maxDelay, setMaxDelay] = useState(200);

  // Anti-ban variations
  const [randomize, setRandomize] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);
  const [newVariation, setNewVariation] = useState('');
  const [useMetaTemplate, setUseMetaTemplate] = useState(false);
  const [metaTemplateName, setMetaTemplateName] = useState('');
  const [metaTemplateLanguage, setMetaTemplateLanguage] = useState('pt_BR');
  const [metaTemplateParameters, setMetaTemplateParameters] = useState('{{nome}}');

  // Tags filter states
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagTarget, setTagTarget] = useState<'both' | 'leads' | 'clients'>('both');
  const [spreadsheetContacts, setSpreadsheetContacts] = useState<SpreadsheetContact[]>([]);
  const [spreadsheetFileName, setSpreadsheetFileName] = useState('');
  const [spreadsheetStats, setSpreadsheetStats] = useState<SpreadsheetStats | null>(null);

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
          leadsApi.getAll({ pageSize: 1000 }),
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
    if (audienceType === 'spreadsheet') {
      setPreviewRecipients(spreadsheetContacts.length);
      return;
    }
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
  }, [audienceType, professional?.id, selectedTags, tagTarget, spreadsheetContacts.length]);

  const resetForm = () => {
    setStep(1); setName(''); setMessage(''); setAudienceType(''); setSelectedTags([]); setTagTarget('both');
    setMediaUrl(''); setMediaType(''); setMinDelay(180); setMaxDelay(200); setRandomize(false); setVariations([]); setNewVariation('');
    setUseMetaTemplate(false); setMetaTemplateName(''); setMetaTemplateLanguage('pt_BR'); setMetaTemplateParameters('{{nome}}');
    setAttachments([]); setSpreadsheetContacts([]); setSpreadsheetFileName(''); setSpreadsheetStats(null);
    setIsCreating(false);
  };

  const handleSpreadsheetFile = async (file?: File | null) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.tsv') && !lowerName.endsWith('.txt')) {
      toast({ title: 'Use CSV ou TSV', description: 'Exporte a planilha com colunas nome, telefone, data, hora e especialista.', variant: 'destructive' });
      return;
    }

    const text = await file.text();
    const { contacts, stats } = parseSpreadsheetContacts(text);
    if (stats.missingPhoneColumn) {
      toast({ title: 'Coluna de telefone ausente', description: 'Use uma coluna chamada telefone, whatsapp, celular, phone ou numero.', variant: 'destructive' });
      return;
    }
    if (contacts.length === 0) {
      toast({ title: 'Nenhum contato encontrado', description: 'A planilha precisa ter uma coluna telefone, whatsapp ou celular.', variant: 'destructive' });
      return;
    }

    setSpreadsheetContacts(contacts);
    setSpreadsheetFileName(file.name);
    setSpreadsheetStats(stats);
    setPreviewRecipients(contacts.length);
    toast({ title: 'Planilha importada', description: `${contacts.length} contatos validos. ${stats.duplicateRows} duplicados e ${stats.invalidRows} invalidos ignorados.` });
  };

  const handleCreate = async () => {
    if (!name.trim() || !message.trim() || !audienceType) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return;
    }
    if (audienceType === 'by_tags' && selectedTags.length === 0) {
      toast({ title: 'Selecione pelo menos uma tag', variant: 'destructive' }); return;
    }
    if (audienceType === 'spreadsheet' && spreadsheetContacts.length === 0) {
      toast({ title: 'Importe uma planilha', description: 'Use CSV ou TSV com colunas nome, telefone, data, hora e especialista.', variant: 'destructive' }); return;
    }
    if (useMetaTemplate && !metaTemplateName.trim()) {
      toast({ title: 'Informe o template da Meta', description: 'Use o nome exato do template aprovado no WhatsApp Manager.', variant: 'destructive' }); return;
    }
    setIsSending(true);
    try {
      const baseAudienceFilter = audienceType === 'by_tags'
        ? { tags: selectedTags, target: tagTarget }
        : audienceType === 'spreadsheet'
          ? { source: spreadsheetFileName, contacts: spreadsheetContacts, stats: spreadsheetStats }
          : undefined;
      const metaTemplate = useMetaTemplate
        ? {
            enabled: true,
            name: metaTemplateName.trim(),
            languageCode: metaTemplateLanguage.trim() || 'pt_BR',
            parameters: metaTemplateParameters
              .split(',')
              .map(item => item.trim())
              .filter(Boolean),
          }
        : undefined;
      const audienceFilter = metaTemplate
        ? { ...(baseAudienceFilter || {}), metaTemplate }
        : baseAudienceFilter;
      
      let finalMediaUrl = null;
      let finalMediaType = null;

      if (attachments.length > 0) {
        if (attachments.length === 1) {
          finalMediaUrl = attachments[0].url;
          finalMediaType = attachments[0].type;
        } else {
          finalMediaUrl = JSON.stringify(attachments);
          finalMediaType = attachments[0].type;
        }
      } else if (mediaUrl.trim()) {
        finalMediaUrl = mediaUrl.trim();
        finalMediaType = mediaType || 'image';
      }

      const res = await campaignsApi.create({ 
        name, 
        message, 
        audienceType, 
        audienceFilter,
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
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
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="font-bold text-primary text-sm uppercase tracking-wider">Histórico de Campanhas</h2>
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <Input 
              placeholder="Buscar campanha..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9 h-9 rounded-xl text-xs bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span><p className="mt-2 text-sm">Carregando...</p></div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200">campaign</span>
            <p className="mt-3 text-muted-foreground font-medium">Nenhuma campanha criada ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Crie sua primeira campanha de mensagens em massa!</p>
          </div>
        ) : campaigns.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200">search_off</span>
            <p className="mt-3 text-muted-foreground font-medium">Nenhuma campanha encontrada</p>
            <p className="text-xs text-muted-foreground mt-1">Tente buscar por outro termo ou nome.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {campaigns
              .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((c) => {
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
                        <button onClick={() => handleSend(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors" title="Enviar">
                          <span className="material-symbols-outlined text-lg">send</span>
                        </button>
                      )}
                      {c.status !== 'sending' && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`Deseja realmente excluir a campanha "${c.name}"? Esta ação é irreversível.`)) {
                              handleDelete(c.id);
                            }
                          }} 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" 
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
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
                  {audienceType === 'spreadsheet' && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100/60 space-y-4">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Arquivo da planilha</label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={downloadSpreadsheetTemplate}
                            className="h-8 rounded-lg text-[11px] font-bold"
                          >
                            <span className="material-symbols-outlined mr-1 text-sm">download</span>
                            Baixar modelo
                          </Button>
                        </div>
                        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-4">
                          <input
                            type="file"
                            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                            onChange={e => handleSpreadsheetFile(e.target.files?.[0])}
                            className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-primary/90"
                          />
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Baixe o modelo, preencha os contatos e salve como CSV. Use <strong>nome</strong>, <strong>telefone</strong>, <strong>data</strong>, <strong>hora</strong> e <strong>especialista</strong>.
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                            Exemplo: nome;telefone;data;hora;especialista
                          </p>
                        </div>
                      </div>

                      {spreadsheetContacts.length > 0 && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
                          <div className="flex items-center gap-2 font-bold">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            {spreadsheetContacts.length} contatos importados de {spreadsheetFileName}
                          </div>
                          {spreadsheetStats && (
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                              <span className="rounded-lg bg-white/70 px-2 py-1 text-slate-700">
                                {spreadsheetStats.totalImported} linhas
                              </span>
                              <span className="rounded-lg bg-white/70 px-2 py-1 text-emerald-700">
                                {spreadsheetStats.validRows} validos
                              </span>
                              <span className="rounded-lg bg-white/70 px-2 py-1 text-amber-700">
                                {spreadsheetStats.duplicateRows} duplicados
                              </span>
                              <span className="rounded-lg bg-white/70 px-2 py-1 text-red-700">
                                {spreadsheetStats.invalidRows} invalidos
                              </span>
                            </div>
                          )}
                          {spreadsheetStats?.truncated && (
                            <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                              A planilha passou de {SPREADSHEET_CONTACT_LIMIT} contatos. Apenas os primeiros {SPREADSHEET_CONTACT_LIMIT} foram considerados.
                            </p>
                          )}
                          <div className="mt-2 max-h-24 overflow-y-auto rounded-lg bg-white/70 p-2 text-[11px] text-slate-600">
                            {spreadsheetContacts.slice(0, 5).map((contact, index) => (
                              <div key={`${contact.phone}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 py-1">
                                <span className="truncate font-semibold">{contact.name}</span>
                                <span className="font-mono">{contact.phone}</span>
                                {(contact.date || contact.time || contact.specialist) && (
                                  <span className="col-span-2 truncate text-[10px] text-slate-500">
                                    {[contact.date, contact.time, contact.specialist].filter(Boolean).join(' - ')}
                                  </span>
                                )}
                              </div>
                            ))}
                            {spreadsheetContacts.length > 5 && (
                              <div className="pt-1 text-muted-foreground">+ {spreadsheetContacts.length - 5} contatos</div>
                            )}
                          </div>
                        </div>
                      )}
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
                  <Button onClick={() => {
                    if (!name || !audienceType) {
                      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
                      return;
                    }
                    if (audienceType === 'spreadsheet' && spreadsheetContacts.length === 0) {
                      toast({ title: 'Importe uma planilha', variant: 'destructive' });
                      return;
                    }
                    setStep(2);
                  }}
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

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="chk-meta-template"
                      checked={useMetaTemplate}
                      onChange={e => setUseMetaTemplate(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-blue-200 text-blue-600 focus:ring-blue-500 accent-blue-600"
                    />
                    <label htmlFor="chk-meta-template" className="cursor-pointer">
                      <span className="block text-xs font-bold text-blue-900 uppercase tracking-wide">
                        Usar template aprovado da Meta
                      </span>
                      <span className="block text-xs text-blue-700 leading-relaxed mt-0.5">
                        Necessario para iniciar conversas/campanhas pela API Oficial fora da janela de 24h.
                      </span>
                    </label>
                  </div>

                  {useMetaTemplate && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Nome do template</label>
                        <Input
                          value={metaTemplateName}
                          onChange={e => setMetaTemplateName(e.target.value)}
                          placeholder="ex: confirmacao_agendamento"
                          className="rounded-xl h-10 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Idioma</label>
                        <Input
                          value={metaTemplateLanguage}
                          onChange={e => setMetaTemplateLanguage(e.target.value)}
                          placeholder="pt_BR"
                          className="rounded-xl h-10 bg-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-blue-500 uppercase mb-1">Parametros do corpo, em ordem</label>
                        <Input
                          value={metaTemplateParameters}
                          onChange={e => setMetaTemplateParameters(e.target.value)}
                          placeholder="{{nome}}, {{data}}, {{hora}}, {{especialista}}"
                          className="rounded-xl h-10 bg-white"
                        />
                        <p className="mt-1 text-[10px] text-blue-600 leading-relaxed">
                          Separe por virgula. A quantidade precisa bater com as variaveis do template aprovado na Meta.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Attachment section */}
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wide">
                      <span className="material-symbols-outlined text-base text-[#F97316]">attach_file</span>
                      Anexar Mídias (Múltiplas Opcionais)
                    </div>
                    {attachments.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setAttachments([])}
                        className="text-[10px] font-bold text-red-500 hover:underline uppercase"
                      >
                        Limpar Todos
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Upload de Arquivo</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          id="campaign-file-input"
                          accept="image/*,audio/*,video/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setIsUploadingMedia(true);
                            try {
                              const res = await campaignsApi.uploadMedia(file);
                              if (res.success && res.data) {
                                let detectedType: 'image' | 'video' | 'audio' = 'image';
                                if (file.type.startsWith('audio/')) {
                                  detectedType = 'audio';
                                } else if (file.type.startsWith('video/')) {
                                  detectedType = 'video';
                                }
                                setAttachments(prev => [...prev, { url: res.data.url, type: detectedType }]);
                                toast({ title: 'Upload concluído com sucesso!' });
                              }
                            } catch (err: any) {
                              toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
                            } finally {
                              setIsUploadingMedia(false);
                            }
                          }}
                          className="hidden"
                          disabled={isUploadingMedia}
                        />
                        <Button
                          type="button"
                          onClick={() => document.getElementById('campaign-file-input')?.click()}
                          disabled={isUploadingMedia}
                          className="w-full h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-center gap-2"
                        >
                          {isUploadingMedia ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm text-[#F97316]">cloud_upload</span>
                              Selecionar Arquivo
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ou cole uma URL pública</label>
                      <div className="flex gap-1.5">
                        <Input 
                          value={mediaUrl} 
                          onChange={e => {
                            const val = e.target.value;
                            setMediaUrl(val);
                            if (val && !mediaType) setMediaType('image');
                          }} 
                          placeholder="Ex: https://site.com/foto.jpg" 
                          className="rounded-xl h-10 bg-white" 
                          disabled={isUploadingMedia}
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (mediaUrl.trim()) {
                              setAttachments(prev => [...prev, { url: mediaUrl.trim(), type: mediaType || 'image' }]);
                              setMediaUrl('');
                              setMediaType('');
                            }
                          }}
                          disabled={!mediaUrl.trim()}
                          className="bg-primary hover:bg-primary/95 text-white h-10 rounded-xl px-3 font-bold"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {mediaUrl.trim() !== '' && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase">Formato do Arquivo a adicionar</label>
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

                  {/* List of currently attached media files */}
                  {attachments.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase">Arquivos Anexados ({attachments.length})</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {attachments.map((att, index) => (
                          <div key={index} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              {att.type === 'image' && (
                                <img src={att.url.startsWith('/') ? (import.meta.env.VITE_API_URL || 'http://localhost:4000') + att.url : att.url} className="w-8 h-8 rounded object-cover border border-slate-100 flex-shrink-0" />
                              )}
                              {att.type === 'video' && (
                                <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-1.5 rounded text-sm">video_file</span>
                              )}
                              {att.type === 'audio' && (
                                <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-1.5 rounded text-sm">volume_up</span>
                              )}
                              <div className="truncate flex flex-col">
                                <span className="text-[11px] text-slate-700 font-bold leading-none truncate max-w-[130px] sm:max-w-[160px]">
                                  Anexo {index + 1}
                                </span>
                                <span className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">
                                  {att.type === 'image' ? 'Imagem' : att.type === 'video' ? 'Vídeo' : 'Áudio'}
                                </span>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== index))}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex-shrink-0"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
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
                      {message
                        .replace(/\{\{nome\}\}/gi, 'João da Silva')
                        .replace(/\{\{primeiro_nome\}\}/gi, 'João')
                        .replace(/\{\{telefone\}\}/gi, '(11) 99999-9999')
                        .replace(/\{\{data\}\}/gi, '15/07/2026')
                        .replace(/\{\{hora\}\}/gi, '14:30')
                        .replace(/\{\{especialista\}\}/gi, 'Dra. Ana')
                        .replace(/\{\{dr\}\}/gi, 'Dra. Ana')}
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
                  {audienceType === 'spreadsheet' && (
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Planilha</span>
                      <span className="font-bold text-primary text-right">{spreadsheetFileName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Destinatários</span><span className="font-bold text-primary">{previewRecipients} contatos</span></div>
                  
                  {/* Media confirmation */}
                  {attachments.length > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block">Mídias Anexadas ({attachments.length}):</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-white p-2.5 rounded-xl border border-slate-100">
                        {attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 min-w-0">
                            <span className="material-symbols-outlined text-sm text-secondary">
                              {att.type === 'image' ? 'image' : att.type === 'video' ? 'video_file' : 'volume_up'}
                            </span>
                            <span className="truncate max-w-[150px] font-medium">Anexo {idx + 1} ({att.type === 'image' ? 'Imagem' : att.type === 'video' ? 'Vídeo' : 'Áudio'})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : mediaUrl.trim() ? (
                    <div className="flex justify-between text-sm bg-white p-2 rounded-lg border border-slate-100">
                      <span className="text-muted-foreground">Anexo de Mídia ({mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : 'Áudio'})</span>
                      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-secondary underline truncate max-w-xs">{mediaUrl}</a>
                    </div>
                  ) : null}

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
                {viewCampaign.mediaUrl && (() => {
                  let parsedAttachments: { url: string; type: string }[] = [];
                  try {
                    const parsed = JSON.parse(viewCampaign.mediaUrl);
                    if (Array.isArray(parsed)) {
                      parsedAttachments = parsed;
                    }
                  } catch {}

                  if (parsedAttachments.length > 0) {
                    return (
                      <div className="border-t border-slate-200/60 pt-3 space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Mídias Anexadas ({parsedAttachments.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {parsedAttachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100/80">
                              <span className="material-symbols-outlined text-secondary text-lg">
                                {att.type === 'image' ? 'image' : att.type === 'video' ? 'video_file' : 'volume_up'}
                              </span>
                              <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-secondary hover:underline truncate max-w-[150px] sm:max-w-[200px]">
                                Anexo {idx + 1} ({att.type === 'image' ? 'Imagem' : att.type === 'video' ? 'Vídeo' : 'Áudio'})
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
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
                  );
                })()}

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
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-[10px]">
                                {r.sourceType === 'lead' ? 'Lead' : r.sourceType === 'spreadsheet' ? 'Planilha' : 'Cliente'}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                r.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                                r.status === 'failed' ? 'bg-red-100 text-red-700' :
                                r.status === 'skipped' ? 'bg-slate-100 text-slate-500' :
                                'bg-amber-100 text-amber-700'
                              }`}>{r.status === 'sent' ? 'Enviado' : r.status === 'failed' ? 'Falhou' : r.status === 'skipped' ? 'Ignorado' : 'Pendente'}</span>
                              {r.status === 'failed' && r.errorMessage && (
                                <p className="text-[10px] text-red-500 font-semibold mt-1 break-words max-w-[180px]" title={r.errorMessage}>
                                  Erro: {r.errorMessage}
                                </p>
                              )}
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

