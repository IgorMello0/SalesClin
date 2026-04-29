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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, FileText, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useForms, FilledForm } from '@/contexts/FormsContext';
import { FormFillModal } from '@/components/FormFillModal';
import { FormViewModal } from '@/components/FormViewModal';
import { clientsApi } from '@/lib/api';

interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  document: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  professionalId: number;
  appointments?: Array<{ id: number }>;
  status?: 'ativo' | 'inativo';
  totalAppointments?: number;
  lastVisit?: string;
  address?: string;
}

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showTimeline, setShowTimeline] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [viewingFormId, setViewingFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { professional } = useAuth();
  const { getAssignedTemplates, addFilledForm, getClientForms, getFormById, templates } = useForms();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchDebounce, setSearchDebounce] = useState('');

  // Carregar clientes do banco
  useEffect(() => {
    loadClients();
  }, []);

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchDebounce);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDebounce]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const response = await clientsApi.getAll({ page: 1, pageSize: 100, search: searchQuery || undefined });
      if (response.success && response.data) {
        const clientsData = response.data.map((client: any) => ({
          ...client,
          email: client.email || '',
          phone: client.phone || '',
          status: 'ativo' as const,
          totalAppointments: client.appointments?.length || 0,
          lastVisit: client.appointments && client.appointments.length > 0
            ? new Date(client.appointments[0].startTime || client.createdAt).toISOString().split('T')[0]
            : new Date(client.createdAt).toISOString().split('T')[0],
          address: client.notes || '',
        }));
        setClients(clientsData);
      } else {
        toast({
          title: "Erro",
          description: response.error?.message || "Erro ao carregar clientes",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Recarregar quando searchQuery mudar
  useEffect(() => {
    if (!isLoading) {
      loadClients();
    }
  }, [searchQuery]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.phone && client.phone.includes(searchQuery))
  );

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
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
      const clientData = {
        professionalId: Number(professional.id),
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        notes: formData.address || null,
      };

      if (editingClient) {
        const response = await clientsApi.update(editingClient.id, clientData);
        if (response.success) {
          toast({
            title: "Cliente atualizado",
            description: "As informações do cliente foram atualizadas com sucesso.",
          });
          loadClients();
        } else {
          toast({
            title: "Erro",
            description: response.error?.message || "Erro ao atualizar cliente",
            variant: "destructive",
          });
        }
      } else {
        const response = await clientsApi.create(clientData);
        if (response.success) {
          toast({
            title: "Cliente cadastrado",
            description: "Novo cliente foi cadastrado com sucesso.",
          });
          loadClients();
        } else {
          toast({
            title: "Erro",
            description: response.error?.message || "Erro ao cadastrar cliente",
            variant: "destructive",
          });
        }
      }

      setIsDialogOpen(false);
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', address: '' });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar cliente",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (clientId: number) => {
    try {
      const response = await clientsApi.delete(clientId);
      if (response.success) {
        toast({
          title: "Cliente removido",
          description: "Cliente foi removido com sucesso.",
        });
        loadClients();
      } else {
        toast({
          title: "Erro",
          description: response.error?.message || "Erro ao remover cliente",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover cliente",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ativo' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getClientRecordCount = (clientId: number) => {
    return getClientForms(clientId.toString()).length;
  };

  const handleViewTimeline = (clientId: number) => {
    setShowTimeline(showTimeline === clientId ? null : clientId);
  };

  const handleOpenFormFill = (client: Client, templateId: string) => {
    setSelectedClient(client);
    setSelectedTemplateId(templateId);
  };

  const handleSaveFilledForm = (data: Record<string, any>) => {
    if (!selectedClient || !selectedTemplateId || !professional) return;

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const filledForm: FilledForm = {
      id: Date.now().toString(),
      templateId: selectedTemplateId,
      templateName: template.nome,
      clientId: selectedClient.id.toString(),
      clientName: selectedClient.name,
      professionalId: professional.id,
      professionalName: professional.name,
      data,
      criadoEm: new Date().toISOString(),
    };

    addFilledForm(filledForm);
    setSelectedTemplateId(null);
    setSelectedClient(null);
  };

  const assignedTemplates = professional ? getAssignedTemplates(professional.id) : [];
  const clientForms = selectedClient ? getClientForms(selectedClient.id.toString()) : [];
  const selectedTemplate = selectedTemplateId ? templates.find(t => t.id === selectedTemplateId) : null;
  const viewingForm = viewingFormId ? getFormById(viewingFormId) : null;
  const viewingTemplate = viewingForm ? templates.find(t => t.id === viewingForm.templateId) : null;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary font-headline">Clientes</h1>
          <p className="text-sm text-slate-500 font-medium">
            Gerencie sua base de clientes e históricos
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/30 transition-all hover:-translate-y-0.5 rounded-xl font-bold px-6">
              <Plus className="h-4 w-4 mr-2 font-bold" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo do cliente"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">E-mail *</Label>
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
                <Label htmlFor="phone" className="text-sm">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Endereço completo"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto text-sm">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="w-full sm:w-auto text-sm">
                {editingClient ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="premium-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total de Clientes</div>
            <div className="p-2 bg-blue-50 text-accent rounded-xl">
              <span className="material-symbols-outlined text-lg">group</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="stats-value">{clients.length}</div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">cadastrados no sistema</p>
          </div>
        </div>
        
        <div className="premium-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ativos</div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="stats-value text-emerald-600">
              {clients.filter(c => c.status === 'ativo').length}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">clientes ativos</p>
          </div>
        </div>
        
        <div className="premium-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Novos</div>
            <div className="p-2 bg-blue-50 text-accent rounded-xl">
              <span className="material-symbols-outlined text-lg">person_add</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="stats-value">0</div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">neste mês</p>
          </div>
        </div>
        
        <div className="premium-card p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agendamentos</div>
            <div className="p-2 bg-blue-50 text-accent rounded-xl">
              <span className="material-symbols-outlined text-lg">event</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="stats-value">
              {clients.reduce((acc, client) => acc + client.totalAppointments, 0)}
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">total agendado</p>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <Card className="w-full hover-card border-slate-100 bg-white shadow-sm overflow-hidden rounded-3xl">
        <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-primary font-headline">Lista de Clientes</CardTitle>
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
              <span className="ml-2 text-sm text-muted-foreground">Carregando clientes...</span>
            </div>
          ) : isMobile ? (
            // Mobile View - Card Layout
            <div className="space-y-3 p-3 sm:p-4">
              {filteredClients.map((client) => (
                <Card key={client.id} className="overflow-hidden w-full">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs sm:text-sm font-medium text-primary">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{client.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(client.status)} text-[0.65rem] sm:text-xs mt-1`}
                          >
                            {client.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </PopoverTrigger>
                            <PopoverContent className="w-44 sm:w-48" align="end">
                              <div className="space-y-2">
                                {assignedTemplates.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    Nenhuma ficha atribuída
                                  </p>
                                ) : (
                                  assignedTemplates.map((template) => (
                                    <Button
                                      key={template.id}
                                      variant="ghost"
                                      className="w-full justify-start text-xs sm:text-sm h-8"
                                      onClick={() => handleOpenFormFill(client, template.id)}
                                    >
                                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                      {template.nome}
                                    </Button>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(client)}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        >
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      {client.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="break-all">{client.phone}</span>
                        </div>
                      )}
                      {client.notes && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <span className="break-words line-clamp-2">{client.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 pt-3 border-t gap-2">
                      <div className="flex gap-3 sm:gap-4 text-[0.65rem] sm:text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">{client.totalAppointments}</span> agendamentos
                        </div>
                        <div>
                          <span className="font-medium">{getClientRecordCount(client.id)}</span> registros
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTimeline(client.id)}
                        className="h-7 text-xs w-full sm:w-auto"
                      >
                        <Eye className="h-3 w-3 mr-1.5" />
                        Ver Timeline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop View - Table Layout
            <div className="w-full">
              <div className="w-full">
                <Table className="w-full table-fixed">
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b-slate-100">
                      <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Nome</TableHead>
                      <TableHead className="w-[25%] text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Contato</TableHead>
                      <TableHead className="w-[20%] hidden xl:table-cell text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Endereço</TableHead>
                      <TableHead className="w-[15%] text-center hidden lg:table-cell text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Última Visita</TableHead>
                      <TableHead className="w-[10%] text-center text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Status</TableHead>
                      <TableHead className="w-[10%] text-center hidden lg:table-cell text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Agendamentos</TableHead>
                      <TableHead className="w-[15%] text-center text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Registros</TableHead>
                      <TableHead className="w-[15%] text-center text-xs font-bold uppercase tracking-wider text-slate-400 h-12">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="truncate">{client.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {client.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="h-3 w-3 mr-1 flex-shrink-0 text-muted-foreground" />
                                <span className="truncate">{client.email}</span>
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{client.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {client.notes && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{client.notes}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(client.status)} whitespace-nowrap`}
                          >
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          <span className="font-medium">{client.totalAppointments}</span>
                        </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {getClientRecordCount(client.id)} registros
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTimeline(client.id)}
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                                <Plus className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48" align="end">
                              <div className="space-y-2">
                                {assignedTemplates.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    Nenhuma ficha atribuída
                                  </p>
                                ) : (
                                  assignedTemplates.map((template) => (
                                    <Button
                                      key={template.id}
                                      variant="ghost"
                                      className="w-full justify-start h-8 px-2 text-sm"
                                      onClick={() => handleOpenFormFill(client, template.id)}
                                    >
                                      <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                                      {template.nome}
                                    </Button>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(client)}
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(client.id)}
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
            </div>
          )}
          
          {filteredClients.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Timeline for selected client */}
      {showTimeline && (
        <Card className="w-full">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl break-words">
              Histórico do Paciente - {clients.find(c => c.id === showTimeline)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {getClientForms(showTimeline.toString()).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma ficha preenchida para este cliente.
              </p>
            ) : (
              <div className="space-y-3">
                {getClientForms(showTimeline.toString()).map((form) => (
                  <Card key={form.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4" onClick={() => setViewingFormId(form.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{form.templateName}</h4>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                            <span>Por: {form.professionalName}</span>
                            <span>•</span>
                            <span>{new Date(form.criadoEm).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Fill Modal */}
      {selectedClient && selectedTemplate && (
        <FormFillModal
          open={!!selectedTemplateId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTemplateId(null);
              setSelectedClient(null);
            }
          }}
          template={selectedTemplate}
          clientId={selectedClient.id.toString()}
          clientName={selectedClient.name}
          professionalId={professional?.id || ''}
          professionalName={professional?.name || ''}
          onSave={handleSaveFilledForm}
        />
      )}

      {/* Form View Modal */}
      {viewingForm && viewingTemplate && (
        <FormViewModal
          open={!!viewingFormId}
          onOpenChange={(open) => {
            if (!open) setViewingFormId(null);
          }}
          filledForm={viewingForm}
          template={viewingTemplate}
        />
      )}
    </div>
  );
};

export default Clients;