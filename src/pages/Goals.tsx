import { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from '@/contexts/AuthContext';
import { goalsApi } from '@/lib/api';
import { useSectionTour } from '@/hooks/useSectionTour';
import { TourPopover } from '@/components/onboarding/TourPopover';

const Goals = () => {
  const [revenueTarget, setRevenueTarget] = useState(150000);
  const [avgTicket, setAvgTicket] = useState(5000);
  const [schedulingRate, setSchedulingRate] = useState(60);
  const [showupRate, setShowupRate] = useState(60);
  const [closingRate, setClosingRate] = useState(45);

  const [results, setResults] = useState({ sales: 0, showups: 0, appointments: 0, leads: 0 });
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const { toast } = useToast();
  const { professional } = useAuth();

  // Tour de primeira visita
  const { tourActive, tourStep, tourSteps, tourHandleNext, tourHandlePrev, tourHandleClose } =
    useSectionTour('goals', [
      { id: null, title: '🎯 Engenharia de Metas', description: 'Configure suas taxas de conversão e o sistema calcula automaticamente quantos leads você precisa para bater a meta.', position: 'center' },
      { id: '#goals-params', title: '⚙️ Parâmetros', description: 'Defina o faturamento desejado, ticket médio e as taxas de cada etapa do funil.', position: 'right' },
      { id: '#goals-results', title: '📊 Resultados', description: 'Veja em tempo real quantos leads, agendamentos e presenças são necessários para atingir sua meta.', position: 'bottom' },
      { id: '#goals-save', title: '💾 Salvar Plano', description: 'Salve diferentes cenários e compare estratégias a qualquer momento.', position: 'top' },
    ]);

  useEffect(() => {
    const salesNeeded = avgTicket > 0 ? Math.ceil(revenueTarget / avgTicket) : 0;
    const showupsNeeded = closingRate > 0 ? Math.ceil(salesNeeded / (closingRate / 100)) : 0;
    const appointmentsNeeded = showupRate > 0 ? Math.ceil(showupsNeeded / (showupRate / 100)) : 0;
    const leadsNeeded = schedulingRate > 0 ? Math.ceil(appointmentsNeeded / (schedulingRate / 100)) : 0;
    setResults({ sales: salesNeeded, showups: showupsNeeded, appointments: appointmentsNeeded, leads: leadsNeeded });
  }, [revenueTarget, avgTicket, schedulingRate, showupRate, closingRate]);

  useEffect(() => {
    fetchPlans();
  }, [professional]);

  const fetchPlans = async () => {
    if (!professional) return;
    try {
      const response = await goalsApi.list(Number(professional.id));
      if (response.success) setSavedPlans(response.data);
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
    }
  };

  const handleSavePlan = async () => {
    console.log('Botão Salvar Plano clicado');
    console.log('Professional status:', professional);
    if (!professional) {
      toast({ title: "Erro: Profissional não identificado", variant: "destructive" });
      return;
    }
    try {
      const newPlan = {
        professionalId: Number(professional.id),
        name: `Plano ${format(new Date(), 'dd/MM/yy HH:mm')}`,
        revenueTarget,
        avgTicket,
        schedulingRate,
        showupRate,
        closingRate
      };
      console.log('Enviando plano para o backend:', newPlan);
      const response = await goalsApi.create(newPlan);
      console.log('Resposta do backend:', response);
      if (response.success) {
        setSavedPlans([response.data, ...savedPlans]);
        toast({ title: "Plano salvo no backend!" });
      } else {
        toast({ title: "Erro: " + response.message, variant: "destructive" });
      }
    } catch (error: any) {
      console.error('Erro ao salvar plano:', error);
      toast({ title: "Erro ao salvar plano: " + error.message, variant: "destructive" });
    }
  };

  const handleLoadPlan = (plan: any) => {
    setRevenueTarget(plan.revenueTarget);
    setAvgTicket(plan.avgTicket);
    setSchedulingRate(plan.schedulingRate);
    setShowupRate(plan.showupRate);
    setClosingRate(plan.closingRate);
    toast({ title: "Plano carregado!" });
  };

  const handleDeletePlan = async (id: number) => {
    try {
      const response = await goalsApi.delete(id);
      if (response.success) {
        setSavedPlans(savedPlans.filter(p => p.id !== id));
        toast({ title: "Plano excluído!" });
      }
    } catch (error) {
      toast({ title: "Erro ao excluir plano", variant: "destructive" });
    }
  };

  const applyFacebookPreset = () => {
    setRevenueTarget(150000); setAvgTicket(5000); setSchedulingRate(60); setShowupRate(60); setClosingRate(45);
  };

  const applyIndicationsPreset = () => {
    setRevenueTarget(45000); setAvgTicket(1200); setSchedulingRate(30); setShowupRate(60); setClosingRate(60);
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const cplMax = results.leads > 0
    ? ((results.sales * avgTicket) / results.leads / 8).toFixed(2)
    : '0.00';

  const resultCards = [
    {
      icon: 'groups',
      label: 'Leads Necessários',
      value: results.leads.toLocaleString(),
      sub: 'Volume de entrada',
      color: 'text-accent',
      bg: 'bg-blue-50',
    },
    {
      icon: 'calendar_month',
      label: 'Agendamentos',
      value: results.appointments.toLocaleString(),
      sub: `${schedulingRate}% de taxa`,
      color: 'text-secondary',
      bg: 'bg-orange-50',
    },
    {
      icon: 'how_to_reg',
      label: 'Presenças',
      value: results.showups.toLocaleString(),
      sub: `${showupRate}% de taxa`,
      color: 'text-accent',
      bg: 'bg-blue-50',
    },
    {
      icon: 'handshake',
      label: 'Vendas',
      value: results.sales.toLocaleString(),
      sub: `${closingRate}% de conversão`,
      color: 'text-secondary',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="relative space-y-10 pb-10 overflow-hidden">
      <TourPopover active={tourActive} step={tourStep} steps={tourSteps} onNext={tourHandleNext} onPrev={tourHandlePrev} onClose={tourHandleClose} />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:gap-6 relative z-10">
        <div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tight">Engenharia de Metas</h2>
          <p className="text-on-surface-variant text-xs sm:text-sm mt-1">Calcule o volume de leads necessário para atingir seu faturamento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={applyFacebookPreset}
            variant="outline"
            className="text-xs sm:text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-base mr-1">campaign</span>
            Config. Facebook
          </Button>
          <Button
            onClick={applyIndicationsPreset}
            variant="secondary"
            size="sm"
            className="text-xs sm:text-sm font-semibold shadow-lg shadow-secondary/20"
          >
            <span className="material-symbols-outlined text-base mr-1">share</span>
            Config. Indicações
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start relative z-10">

        {/* Left: Parameters Panel */}
        <div id="goals-params" className="lg:col-span-4">
          <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-accent rounded-lg">
                <span className="material-symbols-outlined text-xl">tune</span>
              </div>
              <h3 className="text-base font-bold text-primary">Parâmetros</h3>
            </div>

            {/* Revenue Input */}
            <div className="space-y-2">
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Faturamento Meta</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">R$</span>
                <input
                  type="number"
                  value={revenueTarget === 0 ? '' : revenueTarget}
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = val === '' ? 0 : Number(val);
                    setRevenueTarget(num);
                  }}
                  className="flex w-full rounded-xl border border-slate-200 bg-slate-50 h-11 text-base font-bold pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                />
              </div>
            </div>

            {/* Ticket Input */}
            <div className="space-y-2">
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Ticket Médio</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">R$</span>
                <input
                  type="number"
                  value={avgTicket === 0 ? '' : avgTicket}
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = val === '' ? 0 : Number(val);
                    setAvgTicket(num);
                  }}
                  className="flex w-full rounded-xl border border-slate-200 bg-slate-50 h-11 text-base font-bold pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-primary"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 pt-2 space-y-5">
              {/* Lead → Agenda */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant text-xs font-semibold">Lead → Agenda</span>
                  <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">{schedulingRate}%</span>
                </div>
                <Slider value={[schedulingRate]} onValueChange={(v) => setSchedulingRate(v[0])} max={100} min={5} step={1} />
              </div>

              {/* Agenda → Presença */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant text-xs font-semibold">Agenda → Presença</span>
                  <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">{showupRate}%</span>
                </div>
                <Slider value={[showupRate]} onValueChange={(v) => setShowupRate(v[0])} max={100} min={5} step={1} />
              </div>

              {/* Presença → Venda */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant text-xs font-semibold">Presença → Venda</span>
                  <span className="text-xs font-bold text-accent bg-blue-50 px-2 py-1 rounded">{closingRate}%</span>
                </div>
                <Slider value={[closingRate]} onValueChange={(v) => setClosingRate(v[0])} max={100} min={5} step={1} />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Results Panel */}
        <div className="lg:col-span-8 space-y-6">

          {/* Result cards */}
          <div id="goals-results" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {resultCards.map((card) => (
              <Card key={card.label} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 ${card.bg} ${card.color} rounded-lg`}>
                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">{card.label}</p>
                  <h3 className={`text-2xl font-extrabold font-headline ${card.color}`}>{card.value}</h3>
                  <p className="text-on-surface-variant text-[11px]">{card.sub}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Funnel Flow Visualization */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 text-accent rounded-lg">
                <span className="material-symbols-outlined text-xl">account_tree</span>
              </div>
              <h3 className="text-base font-bold text-primary">Fluxo do Funil</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Leads', value: results.leads, color: 'bg-accent', pct: 100 },
                { label: 'Agendamentos', value: results.appointments, color: 'bg-secondary', pct: schedulingRate },
                { label: 'Presenças', value: results.showups, color: 'bg-accent', pct: showupRate },
                { label: 'Vendas', value: results.sales, color: 'bg-secondary', pct: closingRate },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-on-surface-variant text-xs font-semibold w-28 shrink-0">{row.label}</span>
                  <div className="flex-1 h-2.5 bg-primary/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${row.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.min(row.pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-primary text-xs font-bold w-10 text-right shrink-0">{row.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Projected Revenue Card */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Faturamento Projetado</p>
                <h2 className="text-4xl font-extrabold text-primary font-headline tracking-tight">
                  {formatCurrency(results.sales * avgTicket)}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="text-[11px] font-semibold text-on-surface-variant bg-slate-100 px-2.5 py-1 rounded">
                    Ticket: {formatCurrency(avgTicket)}
                  </span>
                  <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded">
                    CPL Máx: R$ {cplMax}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-accent bg-blue-50 px-2.5 py-1 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse inline-block"></span>
                    Plano Viável
                  </span>
                </div>
              </div>

              <Button
                id="goals-save"
                className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold shadow-lg shadow-orange-500/20 border-none transition-colors px-6 py-3 h-auto text-base rounded-xl flex items-center gap-2"
                onClick={handleSavePlan}
              >
                <span className="material-symbols-outlined text-lg">save</span>
                Salvar Plano
              </Button>
            </div>
          </Card>

          {/* Saved Plans List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              <h3 className="text-base font-bold text-primary">Planos Salvos</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPlans.length === 0 ? (
                <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm italic">Nenhum plano salvo ainda.</p>
                </div>
              ) : (
                savedPlans.map(plan => (
                  <Card key={plan.id} className="p-4 hover:shadow-md transition-all group border-slate-100">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h4 className="font-bold text-primary text-sm">{plan.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold uppercase">
                          <span>{formatCurrency(plan.revenueTarget)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                          <span>Tkt: {formatCurrency(plan.avgTicket)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-300 hover:text-red-500 rounded-full"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 rounded-lg text-xs font-bold border-slate-200 hover:bg-primary hover:text-white transition-all"
                          onClick={() => handleLoadPlan(plan)}
                        >
                          Carregar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Goals;
