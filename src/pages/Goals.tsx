import { useState, useEffect } from 'react';
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Goals = () => {
  const [revenueTarget, setRevenueTarget] = useState(150000);
  const [avgTicket, setAvgTicket] = useState(5000);
  const [schedulingRate, setSchedulingRate] = useState(60);
  const [showupRate, setShowupRate] = useState(60);
  const [closingRate, setClosingRate] = useState(45);

  const [results, setResults] = useState({
    sales: 0, showups: 0, appointments: 0, leads: 0
  });

  useEffect(() => {
    const salesNeeded = avgTicket > 0 ? Math.ceil(revenueTarget / avgTicket) : 0;
    const showupsNeeded = closingRate > 0 ? Math.ceil(salesNeeded / (closingRate / 100)) : 0;
    const appointmentsNeeded = showupRate > 0 ? Math.ceil(showupsNeeded / (showupRate / 100)) : 0;
    const leadsNeeded = schedulingRate > 0 ? Math.ceil(appointmentsNeeded / (schedulingRate / 100)) : 0;
    setResults({ sales: salesNeeded, showups: showupsNeeded, appointments: appointmentsNeeded, leads: leadsNeeded });
  }, [revenueTarget, avgTicket, schedulingRate, showupRate, closingRate]);

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
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
    {
      icon: 'how_to_reg',
      label: 'Presenças',
      value: results.showups.toLocaleString(),
      sub: `${showupRate}% de taxa`,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-primary font-headline tracking-tight">Engenharia de Metas</h2>
          <p className="text-on-surface-variant text-sm mt-1">Calcule o volume de leads necessário para atingir seu faturamento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={applyFacebookPreset}
            variant="outline"
            className="text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-base mr-1.5">campaign</span>
            Config. Facebook
          </Button>
          <Button
            onClick={applyIndicationsPreset}
            variant="secondary"
            size="sm"
            className="text-sm font-semibold shadow-lg shadow-secondary/20"
          >
            <span className="material-symbols-outlined text-base mr-1.5">share</span>
            Config. Indicações
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">

        {/* Left: Parameters Panel */}
        <div className="lg:col-span-4">
          <Card className="p-6 space-y-6">
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
                  value={revenueTarget}
                  onChange={(e) => setRevenueTarget(Number(e.target.value))}
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
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
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
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{closingRate}%</span>
                </div>
                <Slider value={[closingRate]} onValueChange={(v) => setClosingRate(v[0])} max={100} min={5} step={1} />
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Results Panel */}
        <div className="lg:col-span-8 space-y-6">

          {/* Result cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                { label: 'Agendamentos', value: results.appointments, color: 'bg-violet-500', pct: schedulingRate },
                { label: 'Presenças', value: results.showups, color: 'bg-indigo-500', pct: showupRate },
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
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    Plano Viável
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="xl"
                className="shadow-lg shadow-secondary/20 font-bold"
              >
                <span className="material-symbols-outlined text-lg mr-1">save</span>
                Salvar Plano
              </Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Goals;
