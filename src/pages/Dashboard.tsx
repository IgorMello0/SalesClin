import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardApi, usuariosApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { professional, switchCompany, hasPermission } = useAuth();
  const showBilling = hasPermission('dashboard', 'verFaturamento');
  const [filter, setFilter] = useState<'today' | '7days' | '30days' | 'this_month' | 'custom'>('30days');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCustomRangeInputs, setShowCustomRangeInputs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [conversionMode, setConversionMode] = useState<'percent' | 'reais'>('percent');
  const [bottomActiveTab, setBottomActiveTab] = useState<'finance' | 'sales'>('finance');
  const [selectedSdrId, setSelectedSdrId] = useState<string>('all');
  const [selectedCloserId, setSelectedCloserId] = useState<string>('all');
  const [sdrs, setSdrs] = useState<any[]>([]);
  const [closers, setClosers] = useState<any[]>([]);
  const [counters, setCounters] = useState({
    leads: 0,
    agendamentos: 0,
    comparada: 0,
    oportunidades: 0,
    contratos: 0,
    faturamento: 0,
    faturamentoFechado: 0,
    totalDiscount: 0,
    ticketOrcado: 0,
    ticketFechado: 0,
    conversao: 0,
    conversaoPropostas: 0,
    conversaoFinanceira: 0,
    parcelamentoMedioBoleto: 0
  });

  const [extraData, setExtraData] = useState({
    metodos: { boleto: { gerados: 0 }, cartao: 0, pix: 0, dinheiro: 0 },
    funil: { novos: 0, contatados: 0, agendamentos: 0, fechados: 0 },
    origem: [] as { origin: string, count: number }[]
  });

  const fetchTargetData = useCallback(async (currentFilter: string, start?: string, end?: string, sdrId?: string, closerId?: string) => {
    try {
      const response = await dashboardApi.getMetrics(currentFilter, start, end, sdrId, closerId);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (e) {
      console.error(e);
    }
    return { 
      leads: 0, agendamentos: 0, comparada: 0, oportunidades: 0, contratos: 0,
      faturamento: 0, faturamentoFechado: 0, totalDiscount: 0, ticketOrcado: 0, ticketFechado: 0, conversao: 0,
      conversaoPropostas: 0, conversaoFinanceira: 0, parcelamentoMedioBoleto: 0,
      metodos: { boleto: { gerados: 0 }, cartao: 0, pix: 0, dinheiro: 0 },
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
        contratos: Math.floor(currentValues.contratos + ease * ((targets.contratos || 0) - currentValues.contratos)),
        faturamento: Math.floor(currentValues.faturamento + ease * (targets.faturamento - currentValues.faturamento)),
        faturamentoFechado: Math.floor(currentValues.faturamentoFechado + ease * ((targets.faturamentoFechado || 0) - currentValues.faturamentoFechado)),
        totalDiscount: Math.floor(currentValues.totalDiscount + ease * ((targets.totalDiscount || 0) - currentValues.totalDiscount)),
        ticketOrcado: Math.floor(currentValues.ticketOrcado + ease * (targets.ticketOrcado - currentValues.ticketOrcado)),
        ticketFechado: Math.floor(currentValues.ticketFechado + ease * (targets.ticketFechado - currentValues.ticketFechado)),
        conversao: Number((currentValues.conversao + ease * (targets.conversao - currentValues.conversao)).toFixed(1)),
        conversaoPropostas: Number((currentValues.conversaoPropostas + ease * ((targets.conversaoPropostas || 0) - currentValues.conversaoPropostas)).toFixed(1)),
        conversaoFinanceira: Number((currentValues.conversaoFinanceira + ease * (targets.conversaoFinanceira - currentValues.conversaoFinanceira)).toFixed(1)),
        parcelamentoMedioBoleto: Number((currentValues.parcelamentoMedioBoleto + ease * ((targets.parcelamentoMedioBoleto || 0) - currentValues.parcelamentoMedioBoleto)).toFixed(1))
      });

      if (progress === 1) {
        setExtraData({
          metodos: targets.metodos || { boleto: { gerados: 0 }, cartao: 0, pix: 0, dinheiro: 0 },
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
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const res = await usuariosApi.getAll();
        if (res.success && res.data) {
          const sdrList = res.data.filter((u: any) => u.role?.isSDR);
          const closerList = res.data.filter((u: any) => u.role?.isCloser);
          setSdrs(sdrList);
          setClosers(closerList);
        }
      } catch (e) {
        console.error('Failed to load team for dashboard filters', e);
      }
    };
    loadTeam();
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchTargetData('30days', undefined, undefined, selectedSdrId, selectedCloserId).then(targets => {
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
          contratos: Math.floor(ease * (targets.contratos || 0)),
          faturamento: Math.floor(ease * targets.faturamento),
          faturamentoFechado: Math.floor(ease * (targets.faturamentoFechado || 0)),
          totalDiscount: Math.floor(ease * (targets.totalDiscount || 0)),
          ticketOrcado: Math.floor(ease * targets.ticketOrcado),
          ticketFechado: Math.floor(ease * targets.ticketFechado),
          conversao: Number((ease * targets.conversao).toFixed(1)),
          conversaoPropostas: Number((ease * (targets.conversaoPropostas || 0)).toFixed(1)),
          conversaoFinanceira: Number((ease * targets.conversaoFinanceira).toFixed(1)),
          parcelamentoMedioBoleto: Number((ease * (targets.parcelamentoMedioBoleto || 0)).toFixed(1))
        });
        
        if (progress === 1) {
          setExtraData({
            metodos: targets.metodos || { boleto: { gerados: 0 }, cartao: 0, pix: 0, dinheiro: 0 },
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

  const handleFilterChange = async (newFilter: 'today' | '7days' | '30days' | 'this_month' | 'custom', start?: string, end?: string, sdrId = selectedSdrId, closerId = selectedCloserId) => {
    if (newFilter === filter && newFilter !== 'custom' && sdrId === selectedSdrId && closerId === selectedCloserId) return;
    setFilter(newFilter);
    setSelectedSdrId(sdrId);
    setSelectedCloserId(closerId);
    const targets = await fetchTargetData(newFilter, start, end, sdrId, closerId);
    
    // Anima os contadores suavemente
    animationRef(targets);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  const getDateDisplay = () => {
    const today = new Date();
    if (filter === 'today') {
      return format(today, "dd 'de' MMMM, yyyy", { locale: ptBR });
    } else if (filter === '7days') {
      const start = subDays(today, 6);
      return `${format(start, "dd MMM", { locale: ptBR })} - ${format(today, "dd MMM, yyyy", { locale: ptBR })}`;
    } else if (filter === '30days') {
      const start = subDays(today, 29);
      return `${format(start, "dd MMM", { locale: ptBR })} - ${format(today, "dd MMM, yyyy", { locale: ptBR })}`;
    } else if (filter === 'this_month') {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return `${format(start, "dd MMM", { locale: ptBR })} - ${format(end, "dd MMM, yyyy", { locale: ptBR })}`;
    } else {
      try {
        const start = new Date(customStartDate + 'T00:00:00');
        const end = new Date(customEndDate + 'T00:00:00');
        return `${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}`;
      } catch (e) {
        return 'Período Personalizado';
      }
    }
  };

  const getFilterLabel = () => {
    if (filter === 'today') return 'Hoje';
    if (filter === '7days') return '7 dias';
    if (filter === '30days') return '30 dias';
    if (filter === 'this_month') return 'Este mês';
    return 'Personalizado';
  };

  const hasMultipleClinics = Array.isArray(professional?.companies) && professional?.companies.length > 1;
  const activeCompany = Array.isArray(professional?.companies) ? professional?.companies?.find(c => c.id === professional?.companyId) : null;

  return (
    <div className="relative space-y-10 pb-10 overflow-hidden">

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:gap-6 relative z-30">
        <div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-primary font-headline tracking-tight">Dashboard de Vendas</h2>
          <p className="text-on-surface-variant text-xs sm:text-sm mt-1">
            {hasMultipleClinics && activeCompany
              ? `Dados da clínica: ${activeCompany.name}`
              : 'Bem-vindo ao centro de comando SellClin.'}
          </p>
        </div>
        
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          <Card className="flex flex-wrap items-center gap-2 sm:gap-3 p-1.5 w-fit relative overflow-visible">
          <button 
            onClick={() => {
              handleFilterChange('today');
              setDropdownOpen(false);
            }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${filter === 'today' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-on-surface-variant hover:bg-muted'}`}
          >
            Hoje
          </button>
          <button 
            onClick={() => {
              handleFilterChange('7days');
              setDropdownOpen(false);
            }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${filter === '7days' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-on-surface-variant hover:bg-muted'}`}
          >
            7 dias
          </button>
          <button 
            onClick={() => {
              handleFilterChange('30days');
              setDropdownOpen(false);
            }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${filter === '30days' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-on-surface-variant hover:bg-muted'}`}
          >
            30 dias
          </button>
          <button 
            onClick={() => {
              handleFilterChange('this_month');
              setDropdownOpen(false);
            }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${filter === 'this_month' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-on-surface-variant hover:bg-muted'}`}
          >
            Este mês
          </button>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={cn(
                "px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 cursor-pointer rounded-lg transition-all select-none",
                filter === 'custom' 
                  ? "bg-primary/10 text-primary" 
                  : "bg-primary/5 text-primary hover:bg-primary/10"
              )}
            >
              <span className="material-symbols-outlined text-sm">menu</span>
              <span>{filter === 'custom' ? getDateDisplay() : 'Personalizado'}</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 sm:left-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-2xl p-4 space-y-3 z-[150] animate-in fade-in zoom-in-95 duration-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Definir Período</div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Data Início</label>
                  <input 
                    type="date" 
                    value={customStartDate} 
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-secondary font-headline"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Data Fim</label>
                  <input 
                    type="date" 
                    value={customEndDate} 
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-secondary font-headline"
                  />
                </div>
                <button 
                  onClick={() => {
                    handleFilterChange('custom', customStartDate, customEndDate);
                    setDropdownOpen(false);
                  }}
                  className="w-full bg-secondary hover:bg-secondary/90 text-primary font-bold text-xs py-2 rounded-lg font-headline transition-colors"
                >
                  Aplicar Período
                </button>
              </div>
            )}
          </div>

          {(sdrs.length > 0 || closers.length > 0) && (
            <Popover>
              <div className="relative">
                <PopoverTrigger asChild>
                  <button 
                    className={cn(
                      "px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 cursor-pointer rounded-lg transition-all select-none",
                      (selectedSdrId !== 'all' || selectedCloserId !== 'all')
                        ? "bg-primary/10 text-primary" 
                        : "text-on-surface-variant hover:bg-muted"
                    )}
                  >
                    <span className="material-symbols-outlined text-sm">filter_list</span>
                    <span>Filtros</span>
                    {(selectedSdrId !== 'all' || selectedCloserId !== 'all') && (
                      <span className="flex items-center justify-center w-4 h-4 bg-primary text-primary-foreground rounded-full text-[9px] ml-0.5">
                        {(selectedSdrId !== 'all' ? 1 : 0) + (selectedCloserId !== 'all' ? 1 : 0)}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="absolute top-full right-0 mt-2 w-72 p-4 rounded-2xl border border-slate-200/50 shadow-2xl bg-white/95 backdrop-blur-md z-[150]" align="end">
                  <div className="space-y-4">
                    <div className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">group</span>
                      Filtros de Equipe
                    </div>
                    
                    {sdrs.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SDR Responsável</label>
                        <Select value={selectedSdrId} onValueChange={(val) => handleFilterChange(filter, filter === 'custom' ? customStartDate : undefined, filter === 'custom' ? customEndDate : undefined, val, selectedCloserId)}>
                          <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 focus:ring-secondary">
                            <SelectValue placeholder="SDR (Todos)">
                              {selectedSdrId === 'all' ? 'Todos (Sem Filtro)' : selectedSdrId === 'none' ? 'Leads sem SDR' : (sdrs.find(s => s.id.toString() === selectedSdrId)?.name || 'Todos (Sem Filtro)')}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos (Sem filtro)</SelectItem>
                            <SelectItem value="none">Leads sem SDR (Vazio)</SelectItem>
                            {sdrs.map(sdr => (
                              <SelectItem key={sdr.id} value={sdr.id.toString()}>{sdr.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {closers.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Closer (Vendedor)</label>
                        <Select value={selectedCloserId} onValueChange={(val) => handleFilterChange(filter, filter === 'custom' ? customStartDate : undefined, filter === 'custom' ? customEndDate : undefined, selectedSdrId, val)}>
                          <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 focus:ring-secondary">
                            <SelectValue placeholder="Closer (Todos)">
                              {selectedCloserId === 'all' ? 'Todos (Sem Filtro)' : selectedCloserId === 'none' ? 'Leads sem Closer' : (closers.find(c => c.id.toString() === selectedCloserId)?.name || 'Todos (Sem Filtro)')}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos (Sem filtro)</SelectItem>
                            <SelectItem value="none">Leads sem Closer (Vazio)</SelectItem>
                            {closers.map(closer => (
                              <SelectItem key={closer.id} value={closer.id.toString()}>{closer.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {(selectedSdrId !== 'all' || selectedCloserId !== 'all') && (
                      <div className="pt-2">
                        <button 
                          onClick={() => handleFilterChange(filter, filter === 'custom' ? customStartDate : undefined, filter === 'custom' ? customEndDate : undefined, 'all', 'all')}
                          className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-2"
                        >
                          Limpar Filtros
                        </button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </div>
            </Popover>
          )}
        </Card>
      </div>
      </div>

      {/* Primary Stats Grid */}
      <div id="tour-dashboard-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 relative z-10">
        {/* Card 1: Total de Leads */}
        <Card className="p-4 xl:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">groups</span>
            </div>
            
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Total de Leads</p>
            <h3 className="stats-value">{counters.leads}</h3>
          </div>
          
        </Card>

        {/* Card 2: Avaliação Agendada */}
        <Card className="p-4 xl:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Avaliação Agendada</p>
            <h3 className="stats-value">{counters.agendamentos}</h3>
          </div>
          
        </Card>

        {/* Card 3: Avaliação Comparada */}
        <Card className="p-4 xl:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">how_to_reg</span>
            </div>
            
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Avaliação Comparecida</p>
            <h3 className="stats-value">{counters.comparada}</h3>
          </div>
          
        </Card>

        {/* Card 4: Propostas */}
        <Card className="p-4 xl:p-6 bg-gradient-to-br from-card to-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">rocket_launch</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Propostas Geradas</p>
            {showBilling ? (
              <>
                <h3 className="stats-value text-2xl font-black text-primary">{formatCurrency(counters.faturamento)}</h3>
                <p className="text-slate-400 text-xs font-bold mt-1">
                  {counters.oportunidades} {counters.oportunidades === 1 ? 'proposta criada' : 'propostas criadas'}
                </p>
              </>
            ) : (
              <h3 className="stats-value text-2xl font-black text-primary">
                {counters.oportunidades} {counters.oportunidades === 1 ? 'proposta' : 'propostas'}
              </h3>
            )}
          </div>
        </Card>
      </div>

      {/* Secondary Stats Grid (New Metrics & Double Conversion) */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showBilling ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-2'} gap-4 lg:gap-6 relative z-10`}>
        {showBilling && (
          <>
            {/* Card 5: Faturamento (Contratos Fechados) */}
            <Card className="p-4 xl:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <span className="material-symbols-outlined text-xl">handshake</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Faturamento Realizado</p>
                <h4 className="stats-value text-2xl font-black text-emerald-600">{formatCurrency(counters.faturamentoFechado)}</h4>
                <p className="text-slate-400 text-xs font-bold mt-1">
                  {counters.contratos} {counters.contratos === 1 ? 'contrato fechado' : 'contratos fechados'}
                </p>
              </div>
            </Card>

            {/* Card 6: Ticket (Orçado) */}
            <Card className="p-4 xl:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-accent/10 text-accent rounded-lg">
                  <span className="material-symbols-outlined text-xl">calculate</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Ticket (Orçado)</p>
                <h4 className="stats-value text-xl font-bold">{formatCurrency(counters.ticketOrcado)}</h4>
                <p className="text-slate-400 text-[11px] font-medium mt-1">média por proposta</p>
              </div>
            </Card>

            {/* Card 7: Ticket (Fechado) */}
            <Card className="p-4 xl:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-accent/10 text-accent rounded-lg">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Ticket (Fechado)</p>
                <h4 className="stats-value text-xl font-bold">{formatCurrency(counters.ticketFechado)}</h4>
                <p className="text-slate-400 text-[11px] font-medium mt-1">média por fechamento</p>
              </div>
            </Card>

            {/* Card 8: Parcelamento Médio de Boleto */}
            <Card className="p-4 xl:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-accent/10 text-accent rounded-lg">
                  <span className="material-symbols-outlined text-xl">receipt_long</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Parc. Médio Boleto</p>
                <h4 className="stats-value text-xl font-bold text-accent">{counters.parcelamentoMedioBoleto}x</h4>
                <p className="text-slate-400 text-[11px] font-medium mt-1">parcelas por boleto</p>
              </div>
            </Card>

            {/* Card 8.5: Desconto Concedido */}
            <Card className="p-4 xl:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                  <span className="material-symbols-outlined text-xl">local_offer</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">Desconto Concedido</p>
                <h4 className="stats-value text-xl font-bold text-red-500">{formatCurrency(counters.totalDiscount)}</h4>
                <p className="text-slate-400 text-[11px] font-medium mt-1">acumulado no período</p>
              </div>
            </Card>
          </>
        )}

        {/* Card 9: Taxa de Conversão Dupla / Simples */}
        <Card className="p-4 xl:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <span className="material-symbols-outlined text-xl">{showBilling ? (conversionMode === 'percent' ? 'percent' : 'insights') : 'percent'}</span>
            </div>
            {showBilling && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                 <button 
                    onClick={() => setConversionMode('percent')}
                    className={`text-[9px] font-black uppercase px-2 py-1 rounded transition-all ${conversionMode === 'percent' ? 'bg-white text-secondary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Conversão por Quantidade de Propostas"
                 >
                    Qtd.
                 </button>
                 <button 
                    onClick={() => setConversionMode('reais')}
                    className={`text-[9px] font-black uppercase px-2 py-1 rounded transition-all ${conversionMode === 'reais' ? 'bg-white text-secondary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Conversão Financeira (Valor de Proposta vs Receita)"
                 >
                    R$
                 </button>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-on-surface-variant text-[11px] sm:text-xs font-semibold uppercase tracking-wider leading-snug min-h-[34px]">
              {showBilling ? (conversionMode === 'percent' ? 'Conversão (Qtd.)' : 'Conversão (Financ.)') : 'Conversão de Propostas'}
            </p>
            <div className="flex items-baseline gap-2">
              <h4 className="stats-value text-xl font-bold text-secondary">
                 {showBilling ? (conversionMode === 'percent' ? `${counters.conversaoPropostas}%` : `${counters.conversaoFinanceira}%`) : `${counters.conversaoPropostas}%`}
              </h4>
            </div>
            <p className="text-slate-400 text-[10px] font-medium mt-1">
              {showBilling ? (conversionMode === 'percent' ? 'Contratos / Propostas' : 'Receita / Faturamento') : 'Contratos / Propostas'}
            </p>
          </div>
        </Card>
      </div>

      {/* Payment Methods Section */}
      {showBilling && (
        <section className="space-y-6 relative z-10 animate-in fade-in">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-primary font-headline">Meios de Pagamento Utilizados</h3>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { label: 'Boletos Gerados', value: extraData.metodos.boleto?.gerados || 0 },
              { label: 'Cartão', value: extraData.metodos.cartao },
              { label: 'Pix / Débito', value: extraData.metodos.pix },
              { label: 'Dinheiro', value: extraData.metodos.dinheiro },
            ].map((item) => (
              <Card key={item.label} className="p-6 flex flex-col justify-between hover-card">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="text-primary text-[10px] sm:text-xs font-bold uppercase tracking-tight">{item.label}</span>
                </div>
                <h5 className="text-lg sm:text-2xl font-bold text-primary font-headline">{formatCurrency(item.value)}</h5>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Two Column Section: Funnel and Origin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
        <Card className="p-4 sm:p-8 space-y-4 sm:space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary font-headline">Funil de Leads SellClin</h3>
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
                <div className="flex-1 h-12 bg-muted rounded-xl relative group">
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
              <span className="text-[10px] font-bold text-on-surface-variant bg-muted px-3 py-1 rounded uppercase tracking-wider">Volume Mensal</span>
            </div>
          </div>
          <div className="space-y-7">
            {extraData.origem.length > 0 ? extraData.origem.map((item, index) => {
              const totalOrigins = extraData.origem.reduce((acc, curr) => acc + curr.count, 0) || 1;
              const percent = ((item.count / totalOrigins) * 100).toFixed(1);
              // Fallbacks de ícone se a origem não for Meta/Google etc
              let icon = 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg'; // Default
              let bg = 'bg-muted';
              if (item.origin?.toLowerCase().includes('facebook') || item.origin?.toLowerCase().includes('meta')) {
                icon = 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg';
                bg = 'bg-blue-50 dark:bg-blue-950/30';
              } else if (item.origin?.toLowerCase().includes('google')) {
                icon = 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg';
                bg = 'bg-red-50 dark:bg-red-950/30';
              } else if (item.origin?.toLowerCase().includes('instagram')) {
                icon = 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png';
                bg = 'bg-pink-50 dark:bg-pink-950/30';
              }

              const isInstagram = item.origin?.toLowerCase().includes('instagram');

              return (
              <div key={item.origin} className="flex items-center gap-4 group cursor-default">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform overflow-hidden shadow-sm",
                  isInstagram ? "bg-transparent p-0 shadow-none border border-slate-100" : `${bg} p-2`
                )}>
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
