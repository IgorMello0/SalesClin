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
import { clientsApi, leadsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";
import { useEffect } from 'react';

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
  age: number;
  activities: Activity[];
  isScheduled?: boolean;
  observations?: string;
  city?: string;
  responsible?: string;
  tags?: string[];
  justification?: string;
  discountApplied?: boolean;
  remarketingProposals?: any[];
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

const SalesFunnel = () => {
  const { professional } = useAuth();
  const [activeFunnel, setActiveFunnel] = useState('prospecting');
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLeadStage, setNewLeadStage] = useState<string | null>(null);
  const [newLeadData, setNewLeadData] = useState({ name: '', value: '', origin: '', phone: '', email: '', socialMedia: '' });
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const [showJustification, setShowJustification] = useState(false);
  const [removedTags, setRemovedTags] = useState<string[]>([]);

  // Schedule from closed lead
  const [isSchedulingClosed, setIsSchedulingClosed] = useState(false);
  const [closedLeadToSchedule, setClosedLeadToSchedule] = useState<Lead | null>(null);

  const activeStages = useMemo(() => STAGES[activeFunnel as keyof typeof STAGES], [activeFunnel]);

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
          activities: l.activities || []
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

  useEffect(() => {
    if (professional) {
      loadLeads();
      loadServices();
      loadProfessionals();
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
    if (lead.isScheduled) {
      toast({
        title: "Já Agendado",
        description: "Este lead já possui um agendamento vinculado.",
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

  const moveLead = async (leadId: string, newStatus: string) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, status: newStatus, lastUpdate: 'Just now' };
      }
      return lead;
    }));

    try {
      const res = await leadsApi.update(Number(leadId), { status: newStatus });
      
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

    try {
      const res = await leadsApi.create({
        professional_id: Number(professional.id),
        name: newLeadData.name,
        phone: newLeadData.phone,
        email: newLeadData.email,
        socialMedia: newLeadData.socialMedia,
        value: Number(newLeadData.value.toString().replace(/\./g, "")) || 0,
        origin: newLeadData.origin,
        status: newLeadStage || 'prospect_lead',
        avatar: newLeadData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      });

      console.log("[Funnel] Resposta criação lead:", res);

      if (res.success) {
        toast({ title: "Lead Criado!", description: "O lead foi salvo no banco de dados." });
        loadLeads();
        setIsAddingLead(false);
        setNewLeadData({ name: '', value: '', origin: '', phone: '', email: '', socialMedia: '' });
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

  const handleSaveNote = () => {
    if (!noteText.trim() || !selectedLead) return;

    const newActivity: Activity = {
      id: Math.random().toString(),
      type: 'task',
      user: professional?.name || 'Consultor',
      action: 'fez uma anotação',
      content: noteText,
      date: format(new Date(), "dd/MM/yy 'às' HH:mm", { locale: ptBR }),
      icon: 'edit_note',
      color: 'bg-[#FF7A00]' // Brand Orange
    };

    setLeads(prev => prev.map(l => {
      if (l.id === selectedLead.id) {
        return { ...l, activities: [...l.activities, newActivity] };
      }
      return l;
    }));

    // Local selectedLead state update
    setSelectedLead({
      ...selectedLead,
      activities: [...selectedLead.activities, newActivity]
    });

    setNoteText('');
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
      date: format(new Date(), "dd/MM/yy 'às' HH:mm", { locale: ptBR }),
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
        date: format(new Date(), "dd/MM/yy 'às' HH:mm", { locale: ptBR }),
        icon: 'campaign',
        color: 'bg-blue-400'
      };
      lead.activities.push(remarketingActivity);
    }

    // Persist in DB
    try {
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
      
      // Update UI
      setLeads(prev => prev.map(l => {
        if (l.id === proposalLeadId) {
          return { 
            ...l, 
            status: 'comercial_proposal',
            value: newValue,
            tags: proposalData.tags,
            activities: [...l.activities, newActivity] 
          };
        }
        return l;
      }));

      toast({ title: "Sucesso", description: "Proposta salva com as novas regras." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Erro ao atualizar lead no servidor.", variant: "destructive" });
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

  const openAddLead = (stageId: string | null = null) => {
    setNewLeadStage(stageId);
    setIsAddingLead(true);
  };

  return (
    <div className="space-y-8 pb-10 min-h-screen">
      {/* Header & Funnel Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-primary font-headline tracking-tight">Comercial</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gerencie seus leads e funis de vendas.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-2xl border border-slate-200/50 w-fit">
            {FUNNELS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFunnel(f.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                  activeFunnel === f.id 
                    ? "bg-white text-primary shadow-sm scale-105" 
                    : "text-slate-400 hover:text-primary hover:bg-white/50"
                )}
              >
                <span className={cn("material-symbols-outlined text-lg", activeFunnel === f.id ? "text-secondary" : "")}>
                  {f.icon}
                </span>
                {f.label}
              </button>
            ))}
          </div>
          
          <Button 
            onClick={() => openAddLead()} 
            size="xl"
            variant="secondary"
            className="h-12 px-6 font-bold gap-2 shadow-lg shadow-secondary/20"
          >
            <span className="material-symbols-outlined">add</span>
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
        {activeStages.map((stage) => {
          const stageLeads = leads.filter(l => {
            // Regra de Roteamento: 
            // - Mostrar se NÃO for convertido
            // - OU se FOR convertido mas tiver propostas de remarketing (oportunidades pendentes)
            const hasRemarketing = l.remarketingProposals && l.remarketingProposals.length > 0;
            const isOperational = !l.convertedToClientId || hasRemarketing;
            if (!isOperational) return false;

            if (stage.id === 'prospect_attended') {
              return l.status === 'prospect_attended' || l.status.startsWith('comercial_') || l.status.startsWith('sales_');
            }
            if (stage.id === 'comercial_consult') {
              return l.status === 'comercial_consult' || l.status === 'prospect_attended';
            }
            return l.status === stage.id;
          });
          
          const isOver = dropTargetStage === stage.id;
          
          return (
            <div 
              key={stage.id} 
              className="flex-shrink-0 w-80 flex flex-col gap-4"
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
                "flex-1 min-h-[600px] rounded-2xl p-3 space-y-3 transition-all duration-200",
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
                      "premium-card p-4 cursor-grab active:cursor-grabbing group animate-in fade-in slide-in-from-top-2 relative",
                      draggedLeadId === lead.id && "opacity-40 grayscale-[0.5]"
                    )}
                  >
                    {/* Badge for Converted Leads in Prospecting View */}
                    {(activeFunnel === 'prospecting' && lead.status.startsWith('comercial_')) && (
                      <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                        CONVERTIDO
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/5">
                          {lead.avatar}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-primary group-hover:text-secondary transition-colors flex items-center break-words">{lead.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="material-symbols-outlined text-[12px] text-emerald-500">chat</span>
                            <p className="text-[10px] text-slate-500 font-bold tracking-tight">{lead.phone}</p>
                          </div>
                        </div>
                      </div>
                      <button className="text-slate-300 group-hover:text-slate-400 transition-colors">
                        <span className="material-symbols-outlined text-base">more_vert</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                      <div className="text-xs font-bold text-primary">
                        {lead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                        {lead.lastUpdate}
                      </div>
                    </div>

                    {/* Stage specific acts */}
                    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-100">
                      {stage.id === 'prospect_scheduled' && (
                        lead.isScheduled ? (
                          <div className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100">
                            Agendado
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleScheduleAppointment(lead); }}
                            disabled={isProcessingSchedule}
                            className="w-full py-2 bg-violet-100 hover:bg-violet-600 text-violet-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-violet-200"
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

                      {stage.id === 'prospect_attended' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); moveLead(lead.id, 'comercial_consult'); }}
                          className="w-full py-2 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          Encaminhar Comercial
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
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
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="indicação">Indicação</SelectItem>
                    <SelectItem value="meta ads">Meta Ads</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="influencer">Influencer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="socialMedia" className="text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Rede Social</Label>
                <Input 
                  id="socialMedia" 
                  placeholder="@usuario" 
                  className="rounded-xl border-slate-200 h-12"
                  value={newLeadData.socialMedia}
                  onChange={(e) => setNewLeadData({...newLeadData, socialMedia: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value" className="text-xs font-bold uppercase tracking-widest text-slate-400">Valor Estimado (R$)</Label>
              <Input 
                id="value" 
                type="text" 
                placeholder="2.500" 
                className="rounded-xl border-slate-200 h-12"
                value={newLeadData.value}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (!val) {
                    setNewLeadData({...newLeadData, value: ""});
                    return;
                  }
                  const formatted = new Intl.NumberFormat('pt-BR').format(parseInt(val));
                  setNewLeadData({...newLeadData, value: formatted});
                }}
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border-slate-100 bg-white p-0 flex flex-col">
          {selectedLead && (
            <>
              {/* Header Profile Section */}
              <div className="p-8 bg-gradient-to-br from-primary/5 to-transparent border-b border-slate-100">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-primary/20">
                    {selectedLead.avatar}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <h3 className="text-3xl font-extrabold text-primary font-headline tracking-tighter">{selectedLead.name}</h3>
                        <p className="text-on-surface-variant font-medium text-sm flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full bg-secondary"></span>
                          Estágio: {STAGES[activeFunnel as keyof typeof STAGES].find(s => s.id === selectedLead.status)?.label || selectedLead.status}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="rounded-full h-10 w-10 p-0 border-slate-200 text-emerald-500 hover:bg-emerald-50">
                          <span className="material-symbols-outlined text-xl">chat</span>
                        </Button>
                        <Button variant="outline" className="rounded-full h-10 w-10 p-0 border-slate-200 text-blue-500 hover:bg-blue-50">
                          <span className="material-symbols-outlined text-xl">call</span>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</p>
                        <p className="text-sm font-bold text-primary">{selectedLead.phone}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                        <p className="text-sm font-bold text-primary truncate max-w-[150px]">{selectedLead.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Idade</p>
                        <p className="text-sm font-bold text-primary">{selectedLead.age} anos</p>
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
                <div className="p-8 border-r border-slate-100 space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Observações do Sistema</h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className={cn("text-xs leading-relaxed italic", selectedLead.observations ? "text-slate-600" : "text-slate-400")}>
                        {selectedLead.observations || "Nenhuma observação registrada para este lead no momento."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Detalhes Adicionais</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Cidade</span>
                        <span className="font-bold text-primary">{selectedLead.city || "Não informada"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Conversão de Origem</span>
                        <span className="font-bold text-secondary">{selectedLead.origin || "Não informado"}</span>
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
                    <div className="p-8 border-b border-slate-100 bg-white/50 space-y-4">
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

                    {/* Scrollable Timeline */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
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
                      </div>
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
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto rounded-3xl border-slate-100 bg-white p-0 shadow-2xl">
          <div className="p-8 bg-gradient-to-br from-orange-50 to-transparent border-b border-orange-100">
            <h3 className="text-2xl font-extrabold text-primary font-headline tracking-tight">Criação de Proposta Comercial</h3>
            <p className="text-slate-500 text-sm mt-1">Defina os termos do tratamento e valores para o paciente.</p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    <SelectValue placeholder="Selecione o consultor" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProfessionals.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
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
                        <SelectValue placeholder="Selecione o motivo" />
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
                    <SelectItem value="Dr. Henrique Santos">Dr. Henrique Santos</SelectItem>
                    <SelectItem value="Dra. Marina Oliveira">Dra. Marina Oliveira</SelectItem>
                    <SelectItem value="Dr. Ricardo Lima">Dr. Ricardo Lima</SelectItem>
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
    </div>
  );
};

export default SalesFunnel;
