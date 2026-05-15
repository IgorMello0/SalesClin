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
import { funnelConfigApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Pencil, RotateCcw } from 'lucide-react';

const COLOR_PALETTE = [
  { value: 'bg-blue-500', label: 'Azul', preview: 'bg-blue-500' },
  { value: 'bg-indigo-500', label: 'Índigo', preview: 'bg-indigo-500' },
  { value: 'bg-violet-500', label: 'Violeta', preview: 'bg-violet-500' },
  { value: 'bg-emerald-500', label: 'Esmeralda', preview: 'bg-emerald-500' },
  { value: 'bg-orange-500', label: 'Laranja', preview: 'bg-orange-500' },
  { value: 'bg-amber-500', label: 'Âmbar', preview: 'bg-amber-500' },
  { value: 'bg-red-500', label: 'Vermelho', preview: 'bg-red-500' },
  { value: 'bg-cyan-500', label: 'Ciano', preview: 'bg-cyan-500' },
  { value: 'bg-blue-600', label: 'Azul Escuro', preview: 'bg-blue-600' },
  { value: 'bg-purple-500', label: 'Roxo', preview: 'bg-purple-500' },
  { value: 'bg-pink-500', label: 'Rosa', preview: 'bg-pink-500' },
  { value: 'bg-green-600', label: 'Verde', preview: 'bg-green-600' },
  { value: 'bg-slate-500', label: 'Cinza', preview: 'bg-slate-500' },
];

const ICON_OPTIONS = [
  { value: 'person_search', label: 'Busca' },
  { value: 'handshake', label: 'Negócio' },
  { value: 'payments', label: 'Pagamento' },
  { value: 'filter_alt', label: 'Funil' },
  { value: 'shopping_cart', label: 'Carrinho' },
  { value: 'support_agent', label: 'Suporte' },
  { value: 'campaign', label: 'Marketing' },
  { value: 'loyalty', label: 'Fidelidade' },
  { value: 'medical_services', label: 'Médico' },
  { value: 'calendar_today', label: 'Agenda' },
];

