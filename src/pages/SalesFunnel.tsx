import React, { useState, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewAppointmentModal } from '@/components/NewAppointmentModal';
import { ConfirmPaymentModal } from '@/components/ConfirmPaymentModal';
import { clientsApi, leadsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";
import { useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { ExportModal } from "@/components/ExportModal";
import { ProposalViewer } from "@/components/ProposalViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, History, FileDown, Edit2, Check, X, Eye } from "lucide-react";

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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Activity {
  id: string;
  type: 'call' | 'whatsapp' | 'task' | 'system' | 'proposal';
  user: string;
  action: string;
  content?: string;
  result?: string;
  date: string;
  icon: string;
  color: string;
}

interface Lead {
  id: string;
  name: string;
  value: number;
  origin: string;
  avatar: string;
  status: string;
  lastUpdate: string;
  phone: string;
  email: string;
  activities: Activity[];
  isScheduled?: boolean;
  notes?: string;
  responsible?: string;
  tags?: string[];
  justification?: string;
  discountApplied?: boolean;
  remarketingProposals?: any[];
  isPaid?: boolean;
  subStatus?: string | null;
  appointments?: any[];
}

const initialLeads: Lead[] = [];

const FUNNELS = [
  { id: 'prospecting', label: 'Prospecção', icon: 'person_search' },
  { id: 'commercial', label: 'Comercial', icon: 'handshake' },
  { id: 'sales', label: 'Vendas', icon: 'payments' },
];

const STAGES = {
  prospecting: [
    { id: 'prospect_lead', label: 'Novos Leads', color: 'bg-blue-500' },
    { id: 'prospect_qualified', label: 'Qualificados', color: 'bg-indigo-500' },
    { id: 'prospect_scheduled', label: 'Agendados', color: 'bg-violet-500' },
    { id: 'prospect_attended', label: 'Compareceu', color: 'bg-emerald-500', isTransition: true },
  ],
  commercial: [
    { id: 'comercial_consult', label: 'Consulta Feita', color: 'bg-emerald-500', isLinked: true },
    { id: 'comercial_proposal', label: 'Proposta', color: 'bg-orange-500' },
    { id: 'comercial_follow', label: 'Follow-up', color: 'bg-amber-500' },
    { id: 'comercial_closed', label: 'Fechado', color: 'bg-green-600' },
  ],
  sales: [
    { id: 'sales_payment', label: 'Pagamento', color: 'bg-cyan-500' },
    { id: 'sales_contract', label: 'Contrato', color: 'bg-blue-600' },
    { id: 'sales_post', label: 'Pós-Venda', color: 'bg-purple-500' },
  ]
};

const QUICK_STATUSES = [
  { id: 'aguardando', label: 'Aguardando', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'ligar_tarde', label: 'Ligar mais tarde', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'retorna_amanha', label: 'Retorna amanhã', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'nao_respondeu', label: 'Não respondeu', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'negociacao', label: 'Em negociação', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

const ORIGIN_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicação', label: 'Indicação' },
  { value: 'meta ads', label: 'Meta Ads' },
  { value: 'google', label: 'Google' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'whatsapp', label: 'Whatsapp' },
  { value: 'site', label: 'Site' },
  { value: 'outro', label: 'Outro' },
];

const SalesFunnel = () => {
  const { professional } = useAuth();
  const [activeFunnel, setActiveFunnel] = useState('prospecting');
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLeadStage, setNewLeadStage] = useState<string | null>(null);
  const [newLeadData, setNewLeadData] = useState({ name: '', value: '', origin: '', phone: '', email: '' });
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-select & Export State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Appointment scheduling state
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingClientId, setSchedulingClientId] = useState<string | undefined>(undefined);
  const [schedulingClientName, setSchedulingClientName] = useState<string | undefined>(undefined);
  const [schedulingClientPhone, setSchedulingClientPhone] = useState<string | undefined>(undefined);
  const [currentSchedulingLeadId, setCurrentSchedulingLeadId] = useState<string | null>(null);
  const [isProcessingSchedule, setIsProcessingSchedule] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const { toast } = useToast();

  // Proposal state
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [proposalLeadId, setProposalLeadId] = useState<string | null>(null);
  const [proposalData, setProposalData] = useState({
    title: '',
    value: '',
    validUntil: '',
    salesperson: '',
    specialist: '',
    treatment: '',
    observations: '',
    tags: [] as string[],
    justification: '',
    justificationType: '' as 'desconto' | 'remocao' | ''
  });
  const [allProfessionals, setAllProfessionals] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [showJustification, setShowJustification] = useState(false);
  const [removedTags, setRemovedTags] = useState<string[]>([]);

  // Payment Confirmation State
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentLead, setPaymentLead] = useState<{id: string, value: number} | null>(null);
  // Schedule from closed lead
  const [isSchedulingClosed, setIsSchedulingClosed] = useState(false);
  const [closedLeadToSchedule, setClosedLeadToSchedule] = useState<Lead | null>(null);

  // Proposals Viewing
  const [leadProposals, setLeadProposals] = useState<any[]>([]);
  const [isViewingProposal, setIsViewingProposal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState("activities");
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [tempOrigin, setTempOrigin] = useState("");

  const getOriginLabel = (origin: string) => {
    return ORIGIN_OPTIONS.find(o => o.value === origin.toLowerCase())?.label || origin;
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    window.location.href = `whatsapp://send?phone=${finalPhone}`;
  };

  const activeStages = useMemo(() => STAGES[activeFunnel as keyof typeof STAGES], [activeFunnel]);

  useEffect(() => {
    if (selectedLead) {
      setTempOrigin(selectedLead.origin || "");
      setIsEditingOrigin(false);
    }
  }, [selectedLead?.id]);

  const loadLeads = async () => {
    if (!professional?.id) return;
    setIsLoading(true);
    try {
      const res = await leadsApi.getAll({ professionalId: Number(professional.id) });
      if (res.success) {
        const mappedLeads = res.data.map((l: any) => ({
          ...l,
          id: l.id.toString(),
          isScheduled: l.isScheduled || l.is_scheduled, // Handle both just in case
          lastUpdate: 'Recent',
          activities: (l.activities || []).map((a: any) => {
            const isNote = a.type === 'nota' || a.type === 'task';
            const isProposal = a.type === 'proposta' || a.type === 'proposal';
            
            return {
              id: a.id.toString(),
              type: isNote ? 'task' : isProposal ? 'proposal' : 'system',
              user: a.createdBy || 'Sistema',
              action: isNote ? 'fez uma anotação' : isProposal ? 'gerou uma proposta comercial' : 'ação no sistema',
              content: a.content,
              date: safeFormatDate(a.createdAt, "dd/MM/yy 'às' HH:mm"),
              icon: isNote ? 'edit_note' : isProposal ? 'description' : 'info',
              color: isNote ? 'bg-[#FF7A00]' : isProposal ? 'bg-orange-500' : 'bg-blue-400'
            };
          })
        }));
        setLeads(mappedLeads);
      }
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadServices = async () => {
    if (!professional?.id) return;
    try {
      const { catalogsApi } = await import('@/lib/api');
      const res = await catalogsApi.getAll({ professionalId: Number(professional.id) });
      if (res.success) setServices(res.data || []);
    } catch (e) {
      console.error("Error loading services for tags:", e);
    }
  };

  const loadProfessionals = async () => {
    try {
      const { professionalsApi } = await import('@/lib/api');
      const res = await professionalsApi.getAll();
      if (res.success) setAllProfessionals(res.data || []);
    } catch (e) {
      console.error("Error loading professionals:", e);
    }
  };

  const loadUsuarios = async () => {
    try {
      const { usuariosApi } = await import('@/lib/api');
      const res = await usuariosApi.getAll();
      if (res.success && res.data) {
        const medics = res.data.filter((u: any) => {
          const role = (u.role || '').toLowerCase();
          return role.includes('medico') || role.includes('médico') || role.includes('doutor') || role.includes('especialista');
        });
        setSpecialists(medics);
      }
    } catch (e) {
      console.error("Error loading usuarios:", e);
    }
  };

  useEffect(() => {
    if (professional) {
      loadLeads();
      loadServices();
      loadProfessionals();
      loadUsuarios();
    }
  }, [professional]);

  const formatCurrency = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (!numeric) return '';
    const val = Number(numeric) / 100;
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, '')) / 100;
  };

  const handleScheduleAppointment = async (lead: Lead) => {
    const lastAppt = lead.appointments && lead.appointments[0];
    const isActuallyCanceled = lastAppt?.status === 'cancelado';

    if (lead.isScheduled && !isActuallyCanceled) {
      toast({
        title: "Já Agendado",
        description: "Este lead já possui um agendamento ativo.",
      });
      return;
    }

    setIsProcessingSchedule(true);
    setCurrentSchedulingLeadId(lead.id);
    
    try {
      const searchRes = await clientsApi.getAll({ search: lead.phone || lead.name });
      
      if (searchRes.success && searchRes.data && searchRes.data.length > 0) {
        setSchedulingClientId(searchRes.data[0].id.toString());
        setSchedulingClientName(undefined);
        setSchedulingClientPhone(undefined);
      } else {
        setSchedulingClientId(undefined);
        setSchedulingClientName(lead.name);
        setSchedulingClientPhone(lead.phone);
      }

      setIsScheduling(true);
    } catch (error) {
      toast({
        title: "Erro ao buscar cliente",
        description: "Não foi possível verificar se o cliente já existe.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingSchedule(false);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      loadProposals(Number(selectedLead.id));
      setActiveDetailsTab("activities");
    }
  }, [selectedLead]);

  const loadProposals = async (leadId: number) => {
    setIsLoadingProposals(true);
    try {
      const res = await leadsApi.getProposals(leadId);
      if (res.success) {
        setLeadProposals(res.data || []);
      }
    } catch (e) {
      console.error("Error loading proposals:", e);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleViewProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setIsViewingProposal(true);
  };

  const moveLead = async (leadId: string, newStatus: string) => {
    // REGRA DE NEGÓCIO: Se o lead foi para "Compareceu", mover automaticamente para "Consulta Feita"
    // Isso tira o lead do funil de prospecção e o joga no comercial
    const finalStatus = newStatus === 'prospect_attended' ? 'comercial_consult' : newStatus;

    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, status: finalStatus, lastUpdate: 'Just now' };
      }
      return lead;
    }));

    try {
      const res = await leadsApi.update(Number(leadId), { status: finalStatus });
      
      if (res.success && newStatus === 'prospect_attended') {
        toast({ 
          title: "Lead Movido!", 
          description: "O lead compareceu e foi movido automaticamente para 'Consulta Feita' no Funil Comercial.",
        });
      }

      // Se o lead foi convertido automaticamente em cliente
      if (res.success && res.data?.converted) {
        toast({ 
          title: "🎉 Lead convertido em Cliente!", 
          description: `${res.data.convertedClient.name} agora é um cliente ativo no sistema.`,
        });
        loadLeads(); // Recarregar para atualizar os dados
      }
    } catch (error) {
      toast({ title: "Erro ao mover lead", variant: "destructive" });
      loadLeads();
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDropTargetStage(stageId);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId') || draggedLeadId;
    if (leadId) {
      moveLead(leadId, stageId);
    }
    setDraggedLeadId(null);
    setDropTargetStage(null);
  };

  const handleAddLead = async () => {
    console.log("[Funnel] Tentando criar lead...", { name: newLeadData.name, professional: professional?.id });
    
    if (!newLeadData.name) {
      toast({ title: "Campo obrigatório", description: "O nome do lead é obrigatório.", variant: "destructive" });
      return;
    }

    if (!professional) {
      console.error("[Funnel] Profissional não identificado.");
      toast({ title: "Erro de Autenticação", description: "Não foi possível identificar o profissional logado.", variant: "destructive" });
      return;
    }

    const finalStatus = newLeadStage === 'prospect_attended' ? 'comercial_consult' : (newLeadStage || 'prospect_lead');
    
    try {
      const res = await leadsApi.create({
        professional_id: Number(professional.id),
        name: newLeadData.name,
        phone: newLeadData.phone,
        email: newLeadData.email,
        value: Number(newLeadData.value.toString().replace(/\./g, "")) || 0,
        origin: newLeadData.origin,
        status: finalStatus,
        avatar: newLeadData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      });

      console.log("[Funnel] Resposta criação lead:", res);

      if (res.success) {
        toast({ title: "Lead Criado!", description: "O lead foi salvo no banco de dados." });
        loadLeads();
        setIsAddingLead(false);
        setNewLeadData({ name: '', value: '', origin: '', phone: '', email: '' });
      } else {
        toast({ 
          title: "Erro ao criar lead", 
          description: res.error?.message || "O servidor retornou um erro.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("[Funnel] Erro catch criação lead:", error);
      toast({ title: "Erro de Conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
    }
  };

  // Note state
  const [noteText, setNoteText] = useState('');

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selectedLead) return;

    try {
      const res = await leadsApi.addActivity(Number(selectedLead.id), {
        type: 'nota',
        content: noteText,
        createdBy: professional?.name || 'Consultor'
      });

      if (res.success) {
        toast({ title: 'Nota salva com sucesso!' });
        loadLeads(); // Recarrega para atualizar a linha do tempo e selectedLead
        setNoteText('');
      } else {
        toast({ title: 'Erro ao salvar nota', description: res.error?.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro de conexão', variant: 'destructive' });
    }
  };

  const handleSaveProposal = async () => {
    if (!proposalLeadId) return;

    const lead = leads.find(l => l.id === proposalLeadId);
    if (!lead) return;

    const newValue = parseCurrency(proposalData.value);
    const isLowerValue = newValue < lead.value;
    
    if (isLowerValue && !proposalData.justification) {
      setShowJustification(true);
      toast({ title: "Justificativa Obrigatória", description: "O valor é menor que o atual. Por favor, informe o motivo.", variant: "destructive" });
      return;
    }

    const discountApplied = isLowerValue && proposalData.justificationType === 'desconto';
    
    // Se houve remoção de tags, preparar proposta de remarketing
    let remarketingData = null;
    if (isLowerValue && proposalData.justificationType === 'remocao' && removedTags.length > 0) {
      remarketingData = {
        tags: removedTags,
        date: new Date().toISOString(),
        originalValue: lead.value
      };
    }

    const newActivity: Activity = {
      id: Math.random().toString(),
      type: 'proposal',
      user: professional?.name || 'Vendedor',
      action: 'gerou uma proposta comercial',
      content: `${proposalData.treatment} - Valor: ${newValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${discountApplied ? ' (Desconto Aplicado)' : ''}`,
      date: safeFormatDate(new Date(), "dd/MM/yy 'às' HH:mm"),
      icon: 'description',
      color: 'bg-orange-500'
    };

    if (remarketingData) {
      const remarketingActivity: Activity = {
        id: Math.random().toString(),
        type: 'system',
        user: 'Sistema',
        action: 'arquivou itens para remarketing',
        content: `Itens removidos: ${removedTags.join(', ')}`,
        date: safeFormatDate(new Date(), "dd/MM/yy 'às' HH:mm"),
        icon: 'campaign',
        color: 'bg-blue-400'
      };
      lead.activities.push(remarketingActivity);
    }

    // Persist in DB
    try {
      // 1. Salvar a Proposta Oficial no banco
      const proposalRes = await leadsApi.addProposal(Number(proposalLeadId), {
        title: proposalData.title || `Proposta para ${lead.name}`,
        value: newValue,
        validUntil: proposalData.validUntil || new Date().toISOString(),
        salespersonId: proposalData.salesperson,
        specialistId: proposalData.specialist,
        tags: proposalData.tags,
        justification: proposalData.justification,
        discountApplied: discountApplied
      });

      // 2. Salvar Atividade correspondente (Proposta gerada)
      await leadsApi.addActivity(Number(proposalLeadId), {
        type: 'proposta',
        content: `${proposalData.treatment || proposalData.title} - Valor: ${newValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${discountApplied ? ' (Desconto Aplicado)' : ''}`,
        createdBy: professional?.name || 'Vendedor'
      });

      // 3. Se houve remarketing, salvar como atividade
      if (remarketingData) {
        await leadsApi.addActivity(Number(proposalLeadId), {
          type: 'sistema',
          content: `Itens removidos da proposta: ${removedTags.join(', ')}`,
          createdBy: 'Sistema'
        });
      }

      // 4. Atualizar os dados principais do Lead
      const updateData: any = {
        status: 'comercial_proposal',
        value: newValue,
        tags: proposalData.tags,
        justification: proposalData.justification || undefined,
        discountApplied: discountApplied
      };

      if (remarketingData) {
        const existingRemarketing = (lead as any).remarketingProposals || [];
        updateData.remarketingProposals = [...existingRemarketing, remarketingData];
      }

      await leadsApi.update(Number(proposalLeadId), updateData);
      
      toast({ title: "Proposta Salva e Lead Atualizado!" });
      loadLeads();
      setIsCreatingProposal(false);
      setProposalLeadId(null);
    } catch (e) {
      toast({ title: 'Erro ao salvar proposta', variant: 'destructive' });
    }


    setIsCreatingProposal(false);
    setShowJustification(false);
    setProposalLeadId(null);
    setProposalData({
      title: '',
      value: '',
      validUntil: '',
      salesperson: '',
      specialist: '',
      treatment: '',
      observations: '',
      tags: [],
      justification: '',
      justificationType: ''
    });
    setRemovedTags([]);
  };

  const handleUpdateOrigin = async () => {
    if (!selectedLead) return;
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { origin: tempOrigin });
      if (res.success) {
        toast({ title: "Origem atualizada com sucesso!" });
        setSelectedLead({ ...selectedLead, origin: tempOrigin });
        setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, origin: tempOrigin } : l));
        setIsEditingOrigin(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar origem", variant: "destructive" });
    }
  };

  const handleConfirmPayment = (lead: Lead) => {
    setPaymentLead({ id: lead.id, value: lead.value });
    setIsConfirmingPayment(true);
  };

  const handleSubStatusChange = async (leadId: string, subStatus: string | null) => {
    try {
      await leadsApi.update(Number(leadId), { subStatus });
      setLeads(leads.map(l => l.id === leadId ? { ...l, subStatus } : l));
      toast({ title: "Status rápido atualizado!" });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const openAddLead = (stageId: string | null = null) => {
    setNewLeadStage(stageId);
    setIsAddingLead(true);
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleExport = (format: string, scope: string) => {
    // Aqui vai a lógica de exportação final (ex: API ou frontend CSV gen)
    // Usaremos os ids em `selectedLeadIds` se scope for 'selected'
    toast({ title: "Exportação Iniciada", description: `Exportando em formato ${format.toUpperCase()} (${scope === 'all' ? 'Todos' : 'Selecionados'})` });
    if (scope === 'selected') {
      setSelectedLeadIds([]); // limpar após exportar (opcional)
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8 pb-10 min-h-screen">
      {/* Header & Funnel Switcher */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tight">Comercial</h2>
            <p className="text-on-surface-variant text-xs sm:text-sm mt-1">Gerencie seus leads e funis de vendas.</p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <DropdownMenu>
          
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost"
                className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-xl sm:text-2xl">settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-slate-100">
              <DropdownMenuItem 
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  if (isMultiSelectMode) setSelectedLeadIds([]);
                }} 
                className="cursor-pointer rounded-xl font-medium py-2.5"
              >
                <span className="material-symbols-outlined mr-3 text-[18px] text-slate-500">
                  {isMultiSelectMode ? 'close' : 'checklist'}
                </span>
                {isMultiSelectMode ? 'Cancelar Seleção' : 'Selecionar Vários'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsExportModalOpen(true)} 
                className="cursor-pointer rounded-xl font-medium py-2.5 text-primary"
              >
                <span className="material-symbols-outlined mr-3 text-[18px] text-primary">download</span>
                Exportar Dados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

            <Button 
              onClick={() => openAddLead()} 
              size="xl"
              variant="secondary"
              className="h-10 sm:h-12 px-3 sm:px-6 font-bold gap-1 sm:gap-2 shadow-lg shadow-secondary/20 text-sm"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span className="hidden sm:inline">Novo Lead</span>
            </Button>
          </div>
        </div>

        {/* Funnel Tabs — scrollable on mobile */}
        <div className="flex overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex p-1 sm:p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/50 w-fit">
            {FUNNELS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFunnel(f.id)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap",
                  activeFunnel === f.id 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-400 hover:text-primary hover:bg-white/50"
                )}
              >
                <span className={cn("material-symbols-outlined text-base sm:text-lg", activeFunnel === f.id ? "text-secondary" : "")}>
                  {f.icon}
                </span>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-6 -mx-3 px-3 sm:-mx-4 sm:px-4 scrollbar-hide snap-x snap-mandatory sm:snap-none">
        {activeStages.map((stage) => {
          const stageLeads = leads.filter(l => {
            // Regra de Roteamento: 
            // - Mostrar se NÃO estiver pago
            const isOperational = !l.isPaid;
            if (!isOperational) return false;

            return l.status === stage.id;
          });
          
          const isOver = dropTargetStage === stage.id;
          
          return (
            <div 
              key={stage.id} 
              className="flex-shrink-0 w-[280px] sm:w-72 flex flex-col gap-3 snap-center"
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragLeave={() => setDropTargetStage(null)}
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", stage.color)}></div>
                  <h3 className="font-bold text-primary text-sm uppercase tracking-wider">{stage.label}</h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>
                <button 
                  onClick={() => openAddLead(stage.id)}
                  className="text-slate-300 hover:text-primary transition-colors btn-hover"
                >
                  <span className="material-symbols-outlined text-lg">add_circle</span>
                </button>
              </div>

              <div className={cn(
                "flex-1 min-h-[500px] rounded-2xl p-2.5 space-y-2 transition-all duration-200",
                "bg-slate-50/50 border border-slate-100/50",
                isOver && "bg-slate-100/80 border-secondary/30 scale-[1.01]"
              )}>
                {stageLeads.map((lead) => (
                  <div 
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className={cn(
                      "premium-card p-3 cursor-grab active:cursor-grabbing group animate-in fade-in slide-in-from-top-2 relative",
                      draggedLeadId === lead.id && "opacity-40 grayscale-[0.5]"
                    )}
                  >
                    {/* Card Content */}

                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {isMultiSelectMode && (
                          <div onClick={(e) => e.stopPropagation()} className="animate-in zoom-in-95 duration-200">
                            <Checkbox 
                              checked={selectedLeadIds.includes(lead.id)} 
                              onCheckedChange={() => toggleLeadSelection(lead.id)}
                              className="border-slate-300 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                            />
                          </div>
                        )}
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary border border-primary/5">
                          {lead.avatar}
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-primary group-hover:text-secondary transition-colors flex items-center break-words">{lead.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="material-symbols-outlined text-[12px] text-emerald-500">chat</span>
                            <p className="text-[10px] text-slate-500 font-bold tracking-tight">{lead.phone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(lead.phone);
                          }}
                          className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                          title="Abrir no WhatsApp"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </button>
                        <button className="text-slate-300 group-hover:text-slate-400 transition-colors">
                          <span className="material-symbols-outlined text-base">more_vert</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between mt-2 pt-1.5 border-t border-slate-100">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs font-bold text-primary">
                          {lead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        {activeFunnel === 'prospecting' && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className={cn(
                                  "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-colors border text-left",
                                  lead.subStatus ? QUICK_STATUSES.find(s => s.id === lead.subStatus)?.color : QUICK_STATUSES[0].color
                                )}>
                                  {lead.subStatus ? QUICK_STATUSES.find(s => s.id === lead.subStatus)?.label : 'Status (Nenhum)'}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48 rounded-xl p-2 bg-white shadow-xl border-slate-100">
                                {QUICK_STATUSES.map(status => (
                                  <DropdownMenuItem 
                                    key={status.id}
                                    onClick={() => handleSubStatusChange(lead.id, status.id)}
                                    className={cn("text-xs font-bold cursor-pointer rounded-lg mb-1 last:mb-0", status.color)}
                                  >
                                    {status.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem 
                                  onClick={() => handleSubStatusChange(lead.id, null)}
                                  className="text-xs font-bold text-slate-400 cursor-pointer rounded-lg"
                                >
                                  Limpar Status
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                        {lead.lastUpdate}
                      </div>
                    </div>

                    {/* Stage specific acts */}
                    <div className="flex flex-col gap-1 mt-2 pt-1.5 border-t border-slate-100">
                      {stage.id === 'prospect_scheduled' && (
                        lead.isScheduled ? (() => {
                          const lastAppt = lead.appointments && lead.appointments[0];
                          const apptStatus = lastAppt?.status || 'agendado';
                          
                          switch(apptStatus) {
                            case 'concluido':
                              return (
                                <div className="w-full py-1.5 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-sky-100">
                                  Compareceu
                                  <span className="material-symbols-outlined text-xs">check_circle</span>
                                </div>
                              );
                            case 'cancelado':
                              return (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleScheduleAppointment(lead); }}
                                  className="w-full py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-red-100"
                                >
                                  Faltou / Reagendar
                                  <span className="material-symbols-outlined text-xs">event_busy</span>
                                </button>
                              );
                            case 'confirmado':
                              return (
                                <div className="w-full py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100">
                                  Confirmado
                                  <span className="material-symbols-outlined text-xs">verified</span>
                                </div>
                              );
                            default:
                              return (
                                <div className="w-full py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-amber-100">
                                  Agendado
                                  <span className="material-symbols-outlined text-xs">schedule</span>
                                </div>
                              );
                          }
                        })() : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleScheduleAppointment(lead); }}
                            disabled={isProcessingSchedule}
                            className="w-full py-1.5 bg-violet-100 hover:bg-violet-600 text-violet-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-violet-200"
                          >
                            {isProcessingSchedule && currentSchedulingLeadId === lead.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                Agendar agora
                                <span className="material-symbols-outlined text-xs">calendar_today</span>
                              </>
                            )}
                          </button>
                        )
                      )}


                      {stage.id === 'comercial_consult' && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setProposalLeadId(lead.id);
                            setIsCreatingProposal(true);
                            setProposalData(prev => ({ 
                              ...prev, 
                              salesperson: professional?.name || '',
                              value: lead.value > 0 ? formatCurrency((lead.value * 100).toString()) : '',
                              tags: lead.tags || []
                            }));
                          }}
                          className="w-full py-2 bg-orange-100 hover:bg-orange-500 text-orange-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-orange-200"
                        >
                          Gerar Proposta
                          <span className="material-symbols-outlined text-xs">description</span>
                        </button>
                      )}

                      {stage.id === 'comercial_closed' && (
                        <div className="flex flex-col gap-1.5">
                          <div className="w-full py-2 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-green-200">
                            <span className="material-symbols-outlined text-xs">how_to_reg</span>
                            Cliente Ativo
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLead(lead.id, 'sales_payment');
                              setActiveFunnel('sales');
                            }}
                            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-primary/20"
                          >
                            <span className="material-symbols-outlined text-xs">payments</span>
                            Iniciar Pagamento
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClosedLeadToSchedule(lead);
                              setIsSchedulingClosed(true);
                            }}
                            className="w-full py-2 bg-indigo-100 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-indigo-200"
                          >
                            <span className="material-symbols-outlined text-xs">calendar_add_on</span>
                            Agendar Agora
                          </button>
                        </div>
                      )}

                      {stage.id === 'sales_payment' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmPayment(lead);
                          }}
                          className="w-full py-2 bg-cyan-100 hover:bg-cyan-600 text-cyan-700 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-cyan-200 animate-pulse-subtle"
                        >
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Confirmar Recebimento
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {stageLeads.length === 0 && (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200/50 rounded-xl bg-white/30">
                    <p className="text-slate-300 text-xs font-medium italic">Arraste um lead para aqui</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={isAddingLead} onOpenChange={setIsAddingLead}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-slate-100 bg-white overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary font-headline">Cadastrar Novo Lead</DialogTitle>
            <p className="text-slate-500 text-sm">Adicione as informações básicas do novo lead para o pipeline.</p>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-slate-400">Nome do Lead</Label>
              <Input 
                id="name" 
                placeholder="Ex: João Silva" 
                className="rounded-xl border-slate-200 h-12 focus:ring-secondary/20"
                value={newLeadData.name}
                onChange={(e) => setNewLeadData({...newLeadData, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-slate-400">WhatsApp / Celular</Label>
                <Input 
                  id="phone" 
                  placeholder="(00) 00000-0000" 
                  className="rounded-xl border-slate-200 h-12"
                  value={newLeadData.phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val.length > 11) val = val.substring(0, 11);
                    
                    if (val.length > 2) {
                      val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
                    }
                    if (val.length > 10) {
                      val = `${val.substring(0, 10)}-${val.substring(10)}`;
                    }
                    setNewLeadData({...newLeadData, phone: val})
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin" className="text-xs font-bold uppercase tracking-widest text-slate-400">Origem</Label>
                <Select value={newLeadData.origin} onValueChange={(val) => setNewLeadData({...newLeadData, origin: val})}>
                  <SelectTrigger id="origin" className="rounded-xl border-slate-200 h-12 bg-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-white border-slate-100 shadow-xl z-[200]">
                    {ORIGIN_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">E-mail</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="email@exemplo.com" 
                className="rounded-xl border-slate-200 h-12"
                value={newLeadData.email}
                onChange={(e) => setNewLeadData({...newLeadData, email: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsAddingLead(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleAddLead} variant="secondary" className="rounded-xl px-8 font-bold">Criar Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Details Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-3xl border-0 sm:border sm:border-slate-100 bg-white p-0 flex flex-col w-full h-full sm:h-auto">
          {selectedLead && (
            <>
              {/* Header Profile Section */}
              <div className="p-4 sm:p-8 bg-gradient-to-br from-primary/5 to-transparent border-b border-slate-100">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-primary flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-xl shadow-primary/20">
                    {selectedLead.avatar}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <h3 className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tighter">{selectedLead.name}</h3>
                        <p className="text-on-surface-variant font-medium text-sm flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full bg-secondary"></span>
                          Estágio: {STAGES[activeFunnel as keyof typeof STAGES].find(s => s.id === selectedLead.status)?.label || selectedLead.status}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => openWhatsApp(selectedLead.phone)}
                          variant="outline" 
                          className="rounded-full h-10 w-10 p-0 border-slate-200 text-emerald-500 hover:bg-emerald-50"
                          title="Abrir WhatsApp"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </Button>
                        <Button 
                          onClick={() => window.open(`tel:${selectedLead.phone}`)}
                          variant="outline" 
                          className="rounded-full h-10 w-10 p-0 border-slate-200 text-blue-500 hover:bg-blue-50"
                          title="Ligar"
                        >
                          <span className="material-symbols-outlined text-xl">call</span>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 pt-3 sm:pt-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</p>
                        <p className="text-sm font-bold text-primary">{selectedLead.phone}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                        <p className="text-sm font-bold text-primary truncate max-w-[150px]">{selectedLead.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor do Lead</p>
                        <p className="text-sm font-bold text-secondary">{selectedLead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Body: Info vs Timeline */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 bg-white">
                {/* Left Side: General Info */}
                <div className="p-4 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 space-y-4 sm:space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Observações do Sistema</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className={cn("text-xs leading-relaxed italic", selectedLead.notes ? "text-slate-600" : "text-slate-400")}>
                        {selectedLead.notes || "Nenhuma observação registrada para este lead no momento."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Detalhes Adicionais</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs group/origin h-6">
                        <span className="text-slate-400">Conversão de Origem</span>
                        {isEditingOrigin ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-1">
                            <Select 
                              value={tempOrigin} 
                              onValueChange={(val) => {
                                setTempOrigin(val);
                                // Auto save on change for better UX with Select
                                const saveOrigin = async (newVal: string) => {
                                  try {
                                    const res = await leadsApi.update(Number(selectedLead.id), { origin: newVal });
                                    if (res.success) {
                                      toast({ title: "Origem atualizada!" });
                                      setSelectedLead({ ...selectedLead, origin: newVal });
                                      setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, origin: newVal } : l));
                                      setIsEditingOrigin(false);
                                    }
                                  } catch (e) {
                                    toast({ title: "Erro ao atualizar", variant: "destructive" });
                                  }
                                };
                                saveOrigin(val);
                              }}
                            >
                              <SelectTrigger className="h-7 py-0 px-2 text-xs font-bold border-secondary focus-visible:ring-secondary/20 w-32 bg-white">
                                <SelectValue placeholder="Origem">
                                  {getOriginLabel(tempOrigin)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[300]">
                                {ORIGIN_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button onClick={() => setIsEditingOrigin(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-secondary capitalize">{getOriginLabel(selectedLead.origin || "Não informado")}</span>
                            <button 
                              onClick={() => setIsEditingOrigin(true)}
                              className="opacity-0 group-hover/origin:opacity-100 text-slate-300 hover:text-secondary transition-all"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Responsável Atual</span>
                        <span className="font-bold text-primary">{selectedLead.responsible || professional?.name || "Sistema"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Vertical Timeline (As requested) */}
                <div className="lg:col-span-2 bg-slate-50/30 flex flex-col min-h-0 h-full">
                  <div className="flex flex-col h-full">
                    {/* Activity Top Action */}
                    <div className="p-4 sm:p-8 border-b border-slate-100 bg-white/50 space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Linha do Tempo de Atividades</h4>
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Em Tempo Real
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Textarea 
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Digite uma nota sobre esse lead..." 
                          className="rounded-xl border-slate-200 focus:ring-secondary/20 min-h-[80px] text-sm"
                        />
                        <div className="flex justify-end">
                          <Button 
                            onClick={handleSaveNote}
                            disabled={!noteText.trim()}
                            variant="secondary"
                            className="rounded-xl px-6 font-bold h-10 gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">save</span>
                            Salvar Nota
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Timeline / Proposals */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                      <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab} className="w-full flex-1 flex flex-col">
                        <div className="px-4 sm:px-8 border-b border-slate-100 bg-white">
                          <TabsList className="bg-transparent border-0 h-14 p-0 gap-8">
                            <TabsTrigger 
                              value="activities" 
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-bold uppercase tracking-widest text-slate-400 gap-2"
                            >
                              <History className="w-4 h-4" />
                              Atividades
                            </TabsTrigger>
                            <TabsTrigger 
                              value="proposals" 
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-bold uppercase tracking-widest text-slate-400 gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Propostas
                              {leadProposals.length > 0 && (
                                <span className="bg-secondary text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                  {leadProposals.length}
                                </span>
                              )}
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="activities" className="flex-1 p-4 sm:p-8 m-0 outline-none">
                          <div className="relative pl-8 space-y-12">
                            {/* The Vertical Line */}
                            <div className="absolute left-[15px] top-2 bottom-4 w-[2px] bg-slate-200"></div>

                            {selectedLead.activities.map((act, idx) => (
                              <div key={act.id} className="relative animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                                {/* Node Dot/Icon */}
                                <div className={cn(
                                  "absolute -left-[32px] top-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10",
                                  act.color || "bg-[#001B3D]" // Default Navy
                                )}>
                                  <span className="material-symbols-outlined text-white text-[16px]">{act.icon}</span>
                                </div>

                                {/* Content Card */}
                                <div className="space-y-2">
                                  <header className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <span className="text-sm font-extrabold text-primary font-headline">{act.user}</span>
                                    <span className="text-xs text-slate-400 font-medium">{act.action}</span>
                                  </header>

                                  {act.result && (
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase">Resultado</p>
                                      <p className="text-xs font-bold text-slate-700">{act.result}</p>
                                    </div>
                                  )}

                                  {act.content && (
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalhamento</p>
                                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-4 border-secondary/20">
                                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{act.content}</p>
                                      </div>
                                    </div>
                                  )}

                                  <footer className="text-[10px] font-bold text-slate-300 pt-1 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                    {act.date}
                                  </footer>
                                </div>
                              </div>
                            ))}
                            {selectedLead.activities.length === 0 && (
                              <div className="text-center py-10">
                                <p className="text-sm text-slate-400 italic">Nenhuma atividade registrada.</p>
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="proposals" className="flex-1 p-4 sm:p-8 m-0 outline-none">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {leadProposals.map((proposal) => (
                              <div 
                                key={proposal.id} 
                                className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-secondary/20 transition-all cursor-pointer relative overflow-hidden"
                                onClick={() => handleViewProposal(proposal)}
                              >
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="w-5 h-5 text-secondary" />
                                </div>
                                
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                    <FileText className="w-6 h-6" />
                                  </div>
                                  <div className="space-y-1">
                                    <h5 className="font-bold text-primary text-sm line-clamp-1">{proposal.title}</h5>
                                    <p className="text-xs text-slate-400 font-medium">#{proposal.id}</p>
                                  </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-end">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</p>
                                    <p className="text-sm font-bold text-secondary">
                                      {Number(proposal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</p>
                                    <p className="text-[10px] font-bold text-primary">
                                      {safeFormatDate(proposal.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {leadProposals.length === 0 && !isLoadingProposals && (
                              <div className="col-span-2 text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                  <FileText className="w-8 h-8 text-slate-200" />
                                </div>
                                <h5 className="font-bold text-slate-400">Nenhuma proposta encontrada</h5>
                                <p className="text-xs text-slate-400 mt-1">Gere sua primeira proposta para este lead.</p>
                              </div>
                            )}

                            {isLoadingProposals && (
                              <div className="col-span-2 flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Proposal Dialog */}
      <Dialog open={isCreatingProposal} onOpenChange={setIsCreatingProposal}>
        <DialogContent className="sm:max-w-[750px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-3xl border-0 sm:border sm:border-slate-100 bg-white p-0 shadow-2xl">
          <div className="p-4 sm:p-8 bg-gradient-to-br from-orange-50 to-transparent border-b border-orange-100">
            <h3 className="text-lg sm:text-2xl font-extrabold text-primary font-headline tracking-tight">Criação de Proposta Comercial</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Defina os termos do tratamento e valores para o paciente.</p>
          </div>

          <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Título da Proposta</Label>
                <Input 
                  value={proposalData.title}
                  onChange={(e) => setProposalData({...proposalData, title: e.target.value})}
                  placeholder="Ex: Reabilitação Oral Completa" 
                  className="rounded-xl border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Valor Total</Label>
                  <Input 
                    value={proposalData.value}
                    onChange={(e) => setProposalData({...proposalData, value: formatCurrency(e.target.value)})}
                    placeholder="R$ 0,00" 
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Válido Até</Label>
                  <Input 
                    type="date"
                    value={proposalData.validUntil}
                    onChange={(e) => setProposalData({...proposalData, validUntil: e.target.value})}
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Vendedor / Consultor</Label>
                <Select 
                  value={proposalData.salesperson}
                  onValueChange={(v) => setProposalData({...proposalData, salesperson: v})}
                >
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Selecione o consultor">
                      {allProfessionals.find(p => p.id.toString() === proposalData.salesperson)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allProfessionals.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showJustification && (
                <div className="space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 animate-in fade-in slide-in-from-top-2">
                   <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Motivo do Valor Menor</Label>
                    <Select 
                      value={proposalData.justificationType}
                      onValueChange={(v: any) => setProposalData({...proposalData, justificationType: v})}
                    >
                      <SelectTrigger className="rounded-xl border-orange-200 bg-white">
                        <SelectValue placeholder="Selecione o motivo">
                          {proposalData.justificationType === 'desconto' ? 'Desconto Financeiro' : 
                           proposalData.justificationType === 'remocao' ? 'Remoção de Procedimentos' : ''}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desconto">Desconto Financeiro</SelectItem>
                        <SelectItem value="remocao">Remoção de Procedimentos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Justificativa Detalhada</Label>
                    <Textarea 
                      value={proposalData.justification}
                      onChange={(e) => setProposalData({...proposalData, justification: e.target.value})}
                      placeholder="Explique o motivo do valor reduzido..."
                      className="rounded-xl border-orange-200 bg-white min-h-[80px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Profissional Especialista</Label>
                <Select onValueChange={(v) => setProposalData({...proposalData, specialist: v})}>
                  <SelectTrigger className="rounded-xl border-slate-200">
                    <SelectValue placeholder="Selecione o especialista" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialists.length > 0 ? specialists.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    )) : (
                      <SelectItem value="none" disabled>Nenhum especialista encontrado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Tags da Proposta (Serviços)</Label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[60px] content-start">
                  {services.map((service) => {
                    const isSelected = proposalData.tags.includes(service.name);
                    return (
                      <button
                        key={service.id}
                        onClick={() => {
                          const isRemoving = isSelected;
                          if (isRemoving) {
                            setRemovedTags(prev => [...prev, service.name]);
                          } else {
                            setRemovedTags(prev => prev.filter(t => t !== service.name));
                          }

                          const newTags = isSelected
                            ? proposalData.tags.filter(t => t !== service.name)
                            : [...proposalData.tags, service.name];
                          setProposalData({ ...proposalData, tags: newTags });
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                            : "bg-white text-slate-400 border-slate-200 hover:border-primary/30 hover:text-primary hover:bg-white shadow-sm"
                        )}
                      >
                        {service.name}
                      </button>
                    );
                  })}
                  {services.length === 0 && (
                    <div className="w-full flex items-center justify-center py-2">
                      <span className="text-[10px] text-slate-400 font-medium italic">Nenhum serviço disponível</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Tratamento Proposto</Label>
                <Textarea 
                  value={proposalData.treatment}
                  onChange={(e) => setProposalData({...proposalData, treatment: e.target.value})}
                  placeholder="Descreva o tratamento agendado..." 
                  className="rounded-xl border-slate-200 min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Observações Internas</Label>
                <Textarea 
                  value={proposalData.observations}
                  onChange={(e) => setProposalData({...proposalData, observations: e.target.value})}
                  placeholder="Notas adicionais para a equipe..." 
                  className="rounded-xl border-slate-200 min-h-[60px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsCreatingProposal(false)} className="rounded-xl">Cancelar</Button>
            <Button 
              onClick={handleSaveProposal}
              variant="secondary"
              className="rounded-xl px-10 font-bold shadow-lg shadow-secondary/20"
            >
              Gerar e Salvar Proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Appointment Modal */}
      <NewAppointmentModal
        open={isScheduling}
        onOpenChange={setIsScheduling}
        initialLeadId={currentSchedulingLeadId?.toString()}
        initialLeadName={schedulingClientName}
        initialLeadPhone={schedulingClientPhone}
        onSuccess={async () => {
          if (currentSchedulingLeadId) {
            // Update in DB
            await leadsApi.update(Number(currentSchedulingLeadId), { is_scheduled: true });
            
            // Update in UI
            setLeads(prev => prev.map(l => 
              l.id === currentSchedulingLeadId ? { ...l, isScheduled: true } : l
            ));
          }
          toast({
            title: "Sucesso!",
            description: "Agendamento realizado e vinculado ao lead.",
          });
        }}
      />
      
      {/* Agendar Agora — from closed lead */}
      {closedLeadToSchedule && (
        <NewAppointmentModal
          open={isSchedulingClosed}
          onOpenChange={(v) => { 
            setIsSchedulingClosed(v); 
            if (!v) setClosedLeadToSchedule(null); 
          }}
          onSuccess={() => { 
            setIsSchedulingClosed(false); 
            setClosedLeadToSchedule(null); 
            loadLeads(); 
          }}
          initialLeadId={closedLeadToSchedule.id}
          initialLeadName={closedLeadToSchedule.name}
          initialLeadPhone={closedLeadToSchedule.phone || ''}
          initialServiceTags={closedLeadToSchedule.tags || []}
        />
      )}

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        selectedCount={selectedLeadIds.length}
      />

      <ConfirmPaymentModal
        open={isConfirmingPayment}
        onOpenChange={setIsConfirmingPayment}
        leadId={paymentLead?.id || null}
        leadValue={paymentLead?.value || 0}
        onSuccess={() => {
          loadLeads();
        }}
      />

      <ProposalViewer
        open={isViewingProposal}
        onOpenChange={setIsViewingProposal}
        proposal={selectedProposal}
        lead={selectedLead}
        companyInfo={{
          name: "SalesClin CRM",
          address: "Av. Paulista, 1000 - São Paulo, SP",
          phone: "(11) 99999-9999"
        }}
      />
    </div>
  );
};

export default SalesFunnel;
