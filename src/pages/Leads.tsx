import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Phone, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { leadsApi } from '@/lib/api';

interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  value: number;
  origin: string | null;
  city: string | null;
  observations: string | null;
  convertedToClientId: number | null;
  convertedAt: string | null;
  updatedAt: string;
  professionalId: number;
  socialMedia?: string | null;
  activities?: any[];
  remarketingProposals?: any[];
  justification?: string;
  discountApplied?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
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
  'Novo': 'Novo',
};

const getStatusStyle = (status: string, converted: boolean) => {
  if (converted) return 'bg-green-100 text-green-700 border-green-200';
  if (status.startsWith('comercial_closed')) return 'bg-green-100 text-green-700 border-green-200';
  if (status.startsWith('comercial_')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (status.startsWith('sales_')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status.startsWith('prospect_')) return 'bg-violet-100 text-violet-700 border-violet-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const Leads = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    observations: '',
    socialMedia: '',
    value: '',
    origin: '',
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { professional } = useAuth();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchDebounce, setSearchDebounce] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  useEffect(() => {
    if (professional?.id) loadLeads();
  }, [professional]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchDebounce);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  useEffect(() => {
    const loadServices = async () => {
      if (!professional?.id) return;
      try {
        const { catalogsApi } = await import('@/lib/api');
        const res = await catalogsApi.getAll({ professionalId: Number(professional.id) });
        if (res.success) setServices(res.data || []);
      } catch (e) { console.error(e); }
    };
    if (professional?.id) loadServices();
  }, [professional]);

  const loadLeads = async () => {
    if (!professional?.id) return;
    setIsLoading(true);
    try {
      const response = await leadsApi.getAll({ 
        page: 1, 
        pageSize: 100, 
        search: searchQuery || undefined, 
        professionalId: Number(professional.id),
        include: 'activities'
      });
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

  useEffect(() => {
    if (!isLoading) {
      loadLeads();
    }
  }, [searchQuery]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.phone && lead.phone.includes(searchQuery));
    
    const matchesTag = !selectedTagFilter || (lead.tags && lead.tags.includes(selectedTagFilter));
    
    // Regra de Roteamento: 
    // - Mostrar se NÃO for convertido
    // - OU se FOR convertido mas tiver propostas de remarketing (oportunidades pendentes)
    const hasRemarketing = lead.remarketingProposals && lead.remarketingProposals.length > 0;
    const isOperational = !lead.convertedToClientId || hasRemarketing;

    return matchesSearch && matchesTag && isOperational;
  });

  const convertedCount = leads.filter(l => !!l.convertedToClientId).length;
  const activeCount = leads.filter(l => !l.convertedToClientId).length;

  const handleOpenDialog = (lead?: Lead) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        observations: lead.observations || '',
        socialMedia: lead.socialMedia || '',
        value: lead.value ? new Intl.NumberFormat('pt-BR').format(lead.value) : '',
        origin: lead.origin || '',
      });
    } else {
      setEditingLead(null);
      setFormData({ name: '', email: '', phone: '', observations: '', socialMedia: '', value: '', origin: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Erro",
        description: "O nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!professional?.id) {
      toast({
        title: "Erro",
        description: "Profissional não identificado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const leadData = {
        professional_id: Number(professional.id),
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        observations: formData.observations || null,
        socialMedia: formData.socialMedia || null,
        value: formData.value ? Number(formData.value.replace(/\./g, '').replace(',', '.')) : 0,
        origin: formData.origin || null,
        status: editingLead ? editingLead.status : 'prospect_lead',
      };

      if (editingLead) {
        const response = await leadsApi.update(editingLead.id, leadData);
        if (response.success) {
          toast({ title: "Lead atualizado", description: "Informações atualizadas com sucesso." });
          loadLeads();
        } else {
          toast({ title: "Erro", description: response.error?.message || "Erro ao atualizar lead", variant: "destructive" });
        }
      } else {
        const response = await leadsApi.create(leadData);
        if (response.success) {
          toast({ title: "Lead cadastrado", description: "Novo lead cadastrado com sucesso." });
          loadLeads();
        } else {
          toast({ title: "Erro", description: response.error?.message || "Erro ao cadastrar lead", variant: "destructive" });
        }
      }

      setIsDialogOpen(false);
      setEditingLead(null);
      setFormData({ name: '', email: '', phone: '', observations: '', socialMedia: '', value: '', origin: '' });
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar lead", variant: "destructive" });
    }
  };

  const handleDelete = async (leadId: number) => {
    try {
      const response = await leadsApi.delete(leadId);
      if (response.success) {
        toast({ title: "Lead removido", description: "Lead foi removido com sucesso." });
        loadLeads();
      } else {
        toast({ title: "Erro", description: response.error?.message || "Erro ao remover lead", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao remover lead", variant: "destructive" });
    }
  };

  const handleOpenDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailsOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary font-headline">Leads</h1>
          <p className="text-sm text-slate-500 font-medium">
            Gerencie seus leads e acompanhe o processo comercial
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/30 transition-all hover:-translate-y-0.5 rounded-xl font-bold px-6">
              <Plus className="h-4 w-4 mr-2 font-bold" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-3xl border-slate-100 bg-white p-0 shadow-2xl">
            <div className="p-8 bg-gradient-to-br from-blue-50 to-transparent border-b border-blue-100">
              <DialogTitle className="text-2xl font-extrabold text-primary font-headline tracking-tight">
                {editingLead ? 'Editar Lead' : 'Novo Lead'}
              </DialogTitle>
              <p className="text-slate-500 text-sm mt-1">
                {editingLead ? 'Atualize as informações do lead selecionado.' : 'Preencha os dados básicos para iniciar o acompanhamento.'}
              </p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-slate-400">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val.length > 11) val = val.substring(0, 11);
                    if (val.length > 2) {
                      val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
                    }
                    if (val.length > 10) {
                      val = `${val.substring(0, 10)}-${val.substring(10)}`;
                    }
                    setFormData({ ...formData, phone: val });
                  }}
                  placeholder="(17) 99999-9999"
                  className="text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations" className="text-sm">Observações</Label>
                <Input
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observações sobre o lead"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialMedia" className="text-sm">Rede Social</Label>
                <Input
                  id="socialMedia"
                  value={formData.socialMedia}
                  onChange={(e) => setFormData({ ...formData, socialMedia: e.target.value })}
                  placeholder="@usuario ou link"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin" className="text-sm font-medium">Origem do Lead</Label>
                <Select 
                  value={formData.origin} 
                  onValueChange={(v) => setFormData({ ...formData, origin: v })}
                >
                  <SelectTrigger className="w-full bg-white border-slate-200">
                    <SelectValue placeholder="Selecione a origem..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="indicação">Indicação</SelectItem>
                    <SelectItem value="meta ads">Meta Ads</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="influencer">Influencer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value" className="text-sm font-medium">Valor Estimado (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, "");
                      if (!val) {
                        setFormData({...formData, value: ""});
                        return;
                      }
                      const formatted = new Intl.NumberFormat('pt-BR').format(parseInt(val));
                      setFormData({...formData, value: formatted});
                    }}
                    placeholder="2.500"
                    className="text-sm pl-9 font-bold text-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">
                Cancelar
              </Button>
              <Button onClick={handleSave} variant="secondary" className="rounded-xl px-10 font-bold shadow-lg shadow-secondary/20">
                {editingLead ? 'Atualizar Lead' : 'Cadastrar Lead'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="premium-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total de Leads</div>
            <div className="p-2 bg-blue-50 text-accent rounded-xl">
              <span className="material-symbols-outlined text-lg">group</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="stats-value">{leads.length}</div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">leads registrados</p>
          </div>
        </div>
        
        <div className="premium-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Em Processo</div>
            <div className="p-2 bg-violet-50 text-violet-500 rounded-xl">
              <span className="material-symbols-outlined text-lg">pending</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="stats-value">{activeCount}</div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">leads ativos</p>
          </div>
        </div>
        
        <div className="premium-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Convertidos</div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="stats-value text-emerald-600">{convertedCount}</div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">leads fechados</p>
          </div>
        </div>
        
        <div className="premium-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valor em Aberto</div>
            <div className="p-2 bg-blue-50 text-accent rounded-xl">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="stats-value text-primary">
              {leads.reduce((acc, l) => acc + Number(l.value || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">oportunidades</p>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <Card className="w-full hover-card border-slate-100 bg-white shadow-sm overflow-hidden rounded-3xl">
        <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-primary font-headline">Lista de Leads</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* Tag Filter */}
              <div className="w-full sm:w-48">
                <Select value={selectedTagFilter || "all"} onValueChange={(v) => setSelectedTagFilter(v === "all" ? null : v)}>
                  <SelectTrigger className="rounded-full bg-white border-slate-200">
                    <SelectValue placeholder="Filtrar por Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Tags</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  className="pl-10 bg-white border-slate-200 focus-visible:ring-primary/20 transition-all rounded-full h-10"
                  value={searchDebounce}
                  onChange={(e) => setSearchDebounce(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando leads...</span>
            </div>
          ) : isMobile ? (
            <div className="space-y-4 p-4">
              {filteredLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="premium-card p-5 cursor-pointer hover:border-primary/30 active:scale-[0.98] relative"
                  onClick={() => handleOpenDetails(lead)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/5">
                        <span className="text-sm font-bold text-primary">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-primary text-base truncate">{lead.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusStyle(lead.status, !!lead.convertedToClientId)} text-[10px] uppercase font-bold mt-1`}
                        >
                          {lead.remarketingProposals && lead.remarketingProposals.length > 0 ? (
                            <span className="flex items-center gap-1">
                              ✓ Cliente <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[8px] h-4">Remarketing</Badge>
                            </span>
                          ) : (
                            lead.convertedToClientId ? '✓ Cliente' : (STATUS_LABELS[lead.status] || lead.status)
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(lead)} className="h-8 w-8 p-0 rounded-full">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {lead.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="material-symbols-outlined text-sm">mail</span>
                        <span className="truncate text-xs font-medium">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span className="text-xs font-bold">{lead.phone}</span>
                      </div>
                    )}
                  </div>

                  {lead.tags && lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {lead.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-bold bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 gap-2">
                    <div className="text-sm font-extrabold text-secondary font-headline">
                      {Number(lead.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">explore</span>
                      {lead.origin || 'Direto'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b-slate-100">
                    <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Nome</TableHead>
                    <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Contato</TableHead>
                    <TableHead className="w-[15%] text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Origem</TableHead>
                    <TableHead className="w-[15%] text-center text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Valor</TableHead>
                    <TableHead className="w-[15%] text-center text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Status</TableHead>
                    <TableHead className="w-[15%] text-center text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className={cn("cursor-pointer hover:bg-slate-50/50 transition-colors", lead.convertedToClientId ? 'bg-green-50/30' : '')} onClick={() => handleOpenDetails(lead)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {lead.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate">{lead.name}</span>
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex gap-1 ml-2">
                              {lead.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[8px] font-bold bg-primary/5 text-primary/70 px-1 rounded-sm border border-primary/10 whitespace-nowrap">
                                  {tag}
                                </span>
                              ))}
                              {lead.tags.length > 2 && <span className="text-[8px] text-slate-400">+{lead.tags.length - 2}</span>}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1 flex-shrink-0 text-muted-foreground" />
                              <span className="truncate">{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{lead.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{lead.origin || '---'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold text-primary">
                          {Number(lead.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={`${getStatusStyle(lead.status, !!lead.convertedToClientId)} whitespace-nowrap`}
                        >
                          {lead.remarketingProposals && lead.remarketingProposals.length > 0 ? (
                            <span className="flex items-center gap-1">
                              ✓ Cliente <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[8px] h-4">Remarketing</Badge>
                            </span>
                          ) : (
                            lead.convertedToClientId ? '✓ Cliente' : (STATUS_LABELS[lead.status] || lead.status)
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(lead)}
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(lead.id)}
                            className="h-8 w-8 p-0 flex-shrink-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-3xl border-slate-100 bg-white p-0 shadow-2xl">
          {selectedLead && (
            <>
              <div className="p-8 bg-gradient-to-br from-slate-50 to-transparent border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary border border-primary/5 shadow-sm">
                    {selectedLead.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-extrabold text-primary font-headline tracking-tight">{selectedLead.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", getStatusStyle(selectedLead.status, !!selectedLead.convertedToClientId))}>
                        {selectedLead.convertedToClientId ? '✓ Cliente' : (STATUS_LABELS[selectedLead.status] || selectedLead.status)}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">• {selectedLead.origin || 'Direto'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Contact & Financial Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informações de Contato</p>
                    <div className="space-y-2">
                      {selectedLead.phone && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                          <Phone className="w-4 h-4 text-emerald-500" />
                          <span className="font-medium">{selectedLead.phone}</span>
                        </div>
                      )}
                      {selectedLead.email && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                          <Mail className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{selectedLead.email}</span>
                        </div>
                      )}
                      {selectedLead.socialMedia && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                          <span className="material-symbols-outlined text-[18px] text-pink-500">link</span>
                          <span className="font-medium">{selectedLead.socialMedia}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalhes Comerciais</p>
                    <div className="bg-slate-900 rounded-2xl p-4 shadow-xl shadow-slate-900/10">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Valor Estimado</p>
                      <p className="text-2xl font-black text-white font-headline">
                        {Number(selectedLead.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-orange-400">explore</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Origem: {selectedLead.origin || 'Direto'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {selectedLead.tags && selectedLead.tags.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tags de Interesse</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLead.tags.map(tag => (
                        <span key={tag} className="bg-primary/5 text-primary text-[10px] font-bold px-3 py-1.5 rounded-xl border border-primary/10 shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observations */}
                {selectedLead.observations && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observações</p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed italic">
                      "{selectedLead.observations}"
                    </div>
                  </div>
                )}

                {/* Activities (Proposals/Notes) */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico & Propostas</p>
                  <div className="space-y-3">
                    {selectedLead.activities && selectedLead.activities.length > 0 ? (
                      selectedLead.activities.map((act: any, idx: number) => (
                        <div key={idx} className="flex gap-4 relative">
                          {idx !== selectedLead.activities.length - 1 && (
                            <div className="absolute left-[15px] top-8 bottom-0 w-[1px] bg-slate-100" />
                          )}
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm", act.color || 'bg-slate-200')}>
                            <span className="material-symbols-outlined text-white text-xs">{act.icon || 'history'}</span>
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-bold text-slate-700">{act.action}</p>
                              <span className="text-[10px] text-slate-300 font-bold">{act.date}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight">{act.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhuma atividade registrada.</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setIsDetailsOpen(false)} className="rounded-xl text-xs font-bold">Fechar</Button>
                <Button variant="secondary" onClick={() => { setIsDetailsOpen(false); handleOpenDialog(selectedLead); }} className="rounded-xl text-xs font-bold px-6">Editar Lead</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;