interface FunnelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function FunnelSettingsDialog({ open, onOpenChange, onSaved }: FunnelSettingsDialogProps) {
  const { toast } = useToast();
  const [funnels, setFunnels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFunnel, setExpandedFunnel] = useState<number | null>(null);
  const [isAddingFunnel, setIsAddingFunnel] = useState(false);
  const [newFunnelData, setNewFunnelData] = useState({ label: '', code: '', icon: 'filter_alt' });
  const [addingStageToFunnel, setAddingStageToFunnel] = useState<number | null>(null);
  const [newStageData, setNewStageData] = useState({ label: '', code: '', color: 'bg-blue-500' });
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [editStageData, setEditStageData] = useState({ label: '', color: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) loadFunnels();
  }, [open]);

  const loadFunnels = async () => {
    setIsLoading(true);
    try {
      const res = await funnelConfigApi.getAll();
      if (res.success) setFunnels(res.data || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar funis', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFunnel = async () => {
    if (!newFunnelData.label) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const code = newFunnelData.code || newFunnelData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const res = await funnelConfigApi.create({
        code,
        label: newFunnelData.label,
        icon: newFunnelData.icon,
        order: funnels.length
      });

      if (res.success) {
        toast({ title: 'Funil criado com sucesso!' });
        setNewFunnelData({ label: '', code: '', icon: 'filter_alt' });
        setIsAddingFunnel(false);
        loadFunnels();
      } else {
        toast({ title: res.error?.message || 'Erro ao criar funil', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro ao criar funil', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFunnel = async (funnelId: number) => {
    if (!confirm('Tem certeza? Os leads deste funil serão movidos para a primeira etapa do primeiro funil ativo.')) return;

    try {
      const res = await funnelConfigApi.delete(funnelId);
      if (res.success) {
        toast({ title: 'Funil removido!' });
        loadFunnels();
      }
    } catch (e) {
      toast({ title: 'Erro ao remover funil', variant: 'destructive' });
    }
  };

  const handleAddStage = async (funnelId: number) => {
    if (!newStageData.label) {
      toast({ title: 'Nome da etapa é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const code = newStageData.code || newStageData.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const funnel = funnels.find(f => f.id === funnelId);
      const order = funnel?.stages?.length || 0;

      const res = await funnelConfigApi.addStage(funnelId, {
        code,
        label: newStageData.label,
        color: newStageData.color,
        order
      });

      if (res.success) {
        toast({ title: 'Etapa adicionada!' });
        setNewStageData({ label: '', code: '', color: 'bg-blue-500' });
        setAddingStageToFunnel(null);
        loadFunnels();
      } else {
        toast({ title: res.error?.message || 'Erro ao criar etapa', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro ao criar etapa', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStage = async (stageId: number) => {
    setIsSaving(true);
    try {
      const res = await funnelConfigApi.updateStage(stageId, {
        label: editStageData.label,
        color: editStageData.color
      });

      if (res.success) {
        toast({ title: 'Etapa atualizada!' });
        setEditingStage(null);
        loadFunnels();
      }
    } catch (e) {
      toast({ title: 'Erro ao atualizar etapa', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!confirm('Tem certeza? Os leads desta etapa serão movidos para a primeira etapa do mesmo funil.')) return;

    try {
      const res = await funnelConfigApi.deleteStage(stageId);
      if (res.success) {
        toast({ title: 'Etapa removida!' });
        loadFunnels();
      }
    } catch (e) {
      toast({ title: 'Erro ao remover etapa', variant: 'destructive' });
    }
  };

  const handleMoveStage = async (funnelIdx: number, stageIdx: number, direction: 'up' | 'down') => {
    const funnel = funnels[funnelIdx];
    const stages = [...funnel.stages];
    const targetIdx = direction === 'up' ? stageIdx - 1 : stageIdx + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    // Swap orders
    [stages[stageIdx], stages[targetIdx]] = [stages[targetIdx], stages[stageIdx]];

    try {
      await funnelConfigApi.reorder([{
        id: funnel.id,
        order: funnel.order,
        stages: stages.map((s: any, i: number) => ({ id: s.id, order: i }))
      }]);
      loadFunnels();
    } catch (e) {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Isso vai RESTAURAR todos os funis para a configuração padrão. Tem certeza?')) return;

    try {
      const res = await funnelConfigApi.seedDefaults();
      if (res.success) {
        toast({ title: 'Funis restaurados para o padrão!' });
        loadFunnels();
      }
    } catch (e) {
      toast({ title: 'Erro ao restaurar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto rounded-none sm:rounded-3xl border-0 sm:border sm:border-slate-100 bg-white p-0 shadow-2xl">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-primary/5 to-transparent border-b border-slate-100">
          <DialogTitle className="text-xl sm:text-2xl font-extrabold text-primary font-headline tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-2xl">dashboard_customize</span>
            Configurar Funis e Etapas
          </DialogTitle>
          <p className="text-slate-500 text-xs sm:text-sm mt-2">Personalize os funis e colunas do seu pipeline de vendas.</p>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-secondary animate-spin" />
            </div>
          ) : (
            <>
              {funnels.map((funnel, funnelIdx) => (
                <div key={funnel.id} className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                  {/* Funnel Header */}
                  <div 
                    className="flex items-center justify-between p-4 bg-slate-50/80 cursor-pointer hover:bg-slate-100/80 transition-colors"
                    onClick={() => setExpandedFunnel(expandedFunnel === funnel.id ? null : funnel.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg text-secondary">{funnel.icon}</span>
                      <span className="font-bold text-primary text-sm">{funnel.label}</span>
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{funnel.stages?.length || 0} etapas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFunnel(funnel.id); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Remover funil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {expandedFunnel === funnel.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Stages List */}
                  {expandedFunnel === funnel.id && (
                    <div className="p-4 space-y-2 bg-white animate-in slide-in-from-top-1 duration-200">
                      {funnel.stages?.map((stage: any, stageIdx: number) => (
                        <div key={stage.id} className="flex items-center gap-2 group">
                          <GripVertical className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                          
                          <div className={cn("w-3 h-3 rounded-full flex-shrink-0", stage.color)} />

                          {editingStage === stage.id ? (
                            <div className="flex-1 flex items-center gap-2 animate-in fade-in">
                              <Input 
                                value={editStageData.label}
                                onChange={(e) => setEditStageData({ ...editStageData, label: e.target.value })}
                                className="h-8 text-xs rounded-lg flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateStage(stage.id);
                                  if (e.key === 'Escape') setEditingStage(null);
                                }}
                              />
                              <div className="flex gap-1">
                                {COLOR_PALETTE.map(c => (
                                  <button
                                    key={c.value}
                                    onClick={() => setEditStageData({ ...editStageData, color: c.value })}
                                    className={cn(
                                      "w-5 h-5 rounded-full transition-all border-2",
                                      c.preview,
                                      editStageData.color === c.value ? "border-primary scale-125" : "border-transparent hover:scale-110"
                                    )}
                                    title={c.label}
                                  />
                                ))}
                              </div>
                              <Button onClick={() => handleUpdateStage(stage.id)} size="sm" variant="secondary" className="h-8 px-3 rounded-lg text-xs">
                                Salvar
                              </Button>
                              <Button onClick={() => setEditingStage(null)} size="sm" variant="ghost" className="h-8 px-2 rounded-lg text-xs">
                                <span className="material-symbols-outlined text-sm">close</span>
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-sm font-medium text-primary">{stage.label}</span>
                              
                              {stage.isTransition && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                                  Transição
                                </span>
                              )}
                              
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleMoveStage(funnelIdx, stageIdx, 'up')}
                                  disabled={stageIdx === 0}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 disabled:opacity-20 transition-all"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleMoveStage(funnelIdx, stageIdx, 'down')}
                                  disabled={stageIdx === funnel.stages.length - 1}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 disabled:opacity-20 transition-all"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingStage(stage.id);
                                    setEditStageData({ label: stage.label, color: stage.color });
                                  }}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-secondary hover:bg-secondary/5 transition-all"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStage(stage.id)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add Stage Form */}
                      {addingStageToFunnel === funnel.id ? (
                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome da Etapa</Label>
                              <Input 
                                value={newStageData.label}
                                onChange={(e) => setNewStageData({ ...newStageData, label: e.target.value })}
                                placeholder="Ex: Em Negociação"
                                className="h-9 text-xs rounded-lg"
                                autoFocus
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Código (opcional)</Label>
                              <Input 
                                value={newStageData.code}
                                onChange={(e) => setNewStageData({ ...newStageData, code: e.target.value })}
                                placeholder="Auto-gerado"
                                className="h-9 text-xs rounded-lg font-mono"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cor</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {COLOR_PALETTE.map(c => (
                                <button
                                  key={c.value}
                                  onClick={() => setNewStageData({ ...newStageData, color: c.value })}
                                  className={cn(
                                    "w-6 h-6 rounded-full transition-all border-2",
                                    c.preview,
                                    newStageData.color === c.value ? "border-primary scale-125 shadow-lg" : "border-transparent hover:scale-110"
                                  )}
                                  title={c.label}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Button 
                              onClick={() => handleAddStage(funnel.id)} 
                              size="sm" 
                              variant="secondary" 
                              className="rounded-lg text-xs font-bold h-8 px-4"
                              disabled={isSaving}
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Adicionar'}
                            </Button>
                            <Button 
                              onClick={() => setAddingStageToFunnel(null)} 
                              size="sm" 
                              variant="ghost" 
                              className="rounded-lg text-xs h-8"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingStageToFunnel(funnel.id);
                            setNewStageData({ label: '', code: '', color: 'bg-blue-500' });
                          }}
                          className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:text-secondary hover:border-secondary/30 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar Etapa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add Funnel Section */}
              {isAddingFunnel ? (
                <div className="p-5 border-2 border-dashed border-secondary/30 rounded-2xl bg-secondary/5 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Plus className="w-4 h-4 text-secondary" />
                    Criar Novo Funil
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome do Funil</Label>
                      <Input 
                        value={newFunnelData.label}
                        onChange={(e) => setNewFunnelData({ ...newFunnelData, label: e.target.value })}
                        placeholder="Ex: Pós-Procedimento"
                        className="h-10 rounded-xl text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ícone</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {ICON_OPTIONS.map(icon => (
                          <button
                            key={icon.value}
                            onClick={() => setNewFunnelData({ ...newFunnelData, icon: icon.value })}
                            className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center transition-all border",
                              newFunnelData.icon === icon.value 
                                ? "bg-primary text-white border-primary shadow-md" 
                                : "bg-white text-slate-400 border-slate-200 hover:border-primary/30 hover:text-primary"
                            )}
                            title={icon.label}
                          >
                            <span className="material-symbols-outlined text-base">{icon.value}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button 
                      onClick={handleCreateFunnel} 
                      variant="secondary" 
                      className="rounded-xl text-xs font-bold h-10 px-6"
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Funil'}
                    </Button>
                    <Button 
                      onClick={() => setIsAddingFunnel(false)} 
                      variant="ghost" 
                      className="rounded-xl text-xs h-10"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAddingFunnel(true)}
                    className="flex-1 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:text-secondary hover:border-secondary/30 hover:bg-secondary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Novo Funil
                  </button>
                  <button
                    onClick={handleResetDefaults}
                    className="py-3 px-4 border border-slate-200 rounded-2xl text-xs font-bold text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    title="Restaurar configuração padrão"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Padrões
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl"
          >
            Fechar
          </Button>
          <Button 
            variant="secondary"
            onClick={() => {
              onSaved();
              onOpenChange(false);
            }}
            className="rounded-xl px-8 font-bold shadow-lg shadow-secondary/20"
          >
            Aplicar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
