import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { leadStatusesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Pencil } from 'lucide-react';

const COLOR_PALETTE = [
  { value: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Cinza Claro', preview: 'bg-slate-200' },
  { value: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Âmbar Claro', preview: 'bg-amber-200' },
  { value: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Azul Claro', preview: 'bg-blue-200' },
  { value: 'bg-red-100 text-red-700 border-red-200', label: 'Vermelho Claro', preview: 'bg-red-200' },
  { value: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Verde Claro', preview: 'bg-emerald-200' },
  { value: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Roxo Claro', preview: 'bg-purple-200' },
  { value: 'bg-pink-100 text-pink-700 border-pink-200', label: 'Rosa Claro', preview: 'bg-pink-200' },
  { value: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'Índigo Claro', preview: 'bg-indigo-200' },
  { value: 'bg-slate-800 text-slate-100 border-slate-700', label: 'Preto', preview: 'bg-slate-800' },
];

export default function LeadStatusesSettingsView({ name }: { name?: string }) {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusData, setNewStatusData] = useState({ label: '', color: 'bg-purple-100 text-purple-700 border-purple-200' });
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [editStatusData, setEditStatusData] = useState({ label: '', color: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    setIsLoading(true);
    try {
      const res = await leadStatusesApi.getAll();
      if (res.success) setStatuses(res.data || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar status', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatusData.label) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await leadStatusesApi.create({
        label: newStatusData.label,
        color: newStatusData.color
      });

      if (res.success) {
        toast({ title: 'Status criado com sucesso!' });
        setNewStatusData({ label: '', color: 'bg-purple-100 text-purple-700 border-purple-200' });
        setIsAddingStatus(false);
        loadStatuses();
      } else {
        toast({ title: res.error?.message || 'Erro ao criar status', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro ao criar status', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (statusId: number) => {
    setIsSaving(true);
    try {
      const res = await leadStatusesApi.update(statusId, {
        label: editStatusData.label,
        color: editStatusData.color
      });

      if (res.success) {
        toast({ title: 'Status atualizado!' });
        setEditingStatus(null);
        loadStatuses();
      }
    } catch (e) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStatus = (statusId: number) => {
    askConfirmation(
      'Remover Status',
      'Tem certeza? Você não poderá mais usar este status para novos leads.',
      async () => {
        try {
          const res = await leadStatusesApi.delete(statusId);
          if (res.success) {
            toast({ title: 'Status removido!' });
            loadStatuses();
          } else {
             toast({ title: res.error?.message || 'Erro ao remover status', variant: 'destructive' });
          }
        } catch (e) {
          toast({ title: 'Erro ao remover status', variant: 'destructive' });
        }
      }
    );
  };

  const handleMoveStatus = async (statusIdx: number, direction: 'up' | 'down') => {
    const newStatuses = [...statuses];
    const targetIdx = direction === 'up' ? statusIdx - 1 : statusIdx + 1;
    if (targetIdx < 0 || targetIdx >= newStatuses.length) return;

    [newStatuses[statusIdx], newStatuses[targetIdx]] = [newStatuses[targetIdx], newStatuses[statusIdx]];
    
    // Update visual orders locally
    const reordered = newStatuses.map((s, i) => ({ ...s, order: i }));
    setStatuses(reordered);

    try {
      await leadStatusesApi.reorder(reordered.map(s => ({ id: s.id, order: s.order })));
    } catch (e) {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
      loadStatuses(); // rollback
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-slate-500 font-medium">
          Gerencie os status rápidos que aparecem no card dos seus Negócios.
        </p>
        <Button 
          onClick={() => {
            setIsAddingStatus(true);
          }} 
          size="sm" 
          variant="secondary"
          className="h-10 px-4 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo Status
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
             <div className="p-4 sm:p-5 space-y-2">
                {statuses.map((status: any, idx: number) => (
                    <div 
                      key={status.id} 
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-white hover:bg-slate-50 transition-all duration-200 group border border-slate-100 hover:border-slate-200 shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {editingStatus === status.id ? (
                          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-in fade-in">
                            <Input 
                              value={editStatusData.label}
                              onChange={(e) => setEditStatusData({ ...editStatusData, label: e.target.value })}
                              className="h-9 text-sm rounded-lg flex-1 min-w-[200px]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateStatus(status.id);
                                if (e.key === 'Escape') setEditingStatus(null);
                              }}
                            />
                            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-100">
                              {COLOR_PALETTE.map(c => (
                                <button
                                  key={c.value}
                                  onClick={() => setEditStatusData({ ...editStatusData, color: c.value })}
                                  className={cn(
                                    "w-6 h-6 rounded-full transition-all border-2",
                                    c.preview,
                                    editStatusData.color === c.value ? "border-primary scale-110 shadow-sm" : "border-transparent hover:scale-110 opacity-70 hover:opacity-100"
                                  )}
                                  title={c.label}
                                />
                              ))}
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              <Button onClick={() => handleUpdateStatus(status.id)} size="sm" variant="secondary" className="h-9 flex-1 sm:flex-none">
                                Salvar
                              </Button>
                              <Button onClick={() => setEditingStatus(null)} size="sm" variant="outline" className="h-9">
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={cn("px-3 py-1 text-sm font-semibold rounded-full border shadow-sm", status.color)}>
                              {status.label}
                            </div>
                            <span className="flex-1"></span>
                            {status.isDefault && (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200 mr-2">
                                Padrão do Sistema
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      
                      {!editingStatus && (
                        <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 ml-6 sm:ml-0 justify-end">
                          <button
                            onClick={() => handleMoveStatus(idx, 'up')}
                            disabled={idx === 0}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 disabled:opacity-30 transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveStatus(idx, 'down')}
                            disabled={idx === statuses.length - 1}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block"></div>
                          <button
                            onClick={() => {
                              setEditingStatus(status.id);
                              setEditStatusData({ label: status.label, color: status.color });
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-secondary hover:bg-orange-50 transition-colors"
                            title="Editar status"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {!status.isDefault && (
                            <button
                              onClick={() => handleDeleteStatus(status.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Remover status"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                ))}
             </div>
          </div>

          {/* Add Status Form */}
          {isAddingStatus && (
            <div className="mt-6 p-6 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex flex-col space-y-1.5">
                <h3 className="font-semibold text-lg leading-none tracking-tight flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Criar Novo Status
                </h3>
                <p className="text-sm text-muted-foreground">Defina o nome e a cor para o novo status.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Status</Label>
                  <Input 
                    value={newStatusData.label}
                    onChange={(e) => setNewStatusData({ ...newStatusData, label: e.target.value })}
                    placeholder="Ex: Em Análise"
                    className="h-11"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl flex-wrap">
                    {COLOR_PALETTE.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setNewStatusData({ ...newStatusData, color: c.value })}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all border-2",
                          c.preview,
                          newStatusData.color === c.value 
                            ? "border-primary shadow-md scale-110" 
                            : "border-transparent opacity-70 hover:opacity-100 hover:scale-110"
                        )}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button 
                    onClick={handleCreateStatus} 
                    className="flex-1 sm:flex-none h-11 px-8"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Criar Status
                  </Button>
                  <Button 
                    onClick={() => setIsAddingStatus(false)} 
                    variant="outline" 
                    className="flex-1 sm:flex-none h-11"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
