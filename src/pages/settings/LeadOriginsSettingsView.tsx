import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { leadOriginsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Plus, Trash2, Pencil, X, 
  Globe, Users, Share2, TrendingUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getOriginDisplay = (value: string) => {
  const val = value.toLowerCase();
  
  if (val.includes('instagram') || val.includes('insta')) {
    return { 
      img: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
      badgeColor: 'text-pink-600 bg-pink-50'
    };
  }
  if (val.includes('meta') || val.includes('facebook') || val.includes('fb')) {
    return { 
      img: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg',
      badgeColor: 'text-blue-600 bg-blue-50'
    };
  }
  if (val.includes('google')) {
    return { 
      img: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg',
      badgeColor: 'text-red-600 bg-red-50'
    };
  }
  if (val.includes('whatsapp') || val.includes('wpp') || val.includes('whats')) {
    return { 
      img: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
      badgeColor: 'text-emerald-600 bg-emerald-50'
    };
  }
  if (val.includes('indicação') || val.includes('indicacao')) {
    return { icon: Users, iconColor: 'text-purple-600', iconBg: 'bg-purple-100', badgeColor: 'text-purple-600 bg-purple-50' };
  }
  if (val.includes('site') || val.includes('web')) {
    return { icon: Globe, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-100', badgeColor: 'text-indigo-600 bg-indigo-50' };
  }
  if (val.includes('influencer')) {
    return { icon: TrendingUp, iconColor: 'text-orange-500', iconBg: 'bg-orange-100', badgeColor: 'text-orange-600 bg-orange-50' };
  }
  return { icon: Share2, iconColor: 'text-slate-600', iconBg: 'bg-slate-100', badgeColor: 'text-slate-600 bg-slate-100' };
};

export default function LeadOriginsSettingsView({ name }: { name?: string }) {
  const { toast } = useToast();
  const [origins, setOrigins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingOrigin, setIsAddingOrigin] = useState(false);
  const [newOriginLabel, setNewOriginLabel] = useState('');
  const [editingOrigin, setEditingOrigin] = useState<number | null>(null);
  const [editOriginLabel, setEditOriginLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadOrigins();
  }, []);

  const loadOrigins = async () => {
    setIsLoading(true);
    try {
      const res = await leadOriginsApi.getAll();
      if (res.success) setOrigins(res.data || []);
    } catch (e) {
      toast({ title: 'Erro ao carregar origens', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  };

  const handleCreateOrigin = async () => {
    if (!newOriginLabel.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await leadOriginsApi.create({
        label: newOriginLabel.trim()
      });

      if (res.success) {
        toast({ title: 'Origem criada com sucesso!' });
        setNewOriginLabel('');
        setIsAddingOrigin(false);
        loadOrigins();
      } else {
        toast({ title: res.error?.message || 'Erro ao criar origem', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro ao criar origem', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOrigin = async (originId: number) => {
    if (!editOriginLabel.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await leadOriginsApi.update(originId, {
        label: editOriginLabel.trim()
      });

      if (res.success) {
        toast({ title: 'Origem atualizada!' });
        setEditingOrigin(null);
        loadOrigins();
      } else {
        toast({ title: res.error?.message || 'Erro ao atualizar origem', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Erro ao atualizar origem', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrigin = async (originId: number) => {
    askConfirmation(
      'Remover Origem',
      'Tem certeza que deseja remover esta origem? Leads que já possuem esta origem poderão mantê-la, mas a opção não aparecerá mais nos formulários.',
      async () => {
        try {
          const res = await leadOriginsApi.delete(originId);
          if (res.success) {
            toast({ title: 'Origem removida' });
            loadOrigins();
          }
        } catch (e) {
          toast({ title: 'Erro ao remover origem', variant: 'destructive' });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center bg-slate-50/50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50/50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Origens de Lead</h2>
            <p className="text-sm text-slate-500 mt-1">Gerencie as fontes de onde seus leads chegam até você</p>
          </div>
          {!isAddingOrigin && (
            <Button size="sm" onClick={() => setIsAddingOrigin(true)} className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Adicionar Origem
            </Button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isAddingOrigin && (
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex-1">
                <Input 
                  placeholder="Ex: Tiktok Ads, Indicação de Parceiro..." 
                  value={newOriginLabel}
                  onChange={(e) => setNewOriginLabel(e.target.value)}
                  className="h-8 text-sm max-w-sm bg-white"
                  autoFocus
                />
              </div>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingOrigin(false)} className="h-8">Cancelar</Button>
              <Button size="sm" onClick={handleCreateOrigin} disabled={isSaving} className="h-8">
                {isSaving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          )}

          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-16 text-center">Ícone</th>
                <th className="px-4 py-3">Nome da Origem</th>
                <th className="px-4 py-3 w-32">Tipo</th>
                <th className="px-4 py-3 w-24 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {origins.length === 0 && !isAddingOrigin ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    <Share2 className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                    <p>Nenhuma origem configurada.</p>
                  </td>
                </tr>
              ) : (
                origins.map((origin) => {
                  const { img, icon: Icon, iconColor, iconBg } = getOriginDisplay(origin.value || origin.label);
                  const isEditing = editingOrigin === origin.id;
                  
                  return (
                    <tr key={origin.id} className="hover:bg-slate-50/50 transition-colors group">
                      {isEditing ? (
                        <td colSpan={4} className="px-4 py-2">
                          <div className="flex items-center gap-3 max-w-sm">
                            <Input 
                              value={editOriginLabel}
                              onChange={(e) => setEditOriginLabel(e.target.value)}
                              className="h-8 text-sm flex-1"
                              autoFocus
                            />
                            <Button size="sm" className="h-8" onClick={() => handleUpdateOrigin(origin.id)} disabled={isSaving}>
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingOrigin(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-2">
                            <div className="flex justify-center items-center">
                              {img ? (
                                <img src={img} alt={origin.label} className="w-6 h-6 object-contain drop-shadow-sm" />
                              ) : (
                                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", iconBg, iconColor)}>
                                  {Icon && <Icon className="w-3 h-3" />}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-800">
                            {origin.label}
                          </td>
                          <td className="px-4 py-2">
                            {origin.isDefault ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                Padrão
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                                Personalizado
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-slate-400 hover:text-primary"
                                onClick={() => {
                                  setEditingOrigin(origin.id);
                                  setEditOriginLabel(origin.label);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-slate-400 hover:text-red-600"
                                onClick={() => handleDeleteOrigin(origin.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
