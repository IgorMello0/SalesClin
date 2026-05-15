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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { leadsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  professional: any;
  services: any[];
  onSuccess: () => void;
}

export function ProposalDialog({
  open,
  onOpenChange,
  lead,
  professional,
  services,
  onSuccess
}: ProposalDialogProps) {
  const { toast } = useToast();
  const [showJustification, setShowJustification] = useState(false);
  const [removedTags, setRemovedTags] = useState<string[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
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

  // Carregar profissionais e especialistas internamente
  useEffect(() => {
    if (open) {
      const loadData = async () => {
        try {
          const { professionalsApi, usuariosApi } = await import('@/lib/api');
          const profRes = await professionalsApi.getAll();
          if (profRes.success) setAllProfessionals(profRes.data || []);

          const usrRes = await usuariosApi.getAll();
          if (usrRes.success && usrRes.data) {
            const medics = usrRes.data.filter((u: any) => {
              const role = (u.role || '').toLowerCase();
              return role.includes('medico') || role.includes('médico') || role.includes('doutor') || role.includes('especialista');
            });
            setSpecialists(medics);
          }
        } catch (e) {
          console.error('[ProposalDialog] Erro ao carregar dados:', e);
        }
      };
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (lead && open) {
      setProposalData(prev => ({
        ...prev,
        title: `Proposta para ${lead.name}`,
        value: lead.value > 0 ? (lead.value * 100).toString() : '',
        salesperson: professional?.id?.toString() || '',
        tags: lead.tags || []
      }));
    }
  }, [lead, open, professional]);

  const formatCurrency = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (!numeric) return '';
    const val = Number(numeric) / 100;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, '')) / 100;
  };

  const handleSaveProposal = async () => {
    if (!lead) return;

    const newValue = parseCurrency(proposalData.value);
    const isLowerValue = newValue < lead.value;
    
    if (isLowerValue && !proposalData.justification) {
      setShowJustification(true);
      toast({ 
        title: "Justificativa Obrigatória", 
        description: "O valor é menor que o atual. Por favor, informe o motivo.", 
        variant: "destructive" 
      });
      return;
    }

    const discountApplied = isLowerValue && proposalData.justificationType === 'desconto';
    
    let remarketingData = null;
    if (isLowerValue && proposalData.justificationType === 'remocao' && removedTags.length > 0) {
      remarketingData = {
        tags: removedTags,
        date: new Date().toISOString(),
        originalValue: lead.value
      };
    }

    try {
      // 1. Salvar a Proposta Oficial
      await leadsApi.addProposal(Number(lead.id), {
        title: proposalData.title || `Proposta para ${lead.name}`,
        value: newValue,
        validUntil: proposalData.validUntil || new Date().toISOString(),
        salespersonId: proposalData.salesperson,
        specialistId: proposalData.specialist,
        tags: proposalData.tags,
        justification: proposalData.justification,
        discountApplied: discountApplied
      });

      // 2. Salvar Atividade
      await leadsApi.addActivity(Number(lead.id), {
        type: 'proposta',
        content: `${proposalData.treatment || proposalData.title} - Valor: ${formatCurrency(proposalData.value)}${discountApplied ? ' (Desconto Aplicado)' : ''}`,
        createdBy: professional?.name || 'Vendedor'
      });

      // 3. Atualizar Lead
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

      await leadsApi.update(Number(lead.id), updateData);
      
      toast({ title: "Proposta Salva e Lead Atualizado!" });
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Erro ao salvar proposta', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  value={formatCurrency(proposalData.value)}
                  onChange={(e) => setProposalData({...proposalData, value: e.target.value.replace(/\D/g, '')})}
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
                <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Selecione o consultor">
                    {allProfessionals.find(p => p.id.toString() === proposalData.salesperson)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white">
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
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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
                <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Selecione o especialista" />
                </SelectTrigger>
                <SelectContent className="bg-white">
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
          </div>
        </div>

        <DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-100">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
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
  );
}
