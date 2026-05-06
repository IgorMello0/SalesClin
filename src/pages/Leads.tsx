import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { leadsApi, catalogsApi } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { ProposalViewer } from '@/components/ProposalViewer';
import { FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const safeFormatDate = (dateStr: any, formatStr: string = "dd/MM/yyyy") => {
  try {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Data Inválida";
    return format(date, formatStr, { locale: ptBR });
  } catch (e) {
    return "Erro na data";
  }
};

interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  value: number;
  origin: string;
  createdAt: string;
  professionalId: number;
  tags?: string[];
}

const Leads = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    value: '',
    origin: '',
    status: 'prospect_lead',
    tags: [] as string[]
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { professional } = useAuth();
  const navigate = useNavigate();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchDebounce, setSearchDebounce] = useState('');

  // Proposal State
  const [leadProposals, setLeadProposals] = useState<any[]>([]);
  const [selectedLeadForProposals, setSelectedLeadForProposals] = useState<Lead | null>(null);
  const [isProposalsListOpen, setIsProposalsListOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [isViewingProposal, setIsViewingProposal] = useState(false);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  useEffect(() => {
    loadLeads();
    loadServices();
  }, [professional]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchDebounce);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  const loadLeads = async () => {
    if (!professional?.id) return;
    setIsLoading(true);
    try {
      const response = await leadsApi.getAll({ professionalId: Number(professional.id), search: searchQuery || undefined });
      if (response.success && response.data) {
        setLeads(response.data);
      } else {
        toast({
          title: "Erro",
          description: response.error?.message || "Erro ao carregar leads",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadServices = async () => {
    if (!professional?.id) return;
    try {
      const res = await catalogsApi.getAll({ professionalId: Number(professional.id) });
      if (res.success) setServices(res.data || []);
    } catch (e) {
      console.error("Error loading services for tags:", e);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      loadLeads();
    }
  }, [searchQuery]);

  const handleOpenProposals = async (lead: Lead) => {
    setSelectedLeadForProposals(lead);
    setIsProposalsListOpen(true);
    setIsLoadingProposals(true);
    try {
      const res = await leadsApi.getProposals(lead.id);
      if (res.success) {
        setLeadProposals(res.data || []);
      }
    } catch (e) {
      toast({ title: "Erro ao carregar propostas", variant: "destructive" });
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleViewProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setIsViewingProposal(true);
  };

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        value: lead.value.toString(),
        origin: lead.origin,
        status: lead.status?.toLowerCase() || 'prospect_lead',
        tags: lead.tags || []
      });
    } else {
      setEditingLead(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        value: '',
        origin: '',
        status: 'prospect_lead',
        tags: []
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (!professional?.id) return;

    try {
      const leadData = {
        professional_id: Number(professional.id),
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        value: parseFloat(formData.value) || 0,
        origin: formData.origin || 'Direto',
        status: formData.status,
        tags: formData.tags
      };

      let response;
      if (editingLead) {
        response = await leadsApi.update(editingLead.id, leadData);
      } else {
        response = await leadsApi.create(leadData);
      }

      if (response.success) {
        toast({
          title: editingLead ? "Lead atualizado" : "Lead cadastrado",
          description: `O lead foi ${editingLead ? 'atualizado' : 'cadastrado'} com sucesso.`,
        });
        loadLeads();
        setIsDialogOpen(false);
      } else {
        toast({
          title: "Erro",
          description: response.error?.message || "Erro ao salvar lead",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar lead",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este lead?')) return;
    try {
      const response = await leadsApi.delete(id);
      if (response.success) {
        toast({
          title: "Lead removido",
          description: "O lead foi removido com sucesso.",
        });
        loadLeads();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover lead",
        variant: "destructive",
      });
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const filteredLeads = leads.filter(lead => {
    if (selectedTags.length === 0) return true;
    const leadTags = lead.tags || [];
    return selectedTags.every(tag => leadTags.includes(tag));
  });

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      'prospect_lead': 'Novo Lead',
      'prospect_qualified': 'Qualificado',
      'prospect_scheduled': 'Agendado',
      'prospect_attended': 'Compareceu',
      'comercial_consult': 'Consulta Feita',
      'comercial_proposal': 'Proposta',
      'comercial_follow': 'Follow-up',
      'comercial_closed': 'Fechado',
      'sales_payment': 'Pagamento',
      'sales_contract': 'Contrato',
      'sales_post': 'Pós-Venda',
      'lost': 'Perdido'
    };
    return statuses[status.toLowerCase()] || status;
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('closed')) return 'bg-green-100 text-green-800 border-green-200';
    if (s.includes('prospect')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s.includes('comercial')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s.includes('sales')) return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    if (s === 'lost') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' Mi';
    }
    if (value >= 1000) {
      return (value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const ticketMedio = filteredLeads.length > 0 
    ? filteredLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) / filteredLeads.length 
    : 0;

  return (
    <>
    <div className="space-y-8 pb-10 min-h-screen animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tight">Leads</h2>
          <p className="text-on-surface-variant text-xs sm:text-sm mt-1">Gerencie seus potenciais clientes e oportunidades de venda.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Button 
            onClick={() => navigate('/sales-funnel')}
            variant="outline"
            className="h-9 sm:h-12 px-3 sm:px-6 font-bold gap-1 sm:gap-2 rounded-xl border-secondary/20 text-secondary hover:bg-secondary/5 text-xs sm:text-sm"
          >
            <span className="material-symbols-outlined text-lg">filter_list</span>
            <span className="hidden sm:inline">Ver no Funil</span>
            <span className="sm:hidden">Funil</span>
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => handleOpenDialog()} 
                size="xl"
                variant="secondary"
                className="h-9 sm:h-12 px-3 sm:px-6 font-bold gap-1 sm:gap-2 shadow-lg shadow-secondary/20 rounded-xl transition-all hover:-translate-y-0.5 text-xs sm:text-sm"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                <span className="hidden sm:inline">Novo Lead</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[600px] border-0 shadow-2xl rounded-3xl bg-card p-0 overflow-hidden">
              <div className="p-6 bg-[#0B1525] border-b border-[#0B1525] rounded-t-3xl">
                <DialogTitle className="text-xl font-bold text-white font-headline">
                  {editingLead ? 'Editar Lead' : 'Novo Lead'}
                </DialogTitle>
                <p className="text-sm text-white/70 mt-1">
                  {editingLead ? 'Atualize as informações do lead' : 'Preencha os dados da nova oportunidade'}
                </p>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome Completo *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: João Silva"
                        className="h-11 rounded-xl bg-muted border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Telefone *</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        className="h-11 rounded-xl bg-muted border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Origem</Label>
                      <Input
                        value={formData.origin}
                        onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                        placeholder="Ex: Instagram, Google..."
                        className="h-11 rounded-xl bg-muted border-border"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Atual</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(val) => setFormData({ ...formData, status: val })}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-muted border-border">
                          <SelectValue placeholder="Selecione o status">
                            {getStatusLabel(formData.status)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                          <SelectItem value="prospect_lead">Novo Lead</SelectItem>
                          <SelectItem value="prospect_qualified">Qualificado</SelectItem>
                          <SelectItem value="prospect_scheduled">Agendado</SelectItem>
                          <SelectItem value="prospect_attended">Compareceu</SelectItem>
                          <SelectItem value="comercial_consult">Consulta Feita</SelectItem>
                          <SelectItem value="comercial_proposal">Proposta</SelectItem>
                          <SelectItem value="comercial_follow">Follow-up</SelectItem>
                          <SelectItem value="comercial_closed">Fechado</SelectItem>
                          <SelectItem value="sales_payment">Pagamento</SelectItem>
                          <SelectItem value="sales_contract">Contrato</SelectItem>
                          <SelectItem value="sales_post">Pós-Venda</SelectItem>
                          <SelectItem value="lost">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tags de Serviços</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-2xl border border-border min-h-[60px]">
                    {services.map((service) => {
                      const isSelected = formData.tags.includes(service.name);
                      return (
                        <button
                          key={service.id}
                          onClick={() => {
                            const newTags = isSelected
                              ? formData.tags.filter(t => t !== service.name)
                              : [...formData.tags, service.name];
                            setFormData({ ...formData, tags: newTags });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                            isSelected
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-card text-muted-foreground border-border hover:border-primary/30"
                          )}
                        >
                          {service.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-border bg-muted/50 flex justify-end gap-3 rounded-b-3xl">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-11 px-6">
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white rounded-xl font-bold h-11 px-6 shadow-sm">
                  {editingLead ? 'Atualizar' : 'Salvar Lead'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tags Filter */}
      <div className="premium-card p-6 border-0 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtrar por Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => toggleTag(service.name)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                selectedTags.includes(service.name)
                  ? "bg-secondary text-white border-secondary shadow-md scale-105"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground shadow-sm"
              )}
            >
              {service.name}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedTags([])}
              className="text-[10px] font-bold text-red-500 hover:bg-red-50 h-8 rounded-lg"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="premium-card p-4 sm:p-6 border-0 shadow-sm overflow-hidden">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Filtrado</div>
            <div className="text-blue-600 dark:text-blue-400">
              <span className="material-symbols-outlined text-lg">group</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tight truncate">{filteredLeads.length}</div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Leads</p>
          </div>
        </div>
        
        <div className="premium-card p-4 sm:p-6 border-0 shadow-sm overflow-hidden">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Novos Leads</div>
            <div className="text-amber-600 dark:text-amber-400">
              <span className="material-symbols-outlined text-lg">star</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-3xl font-extrabold text-amber-600 font-headline tracking-tight truncate">
              {filteredLeads.filter(l => l.status === 'prospect_lead').length}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Aguardando</p>
          </div>
        </div>

        <div className="premium-card p-4 sm:p-6 border-0 shadow-sm overflow-hidden">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Propostas</div>
            <div className="text-purple-600 dark:text-purple-400">
              <span className="material-symbols-outlined text-lg">sync_alt</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-3xl font-extrabold text-primary font-headline tracking-tight truncate">
              {filteredLeads.filter(l => l.status.includes('proposal')).length}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Em Negociação</p>
          </div>
        </div>

        <div className="premium-card p-4 sm:p-6 border-0 shadow-sm overflow-hidden">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ticket Médio</div>
            <div className="text-emerald-600 dark:text-emerald-400">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-extrabold text-primary font-headline tracking-tight truncate">
              R$ {formatCurrency(ticketMedio)}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Filtrado</p>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="premium-card overflow-hidden rounded-3xl border-0 shadow-sm">
        <div className="p-6 border-b border-border bg-muted/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-primary font-headline flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">list_alt</span>
            Gerenciamento de Leads
          </h3>
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <Input
              placeholder="Buscar por nome, fone ou origem..."
              className="pl-10 bg-card border-border transition-all rounded-xl h-11 shadow-sm"
              value={searchDebounce}
              onChange={(e) => setSearchDebounce(e.target.value)}
            />
          </div>
        </div>
        
        <div className="p-0 bg-card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-secondary animate-spin mb-3" />
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sincronizando base...</span>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-b-slate-100/50">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-12 px-6">Lead</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-12">Tags</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-12">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-12">Valor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-400 h-12 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/50 border-b-border transition-colors">
                    <TableCell className="px-6 py-4 cursor-pointer group/lead" onClick={() => handleOpenProposals(lead)}>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 flex-shrink-0 group-hover/lead:bg-secondary/10 group-hover/lead:border-secondary/20 transition-all">
                          <span className="text-sm font-bold text-primary font-headline group-hover/lead:text-secondary">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-primary text-sm group-hover/lead:text-secondary transition-colors">{lead.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">phone</span>
                            {lead.phone}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(lead.tags || []).map((tag, idx) => (
                          <span key={idx} className="bg-muted text-muted-foreground text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            {tag}
                          </span>
                        ))}
                        {(!lead.tags || lead.tags.length === 0) && (
                          <span className="text-[10px] text-slate-300 italic">Sem tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[9px] uppercase tracking-wider font-bold", getStatusColor(lead.status))}>
                        {getStatusLabel(lead.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-primary text-sm">
                      R$ {lead.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/sales-funnel')}
                          className="h-9 px-3 text-[11px] font-bold text-secondary hover:bg-secondary/10 rounded-lg flex items-center gap-1"
                        >
                          Detalhes
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenProposals(lead)}
                          className="h-9 w-9 p-0 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"
                          title="Ver Propostas"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(lead)}
                          className="h-9 w-9 p-0 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lead.id)}
                          className="h-9 w-9 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {filteredLeads.length === 0 && !isLoading && (
            <div className="text-center py-20 px-4">
              <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">person_search</span>
              <p className="text-sm font-bold text-slate-500">Nenhum lead encontrado com estes filtros.</p>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Proposals List Dialog */}
      <Dialog open={isProposalsListOpen} onOpenChange={setIsProposalsListOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-0 shadow-2xl bg-card p-0 overflow-hidden">
          <div className="p-6 bg-[#0B1525] text-white">
            <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <FileText className="w-5 h-5 text-secondary" />
              Propostas de {selectedLeadForProposals?.name}
            </DialogTitle>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {isLoadingProposals ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-secondary animate-spin" />
              </div>
            ) : leadProposals.length > 0 ? (
              leadProposals.map((p) => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border hover:border-secondary/30 hover:bg-card transition-all group cursor-pointer"
                  onClick={() => handleViewProposal(p)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{p.title || `Proposta #${p.id}`}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {safeFormatDate(p.createdAt)} • {Number(p.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 group-hover:text-secondary">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-slate-400 italic">Nenhuma proposta encontrada.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProposalViewer
        open={isViewingProposal}
        onOpenChange={setIsViewingProposal}
        proposal={selectedProposal}
        lead={selectedLeadForProposals}
        companyInfo={{
          name: "SalesClin CRM",
          address: "Av. Paulista, 1000 - São Paulo, SP",
          phone: "(11) 99999-9999"
        }}
      />
    </>
  );
};

export default Leads;
