import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2, Plus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { clientsApi, catalogsApi, appointmentsApi, professionalsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialClientId?: string;
  initialClientName?: string;
  initialClientPhone?: string;
  initialLeadId?: string;
  initialLeadName?: string;
  initialLeadPhone?: string;
}

export function NewAppointmentModal({
  open,
  onOpenChange,
  onSuccess,
  initialDate,
  initialClientId,
  initialClientName,
  initialClientPhone,
  initialLeadId,
  initialLeadName,
  initialLeadPhone,
}: NewAppointmentModalProps) {
  const { professional } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Availability check state
  const [isTimeConflict, setIsTimeConflict] = useState(false);
  const [checkingTime, setCheckingTime] = useState(false);
  
  // Data lists
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [companyProfessionals, setCompanyProfessionals] = useState<any[]>([]);
  
  // Form state
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clientOpen, setClientOpen] = useState(false);
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [date, setDate] = useState<string>(
    initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [time, setTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Computed values for Leads/Quick Create
  const isQuickCreate = !!(initialLeadId || initialClientName);
  const quickClientData = {
    name: initialLeadName || initialClientName || "",
    phone: initialLeadPhone || initialClientPhone || "",
    leadId: initialLeadId
  };

  useEffect(() => {
    if (open && professional) {
      loadInitialData();
      if (initialClientId) {
        setSelectedClient(initialClientId);
      } else {
        setSelectedClient("");
      }
    }
  }, [open, initialClientId, professional]);

  const loadInitialData = async () => {
    if (!professional?.id) return;
    setDataLoading(true);
    try {
      const [clientsRes, profsRes] = await Promise.all([
        clientsApi.getAll({ pageSize: 100 }),
        professionalsApi.getAll({ pageSize: 50 })
      ]);
      
      if (clientsRes.success) setClients(clientsRes.data || []);
      
      if (profsRes.success && profsRes.data) {
        setCompanyProfessionals(profsRes.data);
        if (profsRes.data.length > 0) {
          const defaultProf = profsRes.data.find((p: any) => p.id.toString() === professional.id) || profsRes.data[0];
          setSelectedProfessionalId(defaultProf.id.toString());
        } else {
          setSelectedProfessionalId(professional.id);
        }
      } else {
        setSelectedProfessionalId(professional.id);
      }
    } catch (error) {
      console.error("Error loading modal initial data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (open && selectedProfessionalId) {
      loadServices(selectedProfessionalId);
    }
  }, [open, selectedProfessionalId]);

  const loadServices = async (profId: string) => {
    try {
      const res = await catalogsApi.getAll({ pageSize: 100, professionalId: Number(profId) });
      if (res.success) {
        setServices(res.data || []);
      }
    } catch (error) {
      console.error("Error loading services", error);
    }
  };

  // Real-time availability check
  useEffect(() => {
    const checkTime = async () => {
      if (!selectedProfessionalId || !date || !time) {
        setIsTimeConflict(false);
        return;
      }
      
      const duration = 60; // Default 60 min
      
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      
      setCheckingTime(true);
      try {
        const res = await appointmentsApi.checkAvailability(
          selectedProfessionalId, 
          startDateTime.toISOString(), 
          endDateTime.toISOString()
        );
        if (res.success && res.data) {
          setIsTimeConflict(!res.data.available);
        }
      } catch (e) {
        console.error("Availability check failed", e);
      } finally {
        setCheckingTime(false);
      }
    };
    
    // Add a small debounce to avoid spamming the backend while typing/selecting
    const timeout = setTimeout(checkTime, 300);
    return () => clearTimeout(timeout);
  }, [selectedProfessionalId, date, time]);

  const handleSubmit = async () => {
    if (!initialLeadId && (!selectedClient || selectedClient === "new")) {
      toast({
        title: "Erro",
        description: "Selecione um paciente para o agendamento.",
        variant: "destructive",
      });
      return;
    }

    if (!date || !time) {
      toast({
        title: "Erro",
        description: "Preencha a data e o horário.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProfessionalId) return;

    setLoading(true);
    try {
      const duration = 60; // default 60 min
      
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const response = await appointmentsApi.create({
        professionalId: Number(selectedProfessionalId),
        clientId: initialLeadId ? null : Number(selectedClient),
        leadId: initialLeadId ? Number(initialLeadId) : null,
        tags: selectedTags,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        status: 'agendado',
        notes: notes
      });

      if (response.success) {
        toast({
          title: "Sucesso!",
          description: "Agendamento criado com sucesso.",
        });
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        if (response.error?.code === 409) {
          throw new Error("Este horário já está ocupado para este profissional. Escolha outro horário.");
        }
        toast({
          title: "Erro ao criar agendamento",
          description: response.error?.message || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro de conexão com o servidor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedClient("");
    setSelectedTags([]);
    setNotes("");
    setTime("");
  };

  const selectedClientData = clients.find((c) => c.id.toString() === selectedClient);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Agendamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Professional Selector (Dynamic) */}
          {companyProfessionals.length > 1 && (
            <div className="space-y-2 flex flex-col">
              <Label className="text-sm font-medium">Profissional Responsável *</Label>
              <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId} disabled={dataLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional">
                    {companyProfessionals.find(p => p.id.toString() === selectedProfessionalId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {companyProfessionals.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id.toString()} className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-700">{prof.name}</span>
                        {prof.specialization && <span className="text-[10px] text-slate-500 font-medium">{prof.specialization}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conflict Warning */}
          {isTimeConflict && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 font-bold text-xs">X</span>
              </div>
              <div className="text-sm">
                <p className="font-bold">Profissional Indisponível</p>
                <p>Este horário já está ocupado. Por favor, escolha outro horário ou profissional.</p>
              </div>
            </div>
          )}

          {/* Patient Selector (Combobox) */}
          <div className="space-y-2 flex flex-col">
            <Label className="text-sm font-medium">Paciente *</Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientOpen}
                  className="w-full justify-between font-normal"
                  disabled={dataLoading || isQuickCreate}
                >
                  {isQuickCreate ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-bold text-primary">{quickClientData.name}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">Novo Paciente</span>
                    </div>
                  ) : (
                    selectedClient
                      ? clients.find((c) => c.id.toString() === selectedClient)?.name
                      : "Selecionar paciente..."
                  )}
                  {dataLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin shrink-0 opacity-50" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
              </PopoverTrigger>
              {!isQuickCreate && (
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar paciente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setSelectedClient(client.id.toString());
                              setClientOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClient === client.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {client.name}
                            <span className="ml-2 text-xs text-muted-foreground">{client.phone}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <div className="p-2 border-t">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-primary" onClick={() => window.location.href='/clients'}>
                          <Plus className="mr-2 h-3 w-3" /> Cadastrar novo paciente
                        </Button>
                      </div>
                    </CommandList>
                  </Command>
                </PopoverContent>
              )}
            </Popover>
          </div>

          {isQuickCreate && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 -mt-2 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="material-symbols-outlined text-sm">info</span>
                Os dados deste lead serão usados para criar o cadastro de cliente automaticamente.
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</p>
                  <p className="text-xs font-bold text-primary">{quickClientData.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</p>
                  <p className="text-xs font-bold text-primary">{quickClientData.phone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tag Selector (Services) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tags de Interesse / Procedimentos *</Label>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[40px] p-3 border rounded-xl bg-slate-50/50">
              {selectedTags.length === 0 ? (
                <span className="text-slate-400 text-xs italic">Nenhuma tag selecionada...</span>
              ) : (
                selectedTags.map(tag => (
                  <div key={tag} className="flex items-center gap-1.5 bg-white border border-secondary/20 text-secondary px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm animate-in zoom-in-95">
                    {tag}
                    <button 
                      onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                      className="hover:text-red-500 transition-colors"
                    >
                      <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {services.slice(0, 6).map(service => {
                const isSelected = selectedTags.includes(service.name);
                return (
                  <button
                    key={service.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(selectedTags.filter(t => t !== service.name));
                      } else {
                        setSelectedTags([...selectedTags, service.name]);
                      }
                    }}
                    className={cn(
                      "flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5",
                      isSelected 
                        ? "bg-secondary/10 border-secondary ring-1 ring-secondary/20 shadow-sm" 
                        : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"
                    )}
                  >
                    <span className={cn("text-[11px] font-bold truncate mb-0.5", isSelected ? "text-secondary" : "text-slate-700")}>
                      {service.name}
                    </span>
                    {service.price && (
                      <span className="text-[9px] text-slate-400 font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(service.price))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data *</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Horário *</Label>
              <Input 
                type="text" 
                placeholder="09:00" 
                value={time} 
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (val.length > 4) val = val.substring(0, 4);
                  if (val.length > 2) {
                    val = val.substring(0, 2) + ":" + val.substring(2);
                  }
                  setTime(val);
                }}
                className="font-bold text-primary"
              />
              <p className="text-[10px] text-slate-400">Formato: 24h (Ex: 09:30, 14:15)</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Observações</Label>
            <Input 
              placeholder="Ex: Paciente com urgência, primeira vez..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || dataLoading || checkingTime || isTimeConflict}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isQuickCreate ? "Salvar Paciente & Agendar" : "Confirmar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
