import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const [filter, setFilter] = useState<'today' | '7days' | 'custom'>('custom');
  const [conversionMode, setConversionMode] = useState<'percent' | 'reais'>('percent');
  const [bottomActiveTab, setBottomActiveTab] = useState<'finance' | 'sales'>('finance');
  const [counters, setCounters] = useState({
    leads: 0,
    agendamentos: 0,
    comparada: 0,
    oportunidades: 0,
    faturamento: 0,
    receita: 0,
    ticketOrcado: 0,
    ticketFechado: 0,
    conversao: 0
  });

  const [extraData, setExtraData] = useState({
    metodos: { boleto: { gerados: 0, pagos: 0 }, cartao: 0, pix: 0, dinheiro: 0 },
    funil: { novos: 0, contatados: 0, agendamentos: 0, fechados: 0 },
    origem: [] as { origin: string, count: number }[]
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
    return { 
      leads: 0, agendamentos: 0, comparada: 0, oportunidades: 0, 
      faturamento: 0, receita: 0, ticketOrcado: 0, ticketFechado: 0, conversao: 0,
      metodos: { boleto: { gerados: 0, pagos: 0 }, cartao: 0, pix: 0, dinheiro: 0 },
      funil: { novos: 0, contatados: 0, agendamentos: 0, fechados: 0 },
      origem: []
    };
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
        receita: Math.floor(currentValues.receita + ease * (targets.receita - currentValues.receita)),
        ticketOrcado: Math.floor(currentValues.ticketOrcado + ease * (targets.ticketOrcado - currentValues.ticketOrcado)),
        ticketFechado: Math.floor(currentValues.ticketFechado + ease * (targets.ticketFechado - currentValues.ticketFechado)),
        conversao: Number((currentValues.conversao + ease * (targets.conversao - currentValues.conversao)).toFixed(1))
      });

      if (progress === 1) {
        setExtraData({
          metodos: targets.metodos || { boleto: { gerados: 0, pagos: 0 }, cartao: 0, pix: 0, dinheiro: 0 },
          funil: targets.funil || { novos: 0, contatados: 0, agendamentos: 0, fechados: 0 },
          origem: targets.origem || []
        });
      }

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
          receita: Math.floor(ease * targets.receita),
          ticketOrcado: Math.floor(ease * targets.ticketOrcado),
          ticketFechado: Math.floor(ease * targets.ticketFechado),
          conversao: Number((ease * targets.conversao).toFixed(1))
        });
        
        if (progress === 1) {
          setExtraData({
            metodos: targets.metodos || { boleto: { gerados: 0, pagos: 0 }, cartao: 0, pix: 0, dinheiro: 0 },
            funil: targets.funil || { novos: 0, contatados: 0, agendamentos: 0, fechados: 0 },
            origem: targets.origem || []
          });
        }
        
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
    
    // Anima os contadores suavemente
    animationRef(targets);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const getDateDisplay = () => {
    const today = new Date();
    if (filter === 'today') {
      return format(today, "dd MMM, yyyy", { locale: ptBR });
    } else if (filter === '7days') {
      const sevenDaysAgo = subDays(today, 6);
      return `${format(sevenDaysAgo, "dd MMM", { locale: ptBR })} - ${format(today, "dd MMM, yyyy", { locale: ptBR })}`;
    } else {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return `${format(start, "dd MMM", { locale: ptBR })} - ${format(end, "dd MMM, yyyy", { locale: ptBR })}`;
    }
  };

  const targetsData = {
    leads: 1500,
    agendamentos: 2500,
    comparada: 1000,
    oportunidades: 1000,
    faturamento: 850000,
    ticketOrcado: 2000,
    ticketFechado: 2200,
    conversao: 25.0
  };

  const getPercent = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((current / target) * 100);
  };

  const renderPercentBadge = (percent: number) => {
    return <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">{percent}%</span>;
  };

  const renderProgressBar = (percent: number) => {
    const cappedPercent = Math.min(100, percent);
    return (
      <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
        <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: `${cappedPercent}%` }}></div>
      </div>
    );
  };

  return (
    <div className="relative space-y-10 pb-10 overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-primary font-headline tracking-tight">Dashboard de Vendas</h2>
          <p className="text-on-surface-variant text-sm mt-1">Bem-vindo ao centro de comando SalesClin.</p>
        </div>
        <Card className="flex items-center gap-3 p-1.5">
          <button 
            onClick={() => handleFilterChange('today')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === 'today' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-on-surface-variant hover:bg-slate-50'}`}
          >
            Hoje
          </button>
          <button 
            onClick={() => handleFilterChange('7days')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === '7days' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-on-surface-variant hover:bg-slate-50'}`}
          >
            Últimos 7 dias
          </button>
          <div 
            onClick={() => handleFilterChange('custom')}
            className={`px-4 py-2 text-sm font-bold flex items-center gap-2 cursor-pointer rounded-lg transition-all capitalize ${filter === 'custom' ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary hover:bg-primary/10'}`}
          >
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {getDateDisplay()}
          </div>
        </Card>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {/* Card 1: Total de Leads */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">groups</span>
            </div>
            {renderPercentBadge(getPercent(counters.leads, targetsData.leads))}
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Total de Leads</p>
            <h3 className="text-2xl font-extrabold text-primary font-headline">{counters.leads}</h3>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: {targetsData.leads.toLocaleString('pt-BR')}</span>
              <span className={`font-bold ${getPercent(counters.leads, targetsData.leads) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                {getPercent(counters.leads, targetsData.leads) >= 100 ? 'Meta Superada!' : `${getPercent(counters.leads, targetsData.leads)}% alcançado`}
              </span>
            </div>
            {renderProgressBar(getPercent(counters.leads, targetsData.leads))}
          </div>
        </Card>

        {/* Card 2: Avaliação Agendada */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            {renderPercentBadge(getPercent(counters.agendamentos, targetsData.agendamentos))}
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Avaliação Agendada</p>
            <h3 className="text-2xl font-extrabold text-primary font-headline">{counters.agendamentos}</h3>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: {targetsData.agendamentos.toLocaleString('pt-BR')}</span>
              <span className={`font-bold ${getPercent(counters.agendamentos, targetsData.agendamentos) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                {getPercent(counters.agendamentos, targetsData.agendamentos) >= 100 ? 'Meta Superada!' : `${getPercent(counters.agendamentos, targetsData.agendamentos)}% alcançado`}
              </span>
            </div>
            {renderProgressBar(getPercent(counters.agendamentos, targetsData.agendamentos))}
          </div>
        </Card>

        {/* Card 3: Avaliação Comparada */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">how_to_reg</span>
            </div>
            {renderPercentBadge(getPercent(counters.comparada, targetsData.comparada))}
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Avaliação Comparada</p>
            <h3 className="text-2xl font-extrabold text-primary font-headline">{counters.comparada}</h3>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: {targetsData.comparada.toLocaleString('pt-BR')}</span>
              <span className={`font-bold ${getPercent(counters.comparada, targetsData.comparada) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                {getPercent(counters.comparada, targetsData.comparada) >= 100 ? 'Meta Superada!' : `${getPercent(counters.comparada, targetsData.comparada)}% alcançado`}
              </span>
            </div>
            {renderProgressBar(getPercent(counters.comparada, targetsData.comparada))}
          </div>
        </Card>

        {/* Card 4: Propostas */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">rocket_launch</span>
            </div>
            {renderPercentBadge(getPercent(counters.oportunidades, targetsData.oportunidades))}
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Propostas</p>
            <h3 className="text-2xl font-extrabold text-primary font-headline">{counters.oportunidades}</h3>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: {targetsData.oportunidades.toLocaleString('pt-BR')}</span>
              <span className={`font-bold ${getPercent(counters.oportunidades, targetsData.oportunidades) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                {getPercent(counters.oportunidades, targetsData.oportunidades) >= 100 ? 'Meta Superada!' : `${getPercent(counters.oportunidades, targetsData.oportunidades)}% alcançado`}
              </span>
            </div>
            {renderProgressBar(getPercent(counters.oportunidades, targetsData.oportunidades))}
          </div>
        </Card>
      </div>

      {/* Secondary Stats Grid (New Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {/* Card 5: Faturamento Total */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
            </div>
            {renderPercentBadge(getPercent(counters.faturamento, targetsData.faturamento))}
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Faturamento Total</p>
            <h4 className="text-2xl font-extrabold text-primary font-headline">{formatCurrency(counters.faturamento)}</h4>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: {formatCurrency(targetsData.faturamento)}</span>
              <span className={`font-bold ${getPercent(counters.faturamento, targetsData.faturamento) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                {getPercent(counters.faturamento, targetsData.faturamento) >= 100 ? 'Meta Superada!' : `${getPercent(counters.faturamento, targetsData.faturamento)}% alcançado`}
              </span>
            </div>
            {renderProgressBar(getPercent(counters.faturamento, targetsData.faturamento))}
          </div>
        </Card>

        {/* Card 6: Ticket (Orçado) */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">calculate</span>
            </div>
            {renderPercentBadge(getPercent(counters.ticketOrcado, targetsData.ticketOrcado))}
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Ticket (Orçado)</p>
            <h4 className="text-2xl font-extrabold text-primary font-headline">{formatCurrency(counters.ticketOrcado)}</h4>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: {formatCurrency(targetsData.ticketOrcado)}</span>
              <span className={`font-bold ${getPercent(counters.ticketOrcado, targetsData.ticketOrcado) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                {getPercent(counters.ticketOrcado, targetsData.ticketOrcado) >= 100 ? 'Meta Superada!' : `${getPercent(counters.ticketOrcado, targetsData.ticketOrcado)}% alcançado`}
              </span>
            </div>
            {renderProgressBar(getPercent(counters.ticketOrcado, targetsData.ticketOrcado))}
          </div>
        </Card>

        {/* Card 7: Ticket (Fechado) */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">handshake</span>
            </div>
            {renderPercentBadge(getPercent(counters.ticketFechado, targetsData.ticketFechado))}
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Ticket (Fechado)</p>
            <h4 className="text-2xl font-extrabold text-primary font-headline">{formatCurrency(counters.ticketFechado)}</h4>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: {formatCurrency(targetsData.ticketFechado)}</span>
              <span className={`font-bold ${getPercent(counters.ticketFechado, targetsData.ticketFechado) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                {getPercent(counters.ticketFechado, targetsData.ticketFechado) >= 100 ? 'Meta Superada!' : `${getPercent(counters.ticketFechado, targetsData.ticketFechado)}% alcançado`}
              </span>
            </div>
            {renderProgressBar(getPercent(counters.ticketFechado, targetsData.ticketFechado))}
          </div>
        </Card>

        {/* Card 8: Taxa de Conversão */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">{conversionMode === 'percent' ? 'percent' : 'payments'}</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
               <button 
                  onClick={() => setConversionMode('percent')}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${conversionMode === 'percent' ? 'bg-white text-secondary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                  %
               </button>
               <button 
                  onClick={() => setConversionMode('reais')}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${conversionMode === 'reais' ? 'bg-white text-secondary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                  R$
               </button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Taxa de Conversão</p>
            <h4 className="text-2xl font-extrabold text-primary font-headline">
               {conversionMode === 'percent' ? `${counters.conversao}%` : formatCurrency(counters.receita)}
            </h4>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[11px] font-medium text-on-surface-variant">
              <span>Meta: {conversionMode === 'percent' ? `${targetsData.conversao}%` : formatCurrency(targetsData.faturamento)}</span>
              <span className={`font-bold ${getPercent(counters.conversao, targetsData.conversao) >= 100 ? 'text-secondary' : 'text-primary'}`}>
                {conversionMode === 'percent' 
                  ? `${getPercent(counters.conversao, targetsData.conversao)}% alcançado`
                  : `${getPercent(counters.receita, targetsData.faturamento)}% alcançado`}
              </span>
            </div>
            {renderProgressBar(conversionMode === 'percent' ? getPercent(counters.conversao, targetsData.conversao) : getPercent(counters.receita, targetsData.faturamento))}
          </div>
        </Card>
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
            <h4 className="text-2xl font-extrabold font-headline">{formatCurrency(counters.receita)}</h4>
          </div>
          <div className="md:col-span-4 grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: 'Boleto (Gerados)', value: extraData.metodos.boleto?.gerados || 0 },
              { label: 'Boleto (Pagos)', value: extraData.metodos.boleto?.pagos || 0 },
              { label: 'Cartão', value: extraData.metodos.cartao },
              { label: 'Pix / Débito', value: extraData.metodos.pix },
              { label: 'Dinheiro', value: extraData.metodos.dinheiro },
            ].map((item) => (
              <Card key={item.label} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-primary text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                </div>
                <h5 className="text-lg font-bold text-primary">{formatCurrency(item.value)}</h5>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Two Column Section: Funnel and Origin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
        <Card className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary font-headline">Funil de Leads SalesClin</h3>
            <button className="text-on-surface-variant hover:text-primary transition-colors btn-hover">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Novos', val: extraData.funil.novos || 0, color: 'bg-primary' },
              { label: 'Contatados', val: extraData.funil.contatados || 0, color: 'bg-secondary' },
              { label: 'Agendados', val: extraData.funil.agendamentos || 0, color: 'bg-secondary' },
              { label: 'Fechados', val: extraData.funil.fechados || 0, color: 'bg-secondary' },
            ].map((item, index, arr) => {
              const maxVal = Math.max(...arr.map(a => a.val)) || 1;
              const percent = Math.round((item.val / maxVal) * 100);
              return (
              <div key={item.label} className="flex items-center gap-6">
                <div className="w-24 text-right text-xs font-bold text-on-surface-variant">{item.label}</div>
                {/* Removed overflow-hidden so the shadow can glow outside */}
                <div className="flex-1 h-12 bg-slate-100 rounded-xl relative group">
                  <div 
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-xl flex items-center justify-center text-white text-xs font-bold progress-bar-fill transition-all duration-500",
                      item.color,
                      item.color === 'bg-secondary' && percent > 0 ? 'shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-orange-400/50' : ''
                    )} 
                    style={{ width: `${percent}%`, opacity: percent > 0 ? 1 : 0 }}
                  >
                    {percent > 10 && <span>{item.val}</span>}
                  </div>
                  {percent <= 10 && (
                    <div className="absolute inset-y-0 left-4 flex items-center text-xs font-bold text-on-surface-variant z-10">
                      {item.val}
                    </div>
                  )}
                </div>
                <div className={`w-16 text-xs font-bold ${percent === 100 ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {percent}%
                </div>
              </div>
            )})}
          </div>
        </Card>

        {/* Origin Section */}
        <Card className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary font-headline">Leads por Origem</h3>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold text-on-surface-variant bg-slate-100 px-3 py-1 rounded uppercase tracking-wider">Volume Mensal</span>
            </div>
          </div>
          <div className="space-y-7">
            {extraData.origem.length > 0 ? extraData.origem.map((item, index) => {
              const totalOrigins = extraData.origem.reduce((acc, curr) => acc + curr.count, 0) || 1;
              const percent = ((item.count / totalOrigins) * 100).toFixed(1);
              // Fallbacks de ícone se a origem não for Meta/Google etc
              let icon = 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg'; // Default
              let bg = 'bg-slate-100';
              if (item.origin?.toLowerCase().includes('facebook') || item.origin?.toLowerCase().includes('meta')) {
                icon = 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg';
                bg = 'bg-blue-50';
              } else if (item.origin?.toLowerCase().includes('google')) {
                icon = 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg';
                bg = 'bg-red-50';
              } else if (item.origin?.toLowerCase().includes('instagram')) {
                icon = 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png';
                bg = 'bg-pink-50';
              }

              return (
              <div key={item.origin} className="flex items-center gap-4 group cursor-default">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden p-2 shadow-sm`}>
                  <img src={icon} alt={item.origin} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                     <span className="font-bold">{item.origin}</span>
                     <span className="text-on-surface-variant">{item.count} Leads ({percent}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              </div>
            )}) : (
              <div className="text-center text-sm text-on-surface-variant py-8">
                Nenhum dado de origem registrado no período.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;