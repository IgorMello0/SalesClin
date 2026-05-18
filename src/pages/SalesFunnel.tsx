import React, { useState, useMemo, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewAppointmentModal } from '@/components/NewAppointmentModal';
import { ConfirmPaymentModal } from '@/components/ConfirmPaymentModal';
import { ExportModal } from "@/components/ExportModal";
import { ProposalViewer } from "@/components/ProposalViewer";
import { clientsApi, leadsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, History, Edit2, Check, X, Eye, Plus } from "lucide-react";
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
  isPaid?: boolean;
  subStatus?: string | null;
  appointments?: any[];
}

const SalesFunnel = () => {
  const { professional } = useAuth();
  const { toast } = useToast();
  
  const [activeFunnel, setActiveFunnel] = useState('prospecting');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLeadStage, setNewLeadStage] = useState<string | null>(null);
  const [newLeadData, setNewLeadData] = useState({ name: '', value: '', origin: '', phone: '', email: '' });
  
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null);
  
  const [dynamicFunnels, setDynamicFunnels] = useState<any[]>([]);
  const [isConfiguringFunnels, setIsConfiguringFunnels] = useState(false);
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [isScheduling, setIsScheduling] = useState(false);
  const [currentSchedulingLeadId, setCurrentSchedulingLeadId] = useState<string | null>(null);
  const [schedulingClientName, setSchedulingClientName] = useState<string | undefined>(undefined);
  const [schedulingClientPhone, setSchedulingClientPhone] = useState<string | undefined>(undefined);
  const [isProcessingSchedule, setIsProcessingSchedule] = useState(false);
  
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [proposalLeadId, setProposalLeadId] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);

  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentLead, setPaymentLead] = useState<{id: string, value: number} | null>(null);
  const [isSchedulingClosed, setIsSchedulingClosed] = useState(false);
  const [closedLeadToSchedule, setClosedLeadToSchedule] = useState<Lead | null>(null);

  const [leadProposals, setLeadProposals] = useState<any[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [isViewingProposal, setIsViewingProposal] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState("activities");

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [tempOrigin, setTempOrigin] = useState("");
  const [noteText, setNoteText] = useState('');

  const funnelList = useMemo(() => {
    if (dynamicFunnels.length > 0) return dynamicFunnels;
    return FUNNELS.map(f => ({ ...f, code: f.id }));
  }, [dynamicFunnels]);

  const activeStages = useMemo(() => {
    if (dynamicFunnels.length > 0) {
      const funnel = dynamicFunnels.find(f => f.code === activeFunnel || f.id === activeFunnel);
      const stages = funnel?.stages || [];
      return stages.map((s: any) => ({
        ...s,
        id: s.code || s.id.toString()
      }));
    }
    return STAGES[activeFunnel as keyof typeof STAGES] || [];
  }, [activeFunnel, dynamicFunnels]);

  const loadLeads = async () => {
    if (!professional?.id) return;
    setIsLoading(true);
    try {
      const res = await leadsApi.getAll({ professionalId: Number(professional.id) });
      if (res.success) {
        setLeads(res.data.map((l: any) => ({
          ...l,
          id: l.id.toString(),
          isScheduled: l.is_scheduled,
          lastUpdate: safeFormatDate(l.updatedAt || l.createdAt, "dd/MM/yy 'às' HH:mm"),
          activities: (l.activities || []).map((a: any) => ({
            id: a.id.toString(),
            type: a.type === 'nota' ? 'task' : a.type === 'proposta' ? 'proposal' : 'system',
            user: a.createdBy || 'Sistema',
            action: a.type === 'nota' ? 'fez uma anotação' : a.type === 'proposta' ? 'gerou uma proposta' : 'ação no sistema',
            content: a.content,
            date: safeFormatDate(a.createdAt, "dd/MM/yy 'às' HH:mm"),
            icon: a.type === 'nota' ? 'edit_note' : a.type === 'proposta' ? 'description' : 'info',
            color: a.type === 'nota' ? 'bg-[#FF7A00]' : a.type === 'proposta' ? 'bg-orange-500' : 'bg-blue-400'
          }))
        })));
      }
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFunnelConfigs = async () => {
    try {
      const { funnelConfigApi } = await import('@/lib/api');
      const res = await funnelConfigApi.getAll();
      if (res.success && res.data?.length > 0) {
        setDynamicFunnels(res.data);
      }
    } catch (e) {
      console.error("Error loading funnel configs:", e);
    }
  };

  const loadServices = async () => {
    if (!professional?.id) return;
    try {
      const { catalogsApi } = await import('@/lib/api');
      const res = await catalogsApi.getAll({ professionalId: Number(professional.id) });
      if (res.success) setServices(res.data || []);
    } catch (e) {
      console.error("Error loading services:", e);
    }
  };

  useEffect(() => {
    if (professional) {
      loadLeads();
      loadServices();
      loadFunnelConfigs();
    }
  }, [professional]);

  const handleUpdateName = async () => {
    if (!selectedLead || !tempName.trim()) return;
    try {
      await leadsApi.update(Number(selectedLead.id), { name: tempName });
      setSelectedLead({ ...selectedLead, name: tempName });
      setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, name: tempName } : l));
      setIsEditingName(false);
      toast({ title: "Nome atualizado!" });
    } catch (e) {
      toast({ title: "Erro ao atualizar nome", variant: "destructive" });
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
        loadLeads();
        setNoteText('');
        toast({ title: 'Nota salva!' });
      }
    } catch (e) {
      toast({ title: 'Erro ao salvar nota', variant: 'destructive' });
    }
  };

  const handleScheduleAppointment = async (lead: Lead) => {
    setIsProcessingSchedule(true);
    setCurrentSchedulingLeadId(lead.id);
    try {
      const searchRes = await clientsApi.getAll({ search: lead.phone || lead.name });
      if (searchRes.success && searchRes.data?.length > 0) {
        setSchedulingClientName(undefined);
        setSchedulingClientPhone(undefined);
      } else {
        setSchedulingClientName(lead.name);
        setSchedulingClientPhone(lead.phone);
      }
      setIsScheduling(true);
    } catch (error) {
      toast({ title: "Erro ao buscar cliente", variant: "destructive" });
    } finally {
      setIsProcessingSchedule(false);
    }
  };

  const moveLead = async (leadId: string, newStatus: string) => {
    const finalStatus = newStatus === 'prospect_attended' ? 'comercial_consult' : newStatus;
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: finalStatus } : l));
    try {
      const res = await leadsApi.update(Number(leadId), { status: finalStatus });
      if (res.success && res.data?.converted) {
        toast({ title: "Lead convertido em Cliente!" });
        loadLeads();
      }
    } catch (error) {
      toast({ title: "Erro ao mover lead", variant: "destructive" });
      loadLeads();
    }
  };

  const openAddLead = (stageId: string | null = null) => {
    setNewLeadStage(stageId);
    setIsAddingLead(true);
  };

  const handleExport = (format: string, scope: string) => {
    toast({ title: "Exportação Iniciada", description: `Exportando em formato ${format.toUpperCase()} (${scope === 'all' ? 'Todos' : 'Selecionados'})` });
    if (scope === 'selected') {
      setSelectedLeadIds([]);
    }
  };

  const handleAddLead = async () => {
    if (!newLeadData.name) return;
    try {
      const res = await leadsApi.create({
        professional_id: Number(professional?.id),
        name: newLeadData.name,
        phone: newLeadData.phone,
        email: newLeadData.email,
        value: Number(newLeadData.value.replace(/\D/g, "")) || 0,
        origin: newLeadData.origin,
        status: newLeadStage || 'prospect_lead',
        avatar: newLeadData.name.substring(0, 2).toUpperCase(),
      });
      if (res.success) {
        loadLeads();
        setIsAddingLead(false);
        setNewLeadData({ name: '', value: '', origin: '', phone: '', email: '' });
        toast({ title: "Lead Criado!" });
      }
    } catch (error) {
      toast({ title: "Erro ao criar lead", variant: "destructive" });
    }
  };

  const handleSubStatusChange = async (leadId: string, subStatus: string | null) => {
    try {
      await leadsApi.update(Number(leadId), { subStatus });
      setLeads(leads.map(l => l.id === leadId ? { ...l, subStatus } : l));
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const { tourActive, tourStep, tourSteps, tourHandleNext, tourHandlePrev, tourHandleClose } =
    useSectionTour('comercial', [
      { id: null, title: '💼 Comercial', description: 'Gerencie todos os seus leads aqui.', position: 'center' },
      { id: '#comercial-novo-lead', title: '➕ Novo Lead', description: 'Cadastre um novo lead.', position: 'bottom' },
      { id: '#comercial-funis', title: '🔄 Funis', description: 'Alterne entre funis.', position: 'bottom' },
      { id: '#comercial-board', title: '📦 Quadro Kanban', description: 'Arraste os leads.', position: 'center' },
    ]);

  return (
    <div className="space-y-4 sm:space-y-8 pb-10 min-h-screen">
      <TourPopover active={tourActive} step={tourStep} steps={tourSteps} onNext={tourHandleNext} onPrev={tourHandlePrev} onClose={tourHandleClose} />
      
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 min-h-[64px]">
          <div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tight">Comercial</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">Gerencie seus leads e funis de vendas.</p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 h-12">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 sm:h-12 sm:w-12 p-0 rounded-full text-slate-400">
                  <span className="material-symbols-outlined text-xl sm:text-2xl">settings</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl bg-white shadow-xl border-slate-100">
                <DropdownMenuItem onClick={() => setIsMultiSelectMode(!isMultiSelectMode)} className="cursor-pointer rounded-xl">
                  {isMultiSelectMode ? 'Cancelar Seleção' : 'Selecionar Vários'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsExportModalOpen(true)} className="cursor-pointer rounded-xl">
                  Exportar Dados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsConfiguringFunnels(true)} className="cursor-pointer rounded-xl">
                  Configurar Funis
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              id="comercial-novo-lead"
              onClick={() => openAddLead()} 
              variant="secondary"
              className="h-10 sm:h-12 px-3 sm:px-6 font-bold gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Lead</span>
            </Button>
          </div>
        </div>

        <div id="comercial-funis" className="flex overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex p-1 sm:p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/50">
            {funnelList.map((f) => (
              <button
                key={f.id || f.code}
                onClick={() => setActiveFunnel(f.code || f.id)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
                  activeFunnel === (f.code || f.id) ? "bg-white text-primary shadow-sm" : "text-slate-400"
                )}
              >
                <span className="material-symbols-outlined text-base">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id="comercial-board">
        <FunnelBoard 
          stages={activeStages}
          leads={leads}
          onAddLead={openAddLead}
          onDragOver={(e, id) => { e.preventDefault(); setDropTargetStage(id); }}
          onDrop={(e, id) => { e.preventDefault(); moveLead(draggedLeadId!, id); setDropTargetStage(null); }}
          onDragLeave={() => setDropTargetStage(null)}
          dropTargetStage={dropTargetStage}
          isMultiSelectMode={isMultiSelectMode}
          selectedLeadIds={selectedLeadIds}
          onToggleLeadSelection={(id) => setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
          onSelectLead={setSelectedLead}
          onDragStart={(e, id) => { setDraggedLeadId(id); e.dataTransfer.setData('leadId', id); }}
          draggedLeadId={draggedLeadId}
          activeFunnel={activeFunnel}
          onOpenWhatsApp={(p) => { window.location.href = `whatsapp://send?phone=${p.replace(/\D/g, '')}`; }}
          onSubStatusChange={handleSubStatusChange}
          onScheduleAppointment={handleScheduleAppointment}
          onOpenProposal={(id) => { setProposalLeadId(id); setIsCreatingProposal(true); }}
          onOpenPayment={(l) => { setPaymentLead({ id: l.id, value: l.value }); setIsConfirmingPayment(true); }}
          onMoveLead={moveLead}
          onScheduleClosed={(l) => { setClosedLeadToSchedule(l); setIsSchedulingClosed(true); }}
          onSetActiveFunnel={setActiveFunnel}
          isProcessingSchedule={isProcessingSchedule}
          currentSchedulingLeadId={currentSchedulingLeadId}
          professionalName={professional?.name}
          quickStatuses={QUICK_STATUSES}
        />
      </div>

      {/* Dialogs and Modals */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-5xl h-[92vh] sm:h-[85vh] p-0 bg-white rounded-3xl flex flex-col">
          {selectedLead && (
            <div className="flex flex-col lg:grid lg:grid-cols-3 h-full">
              <div className="p-8 border-r border-slate-100 space-y-8 overflow-y-auto">
                <header className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-2xl font-bold text-primary">
                    {selectedLead.avatar}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{selectedLead.name}</h2>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border bg-slate-50">
                      {activeStages.find(s => s.id === selectedLead.status)?.label}
                    </span>
                  </div>
                </header>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="rounded-2xl h-14 font-bold border-emerald-100 text-emerald-600 bg-emerald-50" onClick={() => window.location.href = `whatsapp://send?phone=${selectedLead.phone}`}>WhatsApp</Button>
                  <Button variant="outline" className="rounded-2xl h-14 font-bold border-orange-100 text-orange-600 bg-orange-50" onClick={() => handleScheduleAppointment(selectedLead)}>Agendar</Button>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Valor</span><span className="font-bold">{selectedLead.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Origem</span><span className="font-bold">{selectedLead.origin}</span></div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-50/30 flex flex-col p-8 overflow-y-auto">
                <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Notas..." className="min-h-[100px] mb-4" />
                <Button onClick={handleSaveNote} disabled={!noteText.trim()} variant="secondary">Salvar Nota</Button>
                
                <div className="mt-8 space-y-6">
                  {selectedLead.activities.map(act => (
                    <div key={act.id} className="flex gap-4">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0", act.color)}><span className="material-symbols-outlined text-sm">{act.icon}</span></div>
                      <div>
                        <p className="text-sm font-bold text-primary">{act.user} <span className="font-normal text-slate-400">{act.action}</span></p>
                        <p className="text-xs text-slate-600 mt-1">{act.content}</p>
                        <p className="text-[10px] text-slate-300 font-bold mt-1">{act.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProposalDialog open={isCreatingProposal} onOpenChange={setIsCreatingProposal} lead={leads.find(l => l.id === proposalLeadId)} professional={professional} services={services} onSuccess={loadLeads} />
      <NewAppointmentModal open={isScheduling} onOpenChange={setIsScheduling} initialLeadId={currentSchedulingLeadId?.toString()} initialLeadName={schedulingClientName} initialLeadPhone={schedulingClientPhone} onSuccess={() => { loadLeads(); setIsScheduling(false); }} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={handleExport} selectedCount={selectedLeadIds.length} />
      <ConfirmPaymentModal open={isConfirmingPayment} onOpenChange={setIsConfirmingPayment} leadId={paymentLead?.id || null} leadValue={paymentLead?.value || 0} onSuccess={() => loadLeads()} />
      <ProposalViewer open={isViewingProposal} onOpenChange={setIsViewingProposal} proposal={selectedProposal} lead={selectedLead} companyInfo={{ name: "SalesClin", address: "", phone: "" }} />
      <FunnelSettingsDialog open={isConfiguringFunnels} onOpenChange={setIsConfiguringFunnels} onSaved={() => { loadFunnelConfigs(); loadLeads(); }} />
      
      {/* Modal Adicionar Lead */}
      <Dialog open={isAddingLead} onOpenChange={setIsAddingLead}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-8">
          <h3 className="text-xl font-bold text-primary mb-6">Novo Lead</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome Completo</Label>
              <Input value={newLeadData.name} onChange={e => setNewLeadData({...newLeadData, name: e.target.value})} placeholder="Nome do paciente" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone / WhatsApp</Label>
              <Input value={newLeadData.phone} onChange={e => setNewLeadData({...newLeadData, phone: e.target.value})} placeholder="(00) 00000-0000" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor Estimado</Label>
                <Input value={newLeadData.value} onChange={e => setNewLeadData({...newLeadData, value: e.target.value})} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={newLeadData.origin} onValueChange={v => setNewLeadData({...newLeadData, origin: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {ORIGIN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIsAddingLead(false)}>Cancelar</Button>
            <Button variant="secondary" className="flex-1 rounded-xl font-bold" onClick={handleAddLead}>Criar Lead</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesFunnel;
