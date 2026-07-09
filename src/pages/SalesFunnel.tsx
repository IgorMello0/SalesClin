import React, { useState, useMemo, useRef } from 'react';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { clientsApi, leadsApi, tasksApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";
import { useEffect } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { ExportModal } from "@/components/ExportModal";
import { ProposalViewer } from "@/components/ProposalViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, History, FileDown, Edit2, Check, X, Eye, Plus, Trash2, CheckSquare, Calendar } from "lucide-react";
import { FunnelBoard } from '@/components/funnel/FunnelBoard';
import { ProposalDialog } from '@/components/funnel/ProposalDialog';
import { FunnelSettingsDialog } from '@/components/funnel/FunnelSettingsDialog';
import { FUNNELS, STAGES, QUICK_STATUSES, ORIGIN_OPTIONS } from '@/config/funnelConfig';
import { useSectionTour } from '@/hooks/useSectionTour';
import { TourPopover } from '@/components/onboarding/TourPopover';

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

const SalesFunnel = () => {
  const { professional } = useAuth();
  const [activeFunnel, setActiveFunnel] = useState('prospecting');
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLeadStage, setNewLeadStage] = useState<string | null>(null);
  const [newLeadData, setNewLeadData] = useState({ name: '', value: '', origin: '', phone: '', email: '' });
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfiguringFunnels, setIsConfiguringFunnels] = useState(false);
  const [dynamicFunnels, setDynamicFunnels] = useState<any[]>([]);
  const [isLoadingFunnels, setIsLoadingFunnels] = useState(true);

  // Proposal Selection State
  const [proposalSelectionOpen, setProposalSelectionOpen] = useState(false);
  const [leadForProposalSelection, setLeadForProposalSelection] = useState<any>(null);
  const [targetStageForSelection, setTargetStageForSelection] = useState<string>("");
  const [draggedCardIdForSelection, setDraggedCardIdForSelection] = useState<string>("");


  // Multi-select & Export State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Two-Level Edit & Bulk Edit States
  const [selectedFunnelForEdit, setSelectedFunnelForEdit] = useState<string>("");
  const [isBulkStageDialogOpen, setIsBulkStageDialogOpen] = useState(false);
  const [bulkSelectedFunnel, setBulkSelectedFunnel] = useState("");
  const [bulkSelectedStage, setBulkSelectedStage] = useState("");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };

    const handleMouseLeave = () => {
      isDown = false;
      el.style.cursor = 'grab';
    };

    const handleMouseUp = () => {
      isDown = false;
      el.style.cursor = 'grab';
      el.style.removeProperty('user-select');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };

    el.style.cursor = 'grab';
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterOrigin, setFilterOrigin] = useState<string>('todos');
  const [filterMenuMode, setFilterMenuMode] = useState<'main' | 'origin'>('main');
  const [filterSearchQuery, setFilterSearchQuery] = useState('');

  // Appointment scheduling state
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingClientId, setSchedulingClientId] = useState<string | undefined>(undefined);
  const [schedulingClientName, setSchedulingClientName] = useState<string | undefined>(undefined);
  const [schedulingClientPhone, setSchedulingClientPhone] = useState<string | undefined>(undefined);
  const [currentSchedulingLeadId, setCurrentSchedulingLeadId] = useState<string | null>(null);
  const [isProcessingSchedule, setIsProcessingSchedule] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const { toast } = useToast();

  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [proposalLeadId, setProposalLeadId] = useState<string | null>(null);

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
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [tempActivityContent, setTempActivityContent] = useState("");
  const [noteText, setNoteText] = useState("");
  const [activityToDeleteId, setActivityToDeleteId] = useState<string | null>(null);

  // Tasks State
  const [leadTasks, setLeadTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Mapeamento de Leads e Orçamentos para os cartões do Funil Kanban
  const boardCards = useMemo(() => {
    return leads.flatMap((lead: any) => {
      if (!lead.proposals || lead.proposals.length === 0) {
        // Lead sem propostas
        return [{
          ...lead,
          cardId: `lead-${lead.id}`, // Identificador único do cartão
          isProposal: false,
          value: Number(lead.value) || 0,
          displayName: lead.name,
          subtitle: 'Sem propostas',
          displayValue: 0
        }];
      } else {
        // Lead com propostas: cada proposta vira um cartão
        return lead.proposals.map((prop: any) => {
          // Se o status da proposta não for um ID de fase válido (por exemplo, "pending"), cai no status do lead ou comercial_proposal
          const isStageId = (status: string) => {
            return status && (status.startsWith('comercial_') || status.startsWith('sales_') || status.startsWith('prospect_'));
          };
          const stage = isStageId(prop.status) ? prop.status : 'comercial_proposal';
          
          return {
            ...lead, // herda dados do lead (nome, telefone, etc.)
            id: lead.id, // ID do lead (usado para cliques/seleções do lead)
            cardId: `proposal-${prop.id}`, // Identificador único do cartão
            isProposal: true,
            proposalId: prop.id,
            value: Number(prop.value) || 0,
            originalValue: Number(prop.originalValue) || 0,
            discountValue: Number(prop.discountValue) || 0,
            status: stage, // Define a coluna da proposta!
            displayName: lead.name,
            subtitle: prop.title,
            displayValue: Number(prop.value) || 0,
            rawProposal: prop
          };
        });
      }
    });
  }, [leads]);

  const getOriginLabel = (origin: string) => {
    return ORIGIN_OPTIONS.find(o => o.value === origin.toLowerCase())?.label || origin;
  };

  const getStageLabel = (status: string) => {
    if (dynamicFunnels.length > 0) {
      for (const f of dynamicFunnels) {
        const stage = (f.stages || []).find((s: any) => s.code === status);
        if (stage) return `${f.label}: ${stage.label}`;
      }
    }
    for (const [funnelKey, stagesList] of Object.entries(STAGES)) {
      const stage = stagesList.find(s => s.id === status);
      if (stage) {
        const funnelLabel = FUNNELS.find(f => f.id === funnelKey)?.label || funnelKey;
        return `${funnelLabel}: ${stage.label}`;
      }
    }
    return status;
  };

  const getFunnelOfStage = (status: string) => {
    if (dynamicFunnels.length > 0) {
      for (const f of dynamicFunnels) {
        const stage = (f.stages || []).find((s: any) => s.code === status);
        if (stage) return f.code || f.id;
      }
    }
    for (const [funnelKey, stagesList] of Object.entries(STAGES)) {
      const stage = stagesList.find(s => s.id === status);
      if (stage) return funnelKey;
    }
    return "";
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    window.location.href = `whatsapp://send?phone=${finalPhone}`;
  };

  const funnelList = useMemo(() => {
    if (dynamicFunnels.length > 0) return dynamicFunnels;
    return FUNNELS.map(f => ({ ...f, code: f.id })); // Garantir consistência entre id e code
  }, [dynamicFunnels]);

  const activeStages = useMemo(() => {
    if (dynamicFunnels.length > 0) {
      const funnel = dynamicFunnels.find(f => f.code === activeFunnel || f.id === activeFunnel);
      // Normalize stages: use 'code' as 'id' so lead.status matching works
      return (funnel?.stages || []).map((s: any) => ({
        ...s,
        id: s.code, // lead.status is the code string, not the numeric DB id
      }));
    }
    return STAGES[activeFunnel as keyof typeof STAGES] || [];
  }, [activeFunnel, dynamicFunnels]);

  const editStages = useMemo(() => {
    if (!selectedFunnelForEdit) return [];
    if (dynamicFunnels.length > 0) {
      const funnel = dynamicFunnels.find(f => f.code === selectedFunnelForEdit || f.id === selectedFunnelForEdit);
      return (funnel?.stages || []).map((s: any) => ({
        ...s,
        id: s.code,
      }));
    }
    return STAGES[selectedFunnelForEdit as keyof typeof STAGES] || [];
  }, [selectedFunnelForEdit, dynamicFunnels]);

  const isCurrentStageInSelectedFunnel = useMemo(() => {
    if (!selectedLead?.status || !selectedFunnelForEdit) return false;
    if (dynamicFunnels.length > 0) {
      const funnel = dynamicFunnels.find(f => f.code === selectedFunnelForEdit || f.id === selectedFunnelForEdit);
      return !!(funnel?.stages || []).find((s: any) => s.code === selectedLead.status);
    }
    const stagesList = STAGES[selectedFunnelForEdit] || [];
    return !!stagesList.find(s => s.id === selectedLead.status);
  }, [selectedFunnelForEdit, selectedLead?.status, dynamicFunnels]);

  const stageValue = isCurrentStageInSelectedFunnel && selectedLead ? selectedLead.status : "";

  const bulkStages = useMemo(() => {
    if (!bulkSelectedFunnel) return [];
    if (dynamicFunnels.length > 0) {
      const funnel = dynamicFunnels.find(f => f.code === bulkSelectedFunnel || f.id === bulkSelectedFunnel);
      return (funnel?.stages || []).map((s: any) => ({
        ...s,
        id: s.code,
      }));
    }
    return STAGES[bulkSelectedFunnel as keyof typeof STAGES] || [];
  }, [bulkSelectedFunnel, dynamicFunnels]);

    const filteredAndSortedLeads = useMemo(() => {
    let result = [...boardCards];

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      result = result.filter(card => 
        card.displayName.toLowerCase().includes(query) || 
        (card.subtitle && card.subtitle.toLowerCase().includes(query)) ||
        (card.phone && card.phone.toLowerCase().includes(query)) ||
        (card.email && card.email.toLowerCase().includes(query))
      );
    }

    // Filter by origin
    if (filterOrigin !== 'todos') {
      result = result.filter(card => card.origin && card.origin.toLowerCase() === filterOrigin.toLowerCase());
    }

    // Sort cards
    result.sort((a: any, b: any) => {
      const dateA = new Date(a.rawDate || a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.rawDate || b.updatedAt || b.createdAt || 0).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [boardCards, searchTerm, filterOrigin, sortOrder]);

  useEffect(() => {
    if (selectedLead) {
      setTempOrigin(selectedLead.origin || "");
      setIsEditingOrigin(false);
      setTempName(selectedLead.name || "");
      setIsEditingName(false);
      setTempPhone(selectedLead.phone || "");
      setIsEditingPhone(false);
      setTempEmail(selectedLead.email || "");
      setIsEditingEmail(false);
      setEditingActivityId(null);
      setActivityToDeleteId(null);

      const leadFunnel = getFunnelOfStage(selectedLead.status);
      setSelectedFunnelForEdit(leadFunnel);
    }
  }, [selectedLead?.id]);

  const handleUpdateName = async () => {
    if (!selectedLead || !tempName.trim()) return;
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { name: tempName });
      if (res.success) {
        toast({ title: "Nome atualizado!" });
        setSelectedLead({ ...selectedLead, name: tempName });
        setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, name: tempName } : l));
        setIsEditingName(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar nome", variant: "destructive" });
    }
  };

  const loadLeads = async () => {
    if (!professional?.id) return;
    setIsLoading(true);
    try {
      const res = await leadsApi.getAll({ pageSize: 1000 });
      if (res.success) {
        const mappedLeads = res.data.map((l: any) => ({
          ...l,
          id: l.id.toString(),
          isScheduled: l.isScheduled || l.is_scheduled, // Handle both just in case
          rawDate: l.updatedAt || l.createdAt,
          lastUpdate: safeFormatDate(l.updatedAt || l.createdAt, "dd/MM/yy 'às' HH:mm"),
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

  const loadFunnelConfigs = async () => {
    setIsLoadingFunnels(true);
    try {
      const { funnelConfigApi } = await import('@/lib/api');
      const res = await funnelConfigApi.getAll();
      if (res.success && res.data && res.data.length > 0) {
        setDynamicFunnels(res.data);
        // Se o funil ativo atual não existe mais nos novos dados, reseta para o primeiro
        if (!res.data.find((f: any) => f.code === activeFunnel)) {
          setActiveFunnel(res.data[0].code);
        }
      }
    } catch (e) {
      console.error("Error loading funnel configs:", e);
    } finally {
      setIsLoadingFunnels(false);
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

  useEffect(() => {
    if (professional) {
      loadLeads();
      loadServices();
      loadFunnelConfigs();
    }
  }, [professional]);

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
      loadTasks(Number(selectedLead.id));
      setActiveDetailsTab("activities");
    }
  }, [selectedLead]);

  const loadTasks = async (leadId: number) => {
    try {
      const res = await tasksApi.getAll({ leadId });
      if (res.success) {
        setLeadTasks(res.data || []);
      }
    } catch (e) {
      console.error("Error loading tasks:", e);
    }
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle.trim() || !selectedLead) return;
    setIsSavingTask(true);
    try {
      const payload = {
        title: newTaskTitle,
        description: newTaskDescription,
        status: 'pending',
        priority: newTaskPriority,
        dueDate: newTaskDate || new Date().toISOString(),
        leadId: selectedLead.id,
        assignedToId: professional?.id
      };
      const res = await tasksApi.create(payload);
      if (res.success) {
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskPriority("medium");
        setNewTaskDate("");
        loadTasks(Number(selectedLead.id));
        toast({ title: "Tarefa adicionada com sucesso" });
      }
    } catch (e) {
      toast({ title: "Erro ao adicionar tarefa", variant: "destructive" });
    } finally {
      setIsSavingTask(false);
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Baixa';
      case 'medium': return 'Média';
      case 'high': return 'Alta';
      case 'urgent': return 'Urgente';
      default: return 'Média';
    }
  };

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
    const finalStatus = newStatus;

    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, status: finalStatus, lastUpdate: 'Agora mesmo' };
      }
      return lead;
    }));

    try {
      const res = await leadsApi.update(Number(leadId), { status: finalStatus });

      if (finalStatus === 'prospect_scheduled') {
        setCurrentSchedulingLeadId(Number(leadId));
        setIsSchedulingAppointment(true);
      } else if (finalStatus === 'prospect_attended') {
        setProposalLeadId(Number(leadId));
        setProposalLeadValue(res.data.value ? Number(res.data.value) : 0);
        setIsAddingProposal(true);
      } else if (finalStatus === 'comercial_closed') {
        setPaymentLead({ id: leadId, value: res.data.value ? Number(res.data.value) : 0 } as any);
        setIsConfirmingPayment(true);
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

    const moveCard = async (cardId: string, stageId: string) => {
    const isProposal = cardId.startsWith('proposal-');
    const dbId = Number(cardId.split('-')[1]);
    const isClosingStage = stageId === 'comercial_closed' || stageId.startsWith('sales_');

    // Buscar o lead correspondente
    let targetLead: any = null;
    if (isProposal) {
      targetLead = leads.find(l => l.proposals && l.proposals.some((p: any) => p.id === dbId));
    } else {
      targetLead = leads.find(l => l.id === dbId.toString());
    }

    if (!targetLead) return;

    // Filtrar propostas ativas (não fechadas nem rejeitadas)
    const activeProposals = targetLead.proposals ? targetLead.proposals.filter((p: any) => 
      p.status !== 'accepted' && 
      p.status !== 'rejected' && 
      p.status !== 'comercial_closed' &&
      p.status !== 'sales_payment'
    ) : [];

    // Se está movendo um LEAD para uma fase de fechamento e ele tem propostas ativas
    if (!isProposal && isClosingStage && activeProposals.length > 0) {
      setLeadForProposalSelection({ ...targetLead, proposals: activeProposals });
      setTargetStageForSelection(stageId);
      setDraggedCardIdForSelection(cardId);
      setProposalSelectionOpen(true);
      return;
    }

    if (isProposal) {
      const finalStageId = stageId;

      // Atualizar localmente
      setLeads(prev => prev.map(lead => {
        if (lead.proposals && lead.proposals.some((p: any) => p.id === dbId)) {
          return {
            ...lead,
            proposals: lead.proposals.map((p: any) => {
              if (p.id === dbId) {
                return { ...p, status: finalStageId };
              }
              return p;
            })
          };
        }
        return lead;
      }));

      try {
        const res = await leadsApi.updateProposal(Number(targetLead.id), dbId, { stage: finalStageId });

        // Se a proposta foi movida para "Fechado"
        if (finalStageId === 'comercial_closed') {
          setPaymentLead({ id: targetLead.id, value: Number(res.data.value), proposalId: dbId } as any);
          setIsConfirmingPayment(true);
        }
      } catch (error) {
        toast({ title: "Erro ao mover proposta", variant: "destructive" });
        loadLeads();
      }
    } else {
      // Se for um lead puro sendo movido para fase de fechamento sem propostas
      // Permitimos que o lead seja movido mesmo sem proposta, para poder cobrar direto
      await moveLead(dbId.toString(), stageId);
    }
  };

  const handleConfirmProposalSelection = async (proposalId: number) => {
    setProposalSelectionOpen(false);
    const stageId = targetStageForSelection;
    const finalStageId = stageId;

    // Atualizar localmente a proposta selecionada para a nova fase
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadForProposalSelection.id) {
        return {
          ...lead,
          proposals: lead.proposals.map((p: any) => {
            if (p.id === proposalId) {
              return { ...p, status: finalStageId };
            }
            return p;
          })
        };
      }
      return lead;
    }));

    try {
      const res = await leadsApi.updateProposal(Number(leadForProposalSelection.id), proposalId, { stage: finalStageId });
      
      toast({ 
        title: "Proposta Avançada!", 
        description: `A proposta "${res.data.title}" foi movida para a fase selecionada.`,
      });

      if (finalStageId === 'comercial_closed') {
        setPaymentLead({ id: leadForProposalSelection.id, value: Number(res.data.value), proposalId } as any);
        setIsConfirmingPayment(true);
      }
    } catch (error) {
      toast({ title: "Erro ao mover proposta", variant: "destructive" });
      loadLeads();
    }
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId);
    e.dataTransfer.setData('cardId', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDropTargetStage(stageId);
  };

    const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId') || draggedCardId;
    if (cardId) {
      moveCard(cardId, stageId);
    }
    setDraggedCardId(null);
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

    const finalStatus = newLeadStage || 'prospect_lead';
    
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
        
        // Formatar e adicionar localmente a nova nota para atualizar na hora
        const newAct = res.data;
        const mappedAct = {
          id: newAct.id.toString(),
          type: 'task',
          user: newAct.createdBy || professional?.name || 'Consultor',
          action: 'fez uma anotação',
          content: newAct.content,
          date: safeFormatDate(newAct.createdAt, "dd/MM/yy 'às' HH:mm"),
          icon: 'edit_note',
          color: 'bg-[#FF7A00]'
        };
        
        setSelectedLead(prev => prev ? {
          ...prev,
          activities: [mappedAct, ...(prev.activities || [])]
        } : null);

        setNoteText('');
        loadLeads(); // Sincroniza em background
      } else {
        toast({ title: 'Erro ao salvar nota', description: res.error?.message, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro de conexão', variant: 'destructive' });
    }
  };

  const handleUpdatePhone = async () => {
    if (!selectedLead || !tempPhone.trim()) return;
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { phone: tempPhone });
      if (res.success) {
        toast({ title: "Telefone atualizado!" });
        setSelectedLead({ ...selectedLead, phone: tempPhone });
        setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, phone: tempPhone } : l));
        setIsEditingPhone(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar telefone", variant: "destructive" });
    }
  };

  const handleUpdateEmail = async () => {
    if (!selectedLead) return;
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { email: tempEmail });
      if (res.success) {
        toast({ title: "E-mail atualizado!" });
        setSelectedLead({ ...selectedLead, email: tempEmail });
        setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, email: tempEmail } : l));
        setIsEditingEmail(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar e-mail", variant: "destructive" });
    }
  };

  const handleUpdateActivity = async (activityId: string) => {
    if (!selectedLead || !tempActivityContent.trim()) return;
    try {
      const res = await leadsApi.updateActivity(Number(selectedLead.id), Number(activityId), {
        content: tempActivityContent
      });
      if (res.success) {
        toast({ title: "Anotação atualizada!" });
        setSelectedLead(prev => prev ? {
          ...prev,
          activities: (prev.activities || []).map(act => 
            act.id === activityId ? { ...act, content: tempActivityContent } : act
          )
        } : null);
        setEditingActivityId(null);
        loadLeads();
      } else {
        toast({ title: "Erro ao atualizar", description: res.error?.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erro de conexão", variant: "destructive" });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!selectedLead) return;
    try {
      const res = await leadsApi.deleteActivity(Number(selectedLead.id), Number(activityId));
      if (res.success) {
        toast({ title: "Anotação excluída!" });
        setSelectedLead(prev => prev ? {
          ...prev,
          activities: (prev.activities || []).filter(act => act.id !== activityId)
        } : null);
        loadLeads();
      } else {
        toast({ title: "Erro ao excluir", description: res.error?.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erro de conexão", variant: "destructive" });
    }
  };

  const confirmDeleteActivity = () => {
    if (activityToDeleteId) {
      handleDeleteActivity(activityToDeleteId);
      setActivityToDeleteId(null);
    }
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

  const handleDeleteSelectedLeads = async () => {
    if (selectedLeadIds.length === 0) return;
    const count = selectedLeadIds.length;
    const confirmed = window.confirm(`Tem certeza que deseja excluir ${count} lead${count > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      let successCount = 0;
      for (const leadId of selectedLeadIds) {
        const res = await leadsApi.delete(Number(leadId));
        if (res.success) successCount++;
      }
      toast({ title: `${successCount} lead${successCount > 1 ? 's' : ''} excluído${successCount > 1 ? 's' : ''}!` });
      setSelectedLeadIds([]);
      setIsMultiSelectMode(false);
      loadLeads();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({ title: 'Erro ao excluir leads', variant: 'destructive' });
    }
  };

  const handleBulkStageChange = async () => {
    if (!bulkSelectedStage || selectedLeadIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      let successCount = 0;
      for (const leadId of selectedLeadIds) {
        const res = await leadsApi.update(Number(leadId), { status: bulkSelectedStage });
        if (res.success) successCount++;
      }
      toast({ title: `${successCount} lead${successCount > 1 ? 's' : ''} atualizado${successCount > 1 ? 's' : ''} com sucesso!` });
      setSelectedLeadIds([]);
      setIsMultiSelectMode(false);
      setIsBulkStageDialogOpen(false);
      loadLeads();
    } catch (error) {
      console.error('Error bulk updating leads:', error);
      toast({ title: 'Erro ao atualizar estágio dos leads', variant: 'destructive' });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Tour de primeira visita
  const { tourActive, tourStep, tourSteps, tourHandleNext, tourHandlePrev, tourHandleClose } =
    useSectionTour('comercial', [
      { id: null, title: '💼 Comercial', description: 'Gerencie todos os seus leads e acompanhe cada etapa do funil até a venda. Arraste os cards entre as colunas para avançar o lead!', position: 'center' },
      { id: '#comercial-novo-lead', title: '➕ Novo Lead', description: 'Cadastre um novo lead rapidamente. Preencha os dados básicos e ele entra automaticamente no início do funil.', position: 'bottom' },
      { id: '#comercial-funis', title: '🔄 Funis de Venda', description: 'Alterne entre diferentes funis: Marketing, Comercial ou personalizados. Cada funil tem suas próprias etapas.', position: 'bottom' },
      { id: '#comercial-board', title: '📦 Quadro Kanban', description: 'Cada coluna é uma etapa do funil. Arraste os cards de lead entre as colunas para avançar na jornada de venda.', position: 'center' },
    ]);

  return (
    <div className="space-y-4 sm:space-y-8 pb-10 min-h-screen">
      <TourPopover active={tourActive} step={tourStep} steps={tourSteps} onNext={tourHandleNext} onPrev={tourHandlePrev} onClose={tourHandleClose} />
      {/* Header & Funnel Switcher */}
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="min-h-[64px] flex flex-col justify-center">
          <h2 className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tight">Comercial</h2>
          <p className="text-on-surface-variant text-xs sm:text-sm mt-1">Gerencie seus leads e funis de vendas.</p>
        </div>

        {/* Row container for Tabs and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100/50 pb-4">
          {/* Funnel Tabs — scrollable on mobile and drag-to-scroll on desktop */}
          <div 
            id="comercial-funis" 
            ref={scrollRef}
            className="flex overflow-x-auto scrollbar-hide w-full lg:max-w-[65%] xl:max-w-[75%] min-w-0 -mx-3 px-3 sm:mx-0 sm:px-0 select-none scroll-smooth"
          >
            <div className="flex p-1 sm:p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/50 w-fit shrink-0">
              {funnelList.map((f) => (
                <button
                  key={f.id || f.code}
                  onClick={() => setActiveFunnel(f.code || f.id)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap",
                    activeFunnel === (f.code || f.id)
                      ? "bg-white text-primary shadow-sm" 
                      : "text-slate-400 hover:text-primary hover:bg-white/50"
                  )}
                >
                  <span className={cn("material-symbols-outlined text-base sm:text-lg", activeFunnel === (f.code || f.id) ? "text-secondary" : "")}>
                    {f.icon}
                  </span>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 h-12">
            {/* 1. Buscar (Search) */}
            {isSearchExpanded ? (
              <div className="relative flex items-center bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200/50 w-36 sm:w-56 transition-all duration-300 animate-in fade-in slide-in-from-right-3">
                <span className="material-symbols-outlined text-slate-400 text-lg mr-1.5">search</span>
                <input 
                  type="text"
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="Buscar lead..." 
                  className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none w-full placeholder-slate-400"
                />
                <button 
                  onClick={() => { 
                    setIsSearchExpanded(false); 
                    setSearchTerm(''); 
                  }} 
                  className="text-slate-400 hover:text-slate-600 flex items-center"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                </button>
              </div>
            ) : (
              <Button 
                variant="ghost"
                onClick={() => setIsSearchExpanded(true)}
                className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Buscar leads"
              >
                <span className="material-symbols-outlined text-xl sm:text-[22px]">search</span>
              </Button>
            )}

            {/* 2. Filtrar (Filter) */}
            <div className="relative">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full flex items-center justify-center transition-colors",
                      filterOrigin !== 'todos' ? "text-secondary bg-orange-50 hover:bg-orange-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                    onClick={() => {
                      setFilterMenuMode('main');
                      setFilterSearchQuery('');
                    }}
                    title="Filtrar por origem"
                  >
                    <span className="material-symbols-outlined text-xl sm:text-[22px]">filter_list</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="absolute left-0 top-full mt-1.5 w-64 p-1.5 rounded-2xl shadow-xl border border-slate-200/50 bg-white/95 backdrop-blur-md z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {filterMenuMode === 'main' ? (
                    <div className="space-y-1">
                      {/* Search box */}
                      <div className="p-2">
                        <input
                          type="text"
                          value={filterSearchQuery}
                          onChange={(e) => setFilterSearchQuery(e.target.value)}
                          placeholder="Procurar uma propriedade..."
                          className="w-full bg-slate-50 text-slate-800 border border-slate-200/60 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all placeholder-slate-400 font-bold"
                          autoFocus
                        />
                      </div>

                      {/* Properties list */}
                      <div className="px-1 space-y-0.5">
                        {[
                          { id: 'name', label: 'Nome', icon: 'title', display: 'Aa' },
                          { id: 'phone', label: 'Telefone', icon: 'call' },
                          { id: 'email', label: 'E-mail', icon: 'mail' },
                          { id: 'origin', label: 'Origem', icon: 'sell' },
                        ]
                          .filter(p => p.label.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map((prop) => (
                            <button
                              key={prop.id}
                              type="button"
                              onClick={() => {
                                if (prop.id === 'origin') {
                                  setFilterMenuMode('origin');
                                  setFilterSearchQuery('');
                                } else {
                                  setIsSearchExpanded(true);
                                  setFilterSearchQuery('');
                                }
                              }}
                              className="w-full text-left rounded-xl py-2 px-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-xs text-slate-700 hover:text-secondary font-bold group"
                            >
                              <div className="w-5 h-5 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-secondary transition-colors">
                                {prop.display ? (
                                  <span className="text-[11px] font-black tracking-tighter leading-none">{prop.display}</span>
                                ) : (
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{prop.icon}</span>
                                )}
                              </div>
                              <span className="flex-1 truncate">{prop.label}</span>
                              {prop.id === 'origin' && (
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-secondary transition-colors" style={{ fontSize: '16px' }}>chevron_right</span>
                              )}
                            </button>
                          ))}
                      </div>

                      <div className="h-px bg-slate-100 my-1.5" />

                      <div className="px-1">
                        <button 
                          type="button"
                          className="w-full text-left rounded-xl py-2 px-3 flex items-center gap-3 hover:bg-red-50/50 transition-colors text-xs text-slate-500 hover:text-red-500 font-bold group"
                          onClick={() => {
                            setFilterOrigin('todos');
                            setSearchTerm('');
                          }}
                        >
                          <span className="material-symbols-outlined text-slate-400 group-hover:text-red-500 transition-colors" style={{ fontSize: '18px' }}>delete</span>
                          Limpar Filtros
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {/* Back button */}
                      <div className="px-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterMenuMode('main');
                            setFilterSearchQuery('');
                          }}
                          className="w-full text-left rounded-xl py-1.5 px-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-[10px] uppercase font-black tracking-wider text-slate-400 hover:text-secondary"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_left</span>
                          Voltar
                        </button>
                      </div>

                      {/* Search box for origin */}
                      <div className="p-2">
                        <input
                          type="text"
                          value={filterSearchQuery}
                          onChange={(e) => setFilterSearchQuery(e.target.value)}
                          placeholder="Procurar origem..."
                          className="w-full bg-slate-50 text-slate-800 border border-slate-200/60 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all placeholder-slate-400 font-bold"
                          autoFocus
                        />
                      </div>

                      {/* Origin sub-items list */}
                      <div className="px-1 space-y-0.5 max-h-48 overflow-y-auto scrollbar-hide">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterOrigin('todos');
                            setFilterMenuMode('main');
                          }}
                          className={cn(
                            "w-full text-left rounded-xl py-2 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-bold",
                            filterOrigin === 'todos' ? "text-secondary bg-orange-50/50" : "text-slate-700 hover:text-secondary"
                          )}
                        >
                          <span className="truncate font-bold">Todos</span>
                          {filterOrigin === 'todos' && <span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }}>check</span>}
                        </button>
                        {ORIGIN_OPTIONS
                          .filter(opt => opt.label.toLowerCase().includes(filterSearchQuery.toLowerCase()))
                          .map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setFilterOrigin(opt.value);
                                setFilterMenuMode('main');
                              }}
                              className={cn(
                                "w-full text-left rounded-xl py-2 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-bold",
                                filterOrigin === opt.value ? "text-secondary bg-orange-50/50" : "text-slate-700 hover:text-secondary"
                              )}
                            >
                              <span className="truncate font-bold">{opt.label}</span>
                              {filterOrigin === opt.value && <span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }}>check</span>}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 3. Ordenar (Sort) */}
            <div className="relative">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full flex items-center justify-center transition-colors",
                      sortOrder !== 'newest' ? "text-secondary bg-orange-50 hover:bg-orange-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                    title="Ordenar leads"
                  >
                    <span className="material-symbols-outlined text-xl sm:text-[22px]">swap_vert</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="absolute left-0 top-full mt-1.5 w-44 p-1.5 rounded-2xl shadow-xl border border-slate-200/50 bg-white/95 backdrop-blur-md z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Ordenar por data</div>
                  <button 
                    type="button"
                    onClick={() => setSortOrder('newest')} 
                    className={cn(
                      "w-full text-left rounded-xl py-2 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-bold",
                      sortOrder === 'newest' ? "text-secondary bg-orange-50/50" : "text-slate-700 hover:text-secondary"
                    )}
                  >
                    <span className="font-bold">Mais Novos</span>
                    {sortOrder === 'newest' && <span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }}>check</span>}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSortOrder('oldest')} 
                    className={cn(
                      "w-full text-left rounded-xl py-2 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs font-bold",
                      sortOrder === 'oldest' ? "text-secondary bg-orange-50/50" : "text-slate-700 hover:text-secondary"
                    )}
                  >
                    <span className="font-bold">Mais Antigos</span>
                    {sortOrder === 'oldest' && <span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }}>check</span>}
                  </button>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 4. Seleção Múltipla */}
            <Button 
              variant="ghost"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                if (isMultiSelectMode) setSelectedLeadIds([]);
              }}
              className={cn(
                "h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full flex items-center justify-center transition-colors",
                isMultiSelectMode ? "text-secondary bg-orange-50 hover:bg-orange-100" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
              title={isMultiSelectMode ? "Desativar seleção múltipla" : "Ativar seleção múltipla"}
            >
              <span className="material-symbols-outlined text-xl sm:text-[22px]">{isMultiSelectMode ? 'close' : 'checklist'}</span>
            </Button>

            {/* 5. Configurações (Sheet) */}
            <div className="flex-shrink-0">
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost"
                    className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Configurações do funil"
                  >
                    <span className="material-symbols-outlined text-xl sm:text-[22px]">tune</span>
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="right"
                  className="w-full sm:max-w-md p-6 bg-white border-l border-slate-100 flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined text-3xl text-secondary">tune</span>
                        <h3 className="text-xl font-extrabold font-headline tracking-tight">Opções do Funil</h3>
                      </div>
                      <p className="text-slate-500 text-xs sm:text-sm font-medium">
                        Gerencie visualização, exportação de dados e etapas do pipeline comercial.
                      </p>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Actions List */}
                    <div className="space-y-3">
                      {/* Action 1: Exportar Dados */}
                      <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="w-full text-left p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-orange-50/30 hover:border-orange-100 transition-all duration-300 flex items-start gap-4 group active:scale-[0.99]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-orange-100 group-hover:text-secondary flex items-center justify-center shrink-0 transition-colors">
                          <span className="material-symbols-outlined text-xl">download</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-primary group-hover:text-secondary transition-colors">Exportar Leads</h4>
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-secondary transition-colors font-bold">chevron_right</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            Exporte a lista completa de leads em formato CSV ou planilha Excel.
                          </p>
                        </div>
                      </button>

                      {/* Action 3: Configurar Funis e Etapas */}
                      <button
                        onClick={() => setIsConfiguringFunnels(true)}
                        className="w-full text-left p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200/80 transition-all duration-300 flex items-start gap-4 group active:scale-[0.99]"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 flex items-center justify-center shrink-0 transition-colors">
                          <span className="material-symbols-outlined text-xl">dashboard_customize</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-primary group-hover:text-secondary transition-colors">Personalizar Pipelines</h4>
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-secondary transition-colors font-bold">chevron_right</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            Adicione, ordene ou alterne entre diferentes funis de vendas.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <Button 
              id="comercial-novo-lead"
              onClick={() => openAddLead()} 
              size="xl"
              variant="secondary"
              className="h-10 sm:h-12 px-3 sm:px-6 font-bold gap-1 sm:gap-2 shadow-lg shadow-secondary/20 text-sm flex-shrink-0"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Novo Lead</span>
              <span className="sm:hidden">Novo</span>
            </Button>

            {/* Lixeira vermelha — aparece quando seleção múltipla está ativa */}
            {isMultiSelectMode && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setBulkSelectedFunnel(activeFunnel);
                    setBulkSelectedStage("");
                    setIsBulkStageDialogOpen(true);
                  }}
                  disabled={selectedLeadIds.length === 0}
                  variant="ghost"
                  className={cn(
                    "h-10 sm:h-12 px-3 sm:px-4 rounded-xl font-bold gap-1.5 text-sm flex-shrink-0 transition-all duration-200",
                    selectedLeadIds.length > 0
                      ? "bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20"
                      : "bg-orange-50 text-orange-300 cursor-not-allowed"
                  )}
                  title={selectedLeadIds.length > 0 ? `Alterar estágio de ${selectedLeadIds.length} lead(s)` : "Selecione leads para alterar estágio"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>swap_horiz</span>
                  <span className="hidden sm:inline">Mudar Estágio</span>
                </Button>

                <Button
                  onClick={handleDeleteSelectedLeads}
                  disabled={selectedLeadIds.length === 0}
                  variant="ghost"
                  className={cn(
                    "h-10 sm:h-12 px-3 sm:px-4 rounded-xl font-bold gap-1.5 text-sm flex-shrink-0 transition-all duration-200",
                    selectedLeadIds.length > 0
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                      : "bg-red-50 text-red-300 cursor-not-allowed"
                  )}
                  title={selectedLeadIds.length > 0 ? `Excluir ${selectedLeadIds.length} lead(s)` : "Selecione leads para excluir"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                  {selectedLeadIds.length > 0 && (
                    <span className="hidden sm:inline">{selectedLeadIds.length}</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board */}
            <FunnelBoard 
        stages={activeStages}
        leads={filteredAndSortedLeads}
        onAddLead={openAddLead}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={() => setDropTargetStage(null)}
        dropTargetStage={dropTargetStage}
        isMultiSelectMode={isMultiSelectMode}
        selectedLeadIds={selectedLeadIds}
        onToggleLeadSelection={toggleLeadSelection}
        onSelectLead={setSelectedLead}
        onDragStart={handleDragStart}
        draggedCardId={draggedCardId}
        activeFunnel={activeFunnel}
        onOpenWhatsApp={openWhatsApp}
        onSubStatusChange={handleSubStatusChange}
        onScheduleAppointment={handleScheduleAppointment}
        onOpenProposal={(id) => {
          setProposalLeadId(id);
          setIsCreatingProposal(true);
        }}
        onOpenPayment={(card) => {
          setPaymentLead({ id: card.id, value: card.value, proposalId: card.proposalId || null } as any);
          setIsConfirmingPayment(true);
        }}
        onMoveLead={moveCard}
        onScheduleClosed={(lead) => {
          setClosedLeadToSchedule(lead);
          setIsSchedulingClosed(true);
        }}
        onSetActiveFunnel={setActiveFunnel}
        isProcessingSchedule={isProcessingSchedule}
        currentSchedulingLeadId={currentSchedulingLeadId}
        professionalName={professional?.name}
        quickStatuses={QUICK_STATUSES}
      />

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
                    <SelectValue placeholder="Selecione...">
                      {ORIGIN_OPTIONS.find(opt => opt.value === newLeadData.origin)?.label}
                    </SelectValue>
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

      {/* Bulk Stage Change Dialog */}
      <Dialog open={isBulkStageDialogOpen} onOpenChange={setIsBulkStageDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-100 p-6 rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-3xl text-secondary">swap_horiz</span>
              <DialogTitle className="text-xl font-extrabold font-headline tracking-tight">Alterar Estágio em Lote</DialogTitle>
            </div>
            <p className="text-slate-500 text-sm font-medium">
              Selecione o novo funil e estágio para mover os {selectedLeadIds.length} leads selecionados de uma vez só.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Funil de Vendas</Label>
              <Select
                value={bulkSelectedFunnel}
                onValueChange={(val) => {
                  setBulkSelectedFunnel(val);
                  setBulkSelectedStage(""); // Reset stage selection when funnel changes
                }}
              >
                <SelectTrigger className="w-full border-slate-200 focus:ring-secondary/20 rounded-xl h-11">
                  <SelectValue placeholder="Selecione o Funil">
                    {funnelList.find(f => (f.code || f.id) === bulkSelectedFunnel)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[350]">
                  {funnelList.map((f: any) => (
                    <SelectItem key={f.code || f.id} value={f.code || f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Novo Estágio</Label>
              <Select
                value={bulkSelectedStage}
                onValueChange={setBulkSelectedStage}
                disabled={!bulkSelectedFunnel}
              >
                <SelectTrigger className="w-full border-slate-200 focus:ring-secondary/20 rounded-xl h-11">
                  <SelectValue placeholder="Selecione o Estágio">
                    {bulkStages.find(s => (s.code || s.id) === bulkSelectedStage)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[350]">
                  {bulkStages.map((s: any) => (
                    <SelectItem key={s.code || s.id} value={s.code || s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsBulkStageDialogOpen(false)} 
              className="rounded-xl"
              disabled={isBulkUpdating}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkStageChange} 
              variant="secondary" 
              className="rounded-xl px-6 font-bold"
              disabled={!bulkSelectedStage || isBulkUpdating}
            >
              {isBulkUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Atualizar Leads"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Details Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="sm:max-w-6xl max-h-[95vh] sm:h-[90vh] overflow-hidden rounded-none sm:rounded-[2rem] border-0 sm:border sm:border-slate-100 bg-slate-50 p-0 flex flex-col lg:flex-row w-full shadow-2xl">
          {selectedLead && (
            <>
              {/* Left Sidebar */}
              <div className="w-full lg:w-[400px] shrink-0 h-auto lg:h-full overflow-y-auto custom-scrollbar bg-white lg:border-r border-b lg:border-b-0 border-slate-100 flex flex-col p-6 sm:p-8 z-20 relative">
                <div className="flex flex-col gap-6 items-center w-full">
                  <div className="w-24 h-24 rounded-[1.75rem] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-4xl font-extrabold text-white shadow-xl shadow-primary/20 ring-4 ring-slate-50 shrink-0">
                    {selectedLead.avatar}
                  </div>
                  <div className="flex-1 space-y-4 w-full flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center w-full gap-3">
                      <div className="w-full flex items-center justify-center">
                        {isEditingName ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 w-full">
                            <Input 
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              className="text-2xl text-center font-extrabold text-primary font-headline tracking-tighter h-12 rounded-xl border-secondary focus-visible:ring-secondary/20 bg-white w-full"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateName();
                                if (e.key === 'Escape') setIsEditingName(false);
                              }}
                            />
                            <div className="flex items-center gap-1">
                              <Button 
                                onClick={handleUpdateName}
                                variant="secondary" 
                                size="sm" 
                                className="h-9 w-9 rounded-xl p-0"
                              >
                                <span className="material-symbols-outlined text-sm">check</span>
                              </Button>
                              <Button 
                                onClick={() => setIsEditingName(false)}
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 rounded-xl p-0 text-slate-400"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 group/name relative justify-center w-full">
                            <h3 
                              className="text-2xl font-extrabold text-primary font-headline tracking-tighter cursor-pointer hover:text-primary/80 transition-colors text-center"
                              onClick={() => setIsEditingName(true)}
                            >
                              {selectedLead.name}
                            </h3>
                            <button 
                              onClick={() => setIsEditingName(true)}
                              className="opacity-0 group-hover/name:opacity-100 text-slate-300 hover:text-secondary transition-all"
                            >
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2 w-full items-center justify-center">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse-subtle"></span>
                            <span className="text-on-surface-variant font-medium text-xs sm:text-sm">Estágio:</span>
                          </div>
                          
                          <div className="flex gap-2 items-center justify-center flex-wrap w-full">
                            <Select
                              value={selectedFunnelForEdit}
                              onValueChange={(newFunnel) => {
                                setSelectedFunnelForEdit(newFunnel);
                              }}
                            >
                              <SelectTrigger className="h-7 py-0 px-2 text-xs font-semibold border-slate-200 focus:ring-secondary/20 bg-white w-[130px] rounded-lg">
                                <SelectValue placeholder="Selecione o Funil">
                                  {funnelList.find(f => (f.code || f.id) === selectedFunnelForEdit)?.label}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[300]">
                                {funnelList.map((f: any) => (
                                  <SelectItem key={f.code || f.id} value={f.code || f.id} className="text-xs rounded-lg pl-8">
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={stageValue}
                              onValueChange={async (newStatus) => {
                                try {
                                  const res = await leadsApi.update(Number(selectedLead.id), { status: newStatus });
                                  if (res.success) {
                                    toast({ title: "Estágio do lead atualizado!" });
                                    setSelectedLead({ ...selectedLead, status: newStatus });
                                    loadLeads();
                                  }
                                } catch (e) {
                                  toast({ title: "Erro ao atualizar estágio", variant: "destructive" });
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 py-0 px-2 text-xs font-bold border-secondary focus:ring-secondary/20 bg-white min-w-[130px] max-w-[200px] rounded-lg">
                                <SelectValue placeholder="Selecione a Etapa">
                                  {editStages.find(s => (s.id || s.code) === stageValue)?.label || "Selecione a Etapa"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[300]">
                                {editStages.map((s: any) => (
                                  <SelectItem key={s.id || s.code} value={s.id || s.code} className="text-xs rounded-lg pl-8">
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      <div className="flex gap-3 w-full mt-2">
                        <Button 
                          onClick={() => openWhatsApp(selectedLead.phone)}
                          variant="outline" 
                          className="rounded-full flex-1 h-12 p-0 border-slate-200 text-emerald-500 hover:bg-emerald-50 shadow-sm"
                          title="Abrir WhatsApp"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                        </Button>
                        <Button 
                          onClick={() => window.open(`tel:${selectedLead.phone}`)}
                          variant="outline" 
                          className="rounded-full flex-1 h-12 p-0 border-slate-200 text-blue-500 hover:bg-blue-50 shadow-sm"
                          title="Ligar"
                        >
                          <span className="material-symbols-outlined text-xl">call</span>
                        </Button>
                      </div>
                    </div>
                    
                    <hr className="border-slate-100 my-4 w-full" />
                    <div className="flex flex-col gap-4 w-full">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</p>
                        {isEditingPhone ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200 h-8">
                            <Input 
                              value={tempPhone}
                              onChange={(e) => setTempPhone(e.target.value)}
                              className="h-8 py-0 px-2 text-xs font-bold border-secondary focus-visible:ring-secondary/20 w-32 bg-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdatePhone();
                                if (e.key === 'Escape') setIsEditingPhone(false);
                              }}
                            />
                            <button onClick={handleUpdatePhone} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setIsEditingPhone(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/phone h-8">
                            <p 
                              className="text-sm font-bold text-primary cursor-pointer hover:text-secondary transition-colors"
                              onClick={() => setIsEditingPhone(true)}
                            >
                              {selectedLead.phone || "Sem telefone"}
                            </p>
                            <button 
                              onClick={() => setIsEditingPhone(true)}
                              className="opacity-0 group-hover/phone:opacity-100 text-slate-300 hover:text-secondary transition-all animate-in fade-in"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                        {isEditingEmail ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200 h-8">
                            <Input 
                              value={tempEmail}
                              onChange={(e) => setTempEmail(e.target.value)}
                              className="h-8 py-0 px-2 text-xs font-bold border-secondary focus-visible:ring-secondary/20 w-44 bg-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateEmail();
                                if (e.key === 'Escape') setIsEditingEmail(false);
                              }}
                            />
                            <button onClick={handleUpdateEmail} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setIsEditingEmail(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/email">
                            <p 
                              className="text-sm font-bold text-primary break-all cursor-pointer hover:text-secondary transition-colors"
                              onClick={() => setIsEditingEmail(true)}
                              title={selectedLead.email}
                            >
                              {selectedLead.email || "Sem e-mail"}
                            </p>
                            <button 
                              onClick={() => setIsEditingEmail(true)}
                              className="opacity-0 group-hover/email:opacity-100 text-slate-300 hover:text-secondary transition-all animate-in fade-in"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor do Lead</p>
                        <p className="text-sm font-bold text-secondary">{selectedLead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                {/* Right Side: Main Area (Tabs + Timeline) */}
                <div className="flex-1 bg-slate-50/50 flex flex-col min-w-0 h-full relative overflow-hidden">
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
                        <div className="px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 z-10 sticky top-0 flex items-center h-16 shadow-sm">
                          <TabsList className="bg-transparent border-0 h-full p-0 gap-8 w-full justify-start">
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
                            <TabsTrigger 
                              value="tasks" 
                              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-xs font-bold uppercase tracking-widest text-slate-400 gap-2"
                            >
                              <CheckSquare className="w-4 h-4" />
                              Tarefas
                              {leadTasks.filter(t => t.status !== 'completed').length > 0 && (
                                <span className="bg-secondary text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                  {leadTasks.filter(t => t.status !== 'completed').length}
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
                                  "absolute -left-[32px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white z-10",
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
                                      {editingActivityId === act.id ? (
                                        <div className="space-y-2 animate-in fade-in duration-200">
                                          <Textarea
                                            value={tempActivityContent}
                                            onChange={(e) => setTempActivityContent(e.target.value)}
                                            className="text-xs text-slate-600 leading-relaxed font-medium border-secondary focus:ring-secondary/20 min-h-[60px] bg-white rounded-xl"
                                            autoFocus
                                            onKeyDown={(e) => {
                                              if (e.key === 'Escape') setEditingActivityId(null);
                                            }}
                                          />
                                          <div className="flex justify-end gap-2">
                                            <Button 
                                              onClick={() => handleUpdateActivity(act.id)} 
                                              variant="secondary" 
                                              size="sm" 
                                              className="h-8 px-3 text-[10px] font-bold gap-1 rounded-lg"
                                            >
                                              <Check className="w-3.5 h-3.5" /> Salvar
                                            </Button>
                                            <Button 
                                              onClick={() => setEditingActivityId(null)} 
                                              variant="ghost" 
                                              size="sm" 
                                              className="h-8 px-3 text-[10px] font-bold gap-1 text-slate-400 rounded-lg"
                                            >
                                              <X className="w-3.5 h-3.5" /> Cancelar
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-4 border-secondary/20 group/note relative">
                                          <p className="text-xs text-slate-600 leading-relaxed font-medium pr-14">{act.content}</p>
                                          {act.type === 'task' && (
                                            <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-all duration-200 animate-in fade-in">
                                              <button 
                                                onClick={() => {
                                                  setEditingActivityId(act.id);
                                                  setTempActivityContent(act.content || "");
                                                }} 
                                                className="text-slate-400 hover:text-secondary transition-colors p-1 rounded hover:bg-slate-50"
                                                title="Editar Anotação"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button 
                                                onClick={() => setActivityToDeleteId(act.id)} 
                                                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                                                title="Excluir Anotação"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      )}
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

                        <TabsContent value="tasks" className="m-0 p-6 sm:p-8 outline-none min-h-full bg-slate-50/50 flex flex-col gap-6">
                          {/* Add Task Form */}
                          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Adicionar Nova Tarefa</h4>
                            
                            <div className="space-y-3">
                              <Input 
                                placeholder="Título da tarefa..." 
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="h-10 text-xs rounded-xl bg-slate-50 border border-slate-100 focus-visible:ring-secondary/20"
                              />
                              <Textarea 
                                placeholder="Descrição (opcional)..." 
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                                className="text-xs rounded-xl bg-slate-50 border border-slate-100 focus-visible:ring-secondary/20 min-h-[60px]"
                              />
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Prioridade</label>
                                  <Select value={newTaskPriority} onValueChange={(val: any) => setNewTaskPriority(val)}>
                                    <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 border border-slate-100 focus:ring-secondary/20">
                                      <SelectValue>{getPriorityLabel(newTaskPriority)}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="low">Baixa</SelectItem>
                                      <SelectItem value="medium">Média</SelectItem>
                                      <SelectItem value="high">Alta</SelectItem>
                                      <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Data e Hora</label>
                                  <Input 
                                    type="datetime-local" 
                                    value={newTaskDate}
                                    onChange={(e) => setNewTaskDate(e.target.value)}
                                    className="h-10 text-xs rounded-xl bg-slate-50 border border-slate-100 focus-visible:ring-secondary/20 font-headline"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end pt-2">
                                <Button 
                                  onClick={handleSaveTask}
                                  disabled={!newTaskTitle.trim() || isSavingTask}
                                  variant="secondary"
                                  className="rounded-xl px-6 font-bold h-10 gap-2"
                                >
                                  {isSavingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                                  Adicionar Tarefa
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* List of Tasks */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Tarefas do Lead</h4>
                            
                            {leadTasks.length === 0 ? (
                              <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 border-dashed">
                                <p className="text-sm text-slate-400 italic">Nenhuma tarefa registrada.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {leadTasks.map(task => (
                                  <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-3 shadow-sm hover:border-secondary/20 transition-colors">
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-secondary border-secondary text-white' : 'border-slate-300'}`}>
                                      {task.status === 'completed' && <Check className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-bold ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</p>
                                      {task.description && (
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                                      )}
                                      <div className="flex flex-wrap items-center gap-3 mt-3">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            task.priority === 'urgent' ? 'bg-red-500' :
                                            task.priority === 'high' ? 'bg-orange-500' :
                                            task.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                                          }`}></span>
                                          {getPriorityLabel(task.priority)}
                                        </div>
                                        {task.dueDate && (
                                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">
                                            <Calendar className="w-3 h-3" />
                                            {safeFormatDate(task.dueDate)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Proposal Dialog */}
      <ProposalDialog 
        open={isCreatingProposal}
        onOpenChange={setIsCreatingProposal}
        lead={leads.find(l => l.id === proposalLeadId)}
        professional={professional}
        services={services}
        onSuccess={loadLeads}
      />
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
        proposalId={(paymentLead as any)?.proposalId || null}
        onSuccess={() => {
          loadLeads();
        }}
      />

      {/* Modal de Seleção de Proposta para Avançar de Fase */}
      <Dialog open={proposalSelectionOpen} onOpenChange={setProposalSelectionOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl border-0 bg-white p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-primary">
              Selecionar Proposta
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-slate-500 text-sm">
              O lead <strong>{leadForProposalSelection?.name}</strong> possui múltiplas propostas. Escolha qual delas será avançada para a fase de <strong>{getStageLabel(targetStageForSelection)}</strong>:
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {leadForProposalSelection?.proposals?.map((prop: any) => (
                <button
                  key={prop.id}
                  onClick={() => handleConfirmProposalSelection(prop.id)}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-primary hover:bg-orange-50/50 transition-all duration-200 group flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-bold text-slate-800 group-hover:text-primary transition-colors text-sm">
                      {prop.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 font-bold">
                      {Number(prop.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">
                    arrow_forward_ios
                  </span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setProposalSelectionOpen(false)} className="rounded-xl w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <ProposalViewer
        open={isViewingProposal}
        onOpenChange={setIsViewingProposal}
        proposal={selectedProposal}
        lead={selectedLead}
        companyInfo={{
          name: "SellClin CRM",
          address: "Av. Paulista, 1000 - São Paulo, SP",
          phone: "(11) 99999-9999"
        }}
      />

      {/* Exclusão de Anotação Confirm Dialog */}
      <Dialog open={!!activityToDeleteId} onOpenChange={(open) => { if (!open) setActivityToDeleteId(null); }}>
        <DialogContent className="w-[90vw] max-w-[400px] border-0 shadow-2xl rounded-3xl bg-card p-6 text-foreground z-[310]">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-base font-bold font-headline text-primary">Confirmar Exclusão</DialogTitle>
              <p className="text-xs text-muted-foreground">Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex w-full gap-3 mt-2">
              <Button
                variant="ghost"
                onClick={() => setActivityToDeleteId(null)}
                className="flex-1 rounded-xl h-10 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDeleteActivity}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-10 text-xs font-bold shadow-none cursor-pointer"
              >
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FunnelSettingsDialog 
        open={isConfiguringFunnels}
        onOpenChange={setIsConfiguringFunnels}
        onSaved={() => {
          loadFunnelConfigs();
          loadLeads();
        }}
      />
    </div>
  );
};

export default SalesFunnel;
