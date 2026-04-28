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
} from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Phone, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
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
  createdAt: string;
  updatedAt: string;
  professionalId: number;
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
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    observations: '',
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { professional } = useAuth();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchDebounce, setSearchDebounce] = useState('');

  useEffect(() => {
    if (professional?.id) loadLeads();
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
      const response = await leadsApi.getAll({ page: 1, pageSize: 100, search: searchQuery || undefined, professionalId: Number(professional.id) });
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

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (lead.phone && lead.phone.includes(searchQuery))
  );

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
      });
    } else {
      setEditingLead(null);
      setFormData({ name: '', email: '', phone: '', observations: '' });
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
        status: 'prospect_lead',
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
      setFormData({ name: '', email: '', phone: '', observations: '' });
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
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingLead ? 'Editar Lead' : 'Novo Lead'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Nome *</Label>
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
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="text-sm"
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
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto text-sm">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="w-full sm:w-auto text-sm">
                {editingLead ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="w-full hover-card border-slate-100 bg-white/50 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Total de Leads
            </CardTitle>
            <div className="p-2 bg-blue-50 text-accent rounded-xl">
              <span className="material-symbols-outlined text-lg">group</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-3xl md:text-4xl font-extrabold text-primary font-headline">{leads.length}</div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              no pipeline
            </p>
          </CardContent>
        </Card>
        
        <Card className="w-full hover-card border-slate-100 bg-white/50 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Em Processo
            </CardTitle>
            <div className="p-2 bg-violet-50 text-violet-500 rounded-xl">
              <span className="material-symbols-outlined text-lg">pending</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-3xl md:text-4xl font-extrabold text-primary font-headline">
              {activeCount}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              leads ativos
            </p>
          </CardContent>
        </Card>
        
        <Card className="w-full hover-card border-slate-100 bg-white/50 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Convertidos
            </CardTitle>
            <div className="p-2 bg-green-50 text-green-500 rounded-xl">
              <span className="material-symbols-outlined text-lg">how_to_reg</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-3xl md:text-4xl font-extrabold text-green-600 font-headline">{convertedCount}</div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              viraram clientes
            </p>
          </CardContent>
        </Card>
        
        <Card className="w-full hover-card border-slate-100 bg-white/50 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Valor Total
            </CardTitle>
            <div className="p-2 bg-orange-50 text-orange-500 rounded-xl">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="text-2xl md:text-3xl font-extrabold text-primary font-headline">
              {leads.reduce((acc, l) => acc + Number(l.value || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              no pipeline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card className="w-full hover-card border-slate-100 bg-white shadow-sm overflow-hidden rounded-3xl">
        <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-primary font-headline">Lista de Leads</CardTitle>
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
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando leads...</span>
            </div>
          ) : isMobile ? (
            <div className="space-y-3 p-3 sm:p-4">
              {filteredLeads.map((lead) => (
                <Card key={lead.id} className="overflow-hidden w-full">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs sm:text-sm font-medium text-primary">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{lead.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={`${getStatusStyle(lead.status, !!lead.convertedToClientId)} text-[0.65rem] sm:text-xs mt-1`}
                          >
                            {lead.convertedToClientId ? '✓ Cliente' : (STATUS_LABELS[lead.status] || lead.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(lead)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      {lead.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="break-all">{lead.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2">
                      <div className="text-xs font-bold text-primary">
                        {Number(lead.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <div className="text-[0.65rem] text-muted-foreground">
                        {lead.origin || 'Direto'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                    <TableRow key={lead.id} className={lead.convertedToClientId ? 'bg-green-50/30' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {lead.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate">{lead.name}</span>
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
                        <span className="text-sm text-muted-foreground">{lead.origin || 'Direto'}</span>
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
                          {lead.convertedToClientId ? '✓ Cliente' : (STATUS_LABELS[lead.status] || lead.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
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
          
          {filteredLeads.length === 0 && !isLoading && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Nenhum lead encontrado.' : 'Nenhum lead cadastrado.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leads;