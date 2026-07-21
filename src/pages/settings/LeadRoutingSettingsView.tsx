import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { empresasApi, usuariosApi } from '@/lib/api';

export function LeadRoutingSettingsView() {
  const { professional } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leadRoutingMode, setLeadRoutingMode] = useState('automatic_equal');
  const [companyId, setCompanyId] = useState<number | null>(null);
  
  const [sdrs, setSdrs] = useState<any[]>([]);
  const [weights, setWeights] = useState<Record<number, number>>({});

  useEffect(() => {
    loadData();
  }, [professional?.companyId]);

  const loadData = async () => {
    if (!professional?.companyId) return;
    try {
      setLoading(true);
      const [empRes, usrRes] = await Promise.all([
        empresasApi.getAll(),
        usuariosApi.getAll()
      ]);
      
      if (empRes.success && empRes.data) {
        const company = empRes.data.find((c: any) => c.id === professional.companyId);
        if (company) {
          setCompanyId(company.id);
          setLeadRoutingMode(company.leadRoutingMode || 'automatic_equal');
        }
      }
      
      if (usrRes.success && usrRes.data) {
        const sdrUsers = usrRes.data.filter((u: any) => u.role?.isSDR);
        setSdrs(sdrUsers);
        
        const initialWeights: Record<number, number> = {};
        sdrUsers.forEach((u: any) => {
          initialWeights[u.id] = u.leadRoutingWeight || 0;
        });
        setWeights(initialWeights);
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar dados do roteamento', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalPercentage = Object.values(weights).reduce((sum, w) => sum + (w || 0), 0);
  const remainingPercentage = 100 - totalPercentage;

  const handleSave = async () => {
    if (!companyId) return;
    
    if (leadRoutingMode === 'semi_automatic' && totalPercentage > 100) {
      toast({ title: 'Erro', description: 'A soma das porcentagens não pode ultrapassar 100%.', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      const res = await empresasApi.update(companyId, { leadRoutingMode });
      if (!res.success) throw new Error(res.error?.message || 'Erro ao salvar configurações da empresa');

      if (leadRoutingMode === 'semi_automatic') {
        const promises = sdrs.map(sdr => {
          const newWeight = weights[sdr.id];
          if (sdr.leadRoutingWeight !== newWeight) {
            return usuariosApi.update(sdr.id, { leadRoutingWeight: newWeight });
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
      }

      toast({ title: 'Salvo!', description: 'Configurações de roteamento atualizadas com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-center py-8 text-muted-foreground">Carregando dados de roteamento...</div>;
  }

  return (
    <div className="w-full max-w-5xl animate-in fade-in duration-500 pb-12 space-y-8">
      <div>
        <h2 className="text-[1.1rem] font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-[#F97316]">route</span>
          Roteamento de Leads
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure como os novos leads serão distribuídos automaticamente para a sua equipe de vendas (SDRs).
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-3 max-w-md">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">
            Estratégia de Distribuição
          </label>
          <Select value={leadRoutingMode} onValueChange={setLeadRoutingMode}>
            <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:ring-[#F97316]/20">
              <SelectValue placeholder="Selecione o modo">
                {leadRoutingMode === 'manual' ? 'Atribuição Manual' : 
                 leadRoutingMode === 'automatic_equal' ? 'Atribuição Igualitária' :
                 leadRoutingMode === 'semi_automatic' ? 'Atribuição Semi-Automática' : 
                 leadRoutingMode}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Atribuição Manual</SelectItem>
              <SelectItem value="automatic_equal">Atribuição Igualitária</SelectItem>
              <SelectItem value="semi_automatic">Atribuição Semi-Automática</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Como funciona cada estratégia?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border transition-all ${leadRoutingMode === 'manual' ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-sm font-bold ${leadRoutingMode === 'manual' ? 'text-orange-700' : 'text-slate-700'}`}>Atribuição Manual</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Os leads entrarão sem atribuição. Você deverá escolher o SDR responsável manualmente no dossiê de cada lead.
              </p>
            </div>
            <div className={`p-4 rounded-xl border transition-all ${leadRoutingMode === 'automatic_equal' ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-sm font-bold ${leadRoutingMode === 'automatic_equal' ? 'text-orange-700' : 'text-slate-700'}`}>Atribuição Igualitária</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                O sistema dividirá os novos leads de forma igual e aleatória entre todos os usuários que possuem a permissão de SDR ativa.
              </p>
            </div>
            <div className={`p-4 rounded-xl border transition-all ${leadRoutingMode === 'semi_automatic' ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-sm font-bold ${leadRoutingMode === 'semi_automatic' ? 'text-orange-700' : 'text-slate-700'}`}>Atribuição Semi-Automática</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                O sistema distribuirá os leads respeitando a porcentagem configurada individualmente para cada SDR.
              </p>
            </div>
          </div>
        </div>

        {leadRoutingMode === 'semi_automatic' && (
          <div className="pt-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-800">Distribuição entre os SDRs</h4>
              <div className="text-xs font-semibold text-slate-500">
                Restante: <span className={remainingPercentage < 0 ? 'text-red-500' : remainingPercentage === 0 ? 'text-green-600' : 'text-[#F97316]'}>{remainingPercentage}%</span>
              </div>
            </div>
            
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 mb-6">
              <div
                className={`h-full w-full flex-1 transition-all ${totalPercentage > 100 ? 'bg-red-500' : totalPercentage === 100 ? 'bg-green-500' : 'bg-[#F97316]'}`}
                style={{ transform: `translateX(-${100 - Math.min(totalPercentage, 100)}%)` }}
              />
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {sdrs.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Nenhum SDR encontrado na equipe.</p>
              ) : (
                sdrs.map(sdr => (
                  <div key={sdr.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:w-1/3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {sdr.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate">{sdr.name}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      <Slider
                        value={[weights[sdr.id] || 0]}
                        max={100}
                        step={1}
                        onValueChange={([val]) => setWeights(prev => ({ ...prev, [sdr.id]: val }))}
                        className="flex-1"
                      />
                      <div className="w-16 flex justify-end shrink-0">
                        <span className="text-sm font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                          {weights[sdr.id] || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button 
            disabled={saving || (leadRoutingMode === 'semi_automatic' && totalPercentage > 100)} 
            onClick={handleSave}
            className="h-11 px-8 bg-[#F97316] hover:bg-orange-600 text-white font-bold rounded-xl shadow-[0_8px_20px_-6px_rgba(249,115,22,0.3)] transition-all hover:-translate-y-0.5"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}
