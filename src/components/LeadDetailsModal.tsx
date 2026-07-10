import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Check, X, History, FileText, CheckSquare, Trash2, Calendar, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { leadsApi, tasksApi, clientsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ORIGIN_OPTIONS } from '@/config/funnelConfig';
import { ProposalDialog } from '@/components/funnel/ProposalDialog';
import { ExportModal } from "@/components/ExportModal";
import { ProposalViewer } from "@/components/ProposalViewer";

export function LeadDetailsModal({ lead, isOpen, onClose, onUpdate, funnels, allStages }) {
  const { toast } = useToast();
  const { professional } = useAuth();
  const [selectedLead, setSelectedLead] = useState(lead);
  
  // States from SalesFunnel
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [tempOrigin, setTempOrigin] = useState("");
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [tempValue, setTempValue] = useState(0);

  const [activeDetailsTab, setActiveDetailsTab] = useState('activities');
  const [noteText, setNoteText] = useState("");
  
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [tempActivityContent, setTempActivityContent] = useState("");
  const [activityToDeleteId, setActivityToDeleteId] = useState(null);
  
  const [selectedFunnelForEdit, setSelectedFunnelForEdit] = useState("");
  const [stageValue, setStageValue] = useState("");

  const [leadProposals, setLeadProposals] = useState([]);
  const [leadTasks, setLeadTasks] = useState([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("media");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);

  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (!professional?.id) return;
    const loadServices = async () => {
      try {
        const { catalogsApi } = await import('@/lib/api');
        const res = await catalogsApi.getAll({ professionalId: Number(professional.id) });
        if (res.success) setServices(res.data || []);
      } catch (e) {
        console.error("Error loading services:", e);
      }
    };
    loadServices();
  }, [professional]);

  
  useEffect(() => {
    if (lead) {
      setSelectedLead(lead);
      setTempName(lead.name || "");
      setTempPhone(lead.phone || "");
      setTempEmail(lead.email || "");
      setTempOrigin(lead.origin || "");
      setTempValue(lead.value || 0);
      setStageValue(lead.status || "");
      
      // Auto-detect funnel based on the lead's status
      const funnel = funnels.find(f => f.stages?.some(s => (s.id || s.code) === lead.status));
      if (funnel) {
        setSelectedFunnelForEdit(funnel.code || funnel.id);
      }
      
      setLeadProposals(lead.proposals || []);
      setLeadTasks(lead.tasks || []);
    }
  }, [lead, funnels]);

  const editStages = funnels?.find(f => (f.code || f.id) === selectedFunnelForEdit)?.stages || [];

  const handleUpdate = (field, value) => {
    setSelectedLead(prev => ({ ...prev, [field]: value }));
    onUpdate({ ...selectedLead, [field]: value });
  };

  const handleUpdateName = async () => {
    if (!tempName.trim()) return;
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { name: tempName });
      if (res.success) {
        toast({ title: "Nome atualizado!" });
        handleUpdate('name', tempName);
        setIsEditingName(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar nome", variant: "destructive" });
    }
  };

  const handleUpdatePhone = async () => {
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { phone: tempPhone });
      if (res.success) {
        toast({ title: "Telefone atualizado!" });
        handleUpdate('phone', tempPhone);
        setIsEditingPhone(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { email: tempEmail });
      if (res.success) {
        toast({ title: "Email atualizado!" });
        handleUpdate('email', tempEmail);
        setIsEditingEmail(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleUpdateValue = async () => {
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { value: tempValue });
      if (res.success) {
        toast({ title: "Valor atualizado!" });
        handleUpdate('value', tempValue);
        setIsEditingValue(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleUpdateOrigin = async () => {
    try {
      const res = await leadsApi.update(Number(selectedLead.id), { origin: tempOrigin });
      if (res.success) {
        toast({ title: "Origem atualizada!" });
        handleUpdate('origin', tempOrigin);
        setIsEditingOrigin(false);
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  
  const loadLeads = () => {
    onUpdate(); // Simply invoke the parent's update
  };

  const safeFormatDate = (dateStr) => {
    try {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      // check if valid
      if (isNaN(date.getTime())) return dateStr;
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getPriorityLabel = (val) => {
    switch(val) {
      case 'baixa': return 'Baixa';
      case 'media': return 'Média';
      case 'alta': return 'Alta';
      default: return val;
    }
  };

  const handleUpdateActivity = async (id) => {
    try {
      const res = await leadsApi.updateActivity(id, { content: tempActivityContent });
      if (res.success) {
        toast({ title: "Atividade atualizada!" });
        setEditingActivityId(null);
        onUpdate();
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar atividade", variant: "destructive" });
    }
  };

  const handleViewProposal = (proposal) => {
    // Or we could have a parent handler: onOpenProposalViewer(proposal)
    // For now, we will just pass it out to the parent or ignore if not available in modal
    // It seems there's a ProposalViewer? No, let's just log or notify for now.
    toast({ title: "Visualização de proposta indisponível aqui." });
  };

  const handleSaveTask = async () => {
    if (!newTaskTitle) return;
    setIsSavingTask(true);
    try {
      const res = await tasksApi.create({
        title: newTaskTitle,
        description: newTaskDescription,
        priority: newTaskPriority,
        dueDate: newTaskDate ? new Date(newTaskDate).toISOString() : undefined,
        leadId: Number(selectedLead.id),
        professionalId: Number(professional?.id)
      });
      if (res.success) {
        toast({ title: "Tarefa adicionada!" });
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskDate("");
        onUpdate();
      }
    } catch(e) {
      toast({ title: "Erro ao salvar tarefa", variant: "destructive" });
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    try {
      const res = await leadsApi.addActivity(Number(selectedLead.id), {
        type: 'nota',
        content: noteText,
        professionalId: Number(professional?.id)
      });
      if (res.success) {
        toast({ title: "Nota adicionada!" });
        setNoteText("");
        onUpdate(); // Trigger a full reload of the lead to get the new activity
      }
    } catch (e) {
      toast({ title: "Erro ao salvar nota", variant: "destructive" });
    }
  };

  const openWhatsApp = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  if (!selectedLead) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
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
                                  {funnels.find(f => (f.code || f.id) === selectedFunnelForEdit)?.label}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[300]">
                                {funnels.map((f: any) => (
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Canal / Origem</p>
                        {isEditingOrigin ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200 h-8">
                            <Select
                              value={tempOrigin}
                              onValueChange={setTempOrigin}
                            >
                              <SelectTrigger className="h-8 py-0 px-2 text-xs font-bold border-secondary focus:ring-secondary/20 w-44 bg-white">
                                <SelectValue placeholder="Selecione o canal" />
                              </SelectTrigger>
                              <SelectContent>
                                {ORIGIN_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <button onClick={handleUpdateOrigin} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setIsEditingOrigin(false)} className="text-slate-400 hover:text-slate-500 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/origin">
                            <p 
                              className="text-sm font-bold text-primary break-all cursor-pointer hover:text-secondary transition-colors"
                              onClick={() => {
                                setTempOrigin(selectedLead.origin || "");
                                setIsEditingOrigin(true);
                              }}
                              title={selectedLead.origin}
                            >
                              {ORIGIN_OPTIONS.find(o => o.value === selectedLead.origin)?.label || selectedLead.origin || "Não informada"}
                            </p>
                            <button 
                              onClick={() => {
                                setTempOrigin(selectedLead.origin || "");
                                setIsEditingOrigin(true);
                              }}
                              className="opacity-0 group-hover/origin:opacity-100 text-slate-300 hover:text-secondary transition-all animate-in fade-in"
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

                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Propostas Geradas</h4>
                            <Button 
                              onClick={() => setIsCreatingProposal(true)}
                              size="sm" 
                              className="h-8 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg gap-1.5 shadow-sm shadow-orange-500/20"
                            >
                              <span className="material-symbols-outlined text-[16px]">add</span>
                              Criar Proposta
                            </Button>
                          </div>
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
        lead={selectedLead}
        professional={professional}
        services={services}
        onSuccess={() => {
          leadsApi.getProposals(Number(selectedLead?.id)).then(res => {
            if (res.success) {
              setLeadProposals(res.data || []);
              const updated = { ...selectedLead, proposals: res.data || [] };
              setSelectedLead(updated);
              onUpdate(updated);
            }
          });
        }}
      />
    </>
  );
}
