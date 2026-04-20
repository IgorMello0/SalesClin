import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '@/lib/api';

const Dashboard = () => {
  const [filter, setFilter] = useState<'today' | '7days' | 'custom'>('custom');
  const [bottomActiveTab, setBottomActiveTab] = useState<'finance' | 'sales'>('finance');
  const [counters, setCounters] = useState({
    leads: 0,
    agendamentos: 0,
    comparada: 0,
    oportunidades: 0,
    faturamento: 0,
    ticketOrcado: 0,
    ticketFechado: 0,
    conversao: 0
  });

  const fetchTargetData = useCallback(async (currentFilter: string) => {
    try {
      const response = await dashboardApi.getMetrics(currentFilter);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (e) {
      console.error(e);
    }
    return { leads: 0, agendamentos: 0, comparada: 0, oportunidades: 0, faturamento: 0, ticketOrcado: 0, ticketFechado: 0, conversao: 0 };
  }, []);

  const animationRef = useCallback((targets: any) => {
    const duration = 1000;
    const startTime = performance.now();
    
    // Captura os valores atuais como ponto de partida
    let currentValues = { ...counters };
    
    const frame = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCounters({
        leads: Math.floor(currentValues.leads + ease * (targets.leads - currentValues.leads)),
        agendamentos: Math.floor(currentValues.agendamentos + ease * (targets.agendamentos - currentValues.agendamentos)),
        comparada: Math.floor(currentValues.comparada + ease * (targets.comparada - currentValues.comparada)),
        oportunidades: Math.floor(currentValues.oportunidades + ease * (targets.oportunidades - currentValues.oportunidades)),
        faturamento: Math.floor(currentValues.faturamento + ease * (targets.faturamento - currentValues.faturamento)),
        ticketOrcado: Math.floor(currentValues.ticketOrcado + ease * (targets.ticketOrcado - currentValues.ticketOrcado)),
        ticketFechado: Math.floor(currentValues.ticketFechado + ease * (targets.ticketFechado - currentValues.ticketFechado)),
        conversao: Number((currentValues.conversao + ease * (targets.conversao - currentValues.conversao)).toFixed(1))
      });

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }, [counters]);

  useEffect(() => {
    let mounted = true;
    fetchTargetData('custom').then(targets => {
      if (!mounted) return;
      const duration = 1000;
      const startTime = performance.now();
      const frame = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setCounters({
          leads: Math.floor(ease * targets.leads),
          agendamentos: Math.floor(ease * targets.agendamentos),
          comparada: Math.floor(ease * targets.comparada),
          oportunidades: Math.floor(ease * targets.oportunidades),
          faturamento: Math.floor(ease * targets.faturamento),
          ticketOrcado: Math.floor(ease * targets.ticketOrcado),
          ticketFechado: Math.floor(ease * targets.ticketFechado),
          conversao: Number((ease * targets.conversao).toFixed(1))
        });
        if (progress < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    return () => { mounted = false; };
  }, [fetchTargetData]);

  const handleFilterChange = async (newFilter: 'today' | '7days' | 'custom') => {
    if (newFilter === filter) return;
    setFilter(newFilter);
    const targets = await fetchTargetData(newFilter);
    setCounters(targets);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };  return (
    <div className="relative space-y-10 pb-10 overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-primary font-headline tracking-tight">Dashboard de Vendas</h2>
          <p className="text-on-surface-variant text-sm mt-1">Bem-vindo ao centro de comando SalesClin.</p>
        </div>
        <div className="flex items-center gap-3 glass-card p-1.5 rounded-xl border-slate-200/50">
          <button 
            onClick={() => handleFilterChange('today')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === 'today' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-slate-50'}`}
          >
            Hoje
          </button>
          <button 
            onClick={() => handleFilterChange('7days')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === '7days' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-slate-50'}`}
          >
            Últimos 7 dias
          </button>
          <div 
            onClick={() => handleFilterChange('custom')}
            className={`px-4 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer rounded-lg transition-all ${filter === 'custom' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
          >
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {filter === 'today' ? '16 Abr, 2024' : filter === '7days' ? '10 Abr - 16 Abr, 2024' : '01 Jan - 31 Jan, 2024'}
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {/* Card 1: Total de Leads (70%) */}
        <div className="glass-card p-6 rounded-2xl hover-card">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">groups</span>
            </div>
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">70%</span>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Total de Leads</p>
            <h3 className="text-2xl font-extrabold text-primary font-headline">{counters.leads}</h3>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: 1.500</span>
              <span className="font-bold text-primary">70% alcançado</span>
            </div>
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 2: Avaliação Agendada (35%) */}
        <div className="glass-card p-6 rounded-2xl hover-card">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">35%</span>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Avaliação Agendada</p>
            <h3 className="text-2xl font-extrabold text-primary font-headline">{counters.agendamentos}</h3>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: 2.500</span>
              <span className="font-bold text-primary">35% alcançado</span>
            </div>
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '35%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 3: Avaliação Comparada (62%) */}
        <div className="glass-card p-6 rounded-2xl hover-card">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">how_to_reg</span>
            </div>
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">62%</span>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Avaliação Comparada</p>
            <h3 className="text-2xl font-extrabold text-primary font-headline">{counters.comparada}</h3>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: 1.000</span>
              <span className="font-bold text-primary">62% alcançado</span>
            </div>
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '62%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 4: Oportunidades Geradas (42%) */}
        <div className="glass-card p-6 rounded-2xl hover-card">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">rocket_launch</span>
            </div>
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">42%</span>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Oportunidades Geradas</p>
            <h3 className="text-2xl font-extrabold text-primary font-headline">{counters.oportunidades}</h3>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: 1.000</span>
              <span className="font-bold text-primary">42% alcançado</span>
            </div>
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '42%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid (New Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {/* Card 5: Faturamento Total */}
        <div className="glass-card p-6 rounded-2xl hover-card">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
            </div>
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">41%</span>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Faturamento Total</p>
            <h4 className="text-2xl font-extrabold text-primary font-headline">{formatCurrency(counters.faturamento)}</h4>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: R$ 850.000</span>
              <span className="font-bold text-primary">41% alcançado</span>
            </div>
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '41%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 6: Ticket (Orçado) */}
        <div className="glass-card p-6 rounded-2xl hover-card">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">calculate</span>
            </div>
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">233%</span>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Ticket (Orçado)</p>
            <h4 className="text-2xl font-extrabold text-primary font-headline">{formatCurrency(counters.ticketOrcado)}</h4>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: R$ 2.000</span>
              <span className="font-bold text-secondary">Meta Superada!</span>
            </div>
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 7: Ticket (Fechado) */}
        <div className="glass-card p-6 rounded-2xl hover-card">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">handshake</span>
            </div>
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">173%</span>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Ticket (Fechado)</p>
            <h4 className="text-2xl font-extrabold text-primary font-headline">{formatCurrency(counters.ticketFechado)}</h4>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: R$ 2.200</span>
              <span className="font-bold text-secondary">Meta Superada!</span>
            </div>
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Card 8: Taxa de Conversão */}
        <div className="glass-card p-6 rounded-2xl hover-card">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">percent</span>
            </div>
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">104%</span>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Taxa de Conversão</p>
            <h4 className="text-2xl font-extrabold text-primary font-headline">{counters.conversao}%</h4>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: 25.0%</span>
              <span className="font-bold text-primary">Meta Alcançada!</span>
            </div>
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>


      {/* Revenue Detail Section */}
      <section className="space-y-6 relative z-10">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-primary font-headline">Detalhamento de Receita</h3>
          <div className="flex-1 h-px bg-slate-200/50"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-1 bg-primary/95 backdrop-blur-lg p-6 rounded-2xl text-white shadow-lg flex flex-col justify-center hover-card">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Receita Total</p>
            <h4 className="text-2xl font-extrabold font-headline mb-4">{formatCurrency(counters.faturamento)}</h4>
            <div className="space-y-2">
            <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: '85%' }}></div>
            </div>
            </div>
          </div>
          <div className="md:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Boleto', value: 82400, target: 100000, percent: 24 },
              { label: 'Cartão', value: 156900, target: 200000, percent: 46 },
              { label: 'Pix / Débito', value: 94200, target: 80000, percent: 117 },
              { label: 'Dinheiro', value: 9000, target: 20000, percent: 3 },
            ].map((item) => (
              <div key={item.label} className="glass-card p-6 rounded-2xl hover-card">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-primary text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                </div>
                <h5 className="text-lg font-bold text-primary">{formatCurrency(item.value)}</h5>
                <div className="mt-4 space-y-1">
                  <div className={`flex justify-between text-[9px] font-bold ${item.percent >= 100 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    <span>{item.percent}% {item.percent >= 100 ? '(Superou)' : 'da Meta'}</span>
                    <span>R$ {item.target / 1000}k</span>
                  </div>
                  <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: `${item.percent}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two Column Section: Funnel and Origin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
        <div className="glass-card p-8 rounded-2xl space-y-8 hover-card">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary font-headline">Funil de Leads SalesClin</h3>
            <button className="text-on-surface-variant hover:text-primary transition-colors btn-hover">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Novos', val: 1248, color: 'bg-primary', percent: 100 },
              { label: 'Contatados', val: 850, color: 'bg-secondary', percent: 68 },
              { label: 'Agendados', val: 612, color: 'bg-secondary', percent: 49 },
              { label: 'Fechados', val: 172, color: 'bg-secondary', percent: 14 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-6">
                <div className="w-24 text-right text-xs font-bold text-on-surface-variant">{item.label}</div>
                <div className="flex-1 h-12 bg-slate-50/50 rounded-xl relative overflow-hidden group">
                  <div 
                    className={`absolute inset-0 ${item.color} flex items-center justify-center text-white text-xs font-bold progress-bar-fill`} 
                    style={{ width: `${item.percent}%` }}
                  >
                    <span>{item.val}</span>
                  </div>
                </div>
                <div className={`w-16 text-xs font-bold ${item.percent === 100 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {item.percent}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Origin Section */}
        <div className="glass-card p-8 rounded-2xl space-y-8 hover-card">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary font-headline">Leads por Origem</h3>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold text-on-surface-variant bg-slate-100 px-3 py-1 rounded uppercase tracking-wider">Volume Mensal</span>
            </div>
          </div>
          <div className="space-y-7">
            {[
              { label: 'Facebook Ads', val: 442, icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg', percent: 35.4, bg: 'bg-blue-50' },
              { label: 'Google Search', val: 315, icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg', percent: 25.2, bg: 'bg-red-50' },
              { label: 'Instagram', val: 280, icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png', percent: 22.4, bg: 'bg-pink-50' },
              { label: 'WhatsApp Direct', val: 211, icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg', percent: 16.9, bg: 'bg-green-50' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 group cursor-default">
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden p-2 shadow-sm`}>
                  <img src={item.icon} alt={item.label} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: `${item.percent}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;