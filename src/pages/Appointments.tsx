import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { appointmentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { NewAppointmentModal } from '@/components/NewAppointmentModal';

const Appointments = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const { toast } = useToast();

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await appointmentsApi.getAll({ pageSize: 200 });
      if (response.success && response.data) {
        const mapped = response.data.map((apt: any) => ({
          id: apt.id,
          date: parseISO(apt.startTime),
          time: format(parseISO(apt.startTime), "HH:mm"),
          clientName: apt.client?.name || "Paciente s/ Nome",
          service: apt.service?.name || "Serviço s/ Nome",
          status: apt.status || "agendado",
          duration: Math.round((new Date(apt.endTime).getTime() - new Date(apt.startTime).getTime()) / 60000)
        }));
        setAppointments(mapped);
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os agendamentos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadAppointments(); }, []);

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 0 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 0 }),
  });

  const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmado': return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', dot: 'bg-emerald-500', label: 'Confirmado' };
      case 'agendado': return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600', dot: 'bg-amber-500', label: 'Agendado' };
      case 'cancelado': return { bg: 'bg-red-500/10 border-red-500/20 text-red-500', dot: 'bg-red-500', label: 'Cancelado' };
      case 'concluido': return { bg: 'bg-sky-500/10 border-sky-500/20 text-sky-600', dot: 'bg-sky-500', label: 'Concluído' };
      default: return { bg: 'bg-slate-100 border-slate-200 text-slate-600', dot: 'bg-slate-400', label: status };
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setSelectedDate(direction === 'prev' ? addDays(selectedDate, -1) : addDays(selectedDate, 1));
    } else if (viewMode === 'week') {
      setCurrentWeek(direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(direction === 'prev'
        ? new Date(currentWeek.getFullYear(), currentWeek.getMonth() - 1, 1)
        : new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 1));
    }
  };

  const getDisplayDates = () => {
    if (viewMode === 'day') return [selectedDate];
    if (viewMode === 'week') return weekDays;
    return eachDayOfInterval({ start: startOfMonth(currentWeek), end: endOfMonth(currentWeek) });
  };

  const filteredAppointments = appointments.filter(apt =>
    apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayAppointments = appointments.filter(apt => isSameDay(apt.date, new Date()));
  const todayConfirmed = todayAppointments.filter(a => a.status === 'confirmado').length;
  const todayPending = todayAppointments.filter(a => a.status === 'agendado').length;

  const stats = [
    { label: 'Hoje', value: todayAppointments.length, icon: 'today' },
    { label: 'Confirmados', value: todayConfirmed, icon: 'check_circle' },
    { label: 'Pendentes', value: todayPending, icon: 'schedule' },
    { label: 'Total Geral', value: appointments.length, icon: 'calendar_month' },
  ];

  return (
    <div className="relative space-y-10 pb-10 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h2 className="text-3xl font-extrabold text-primary font-headline tracking-tight">Agendamentos</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gerencie seus compromissos e horários</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          <Button variant="secondary" size="xl" onClick={() => setOpenModal(true)} className="shadow-lg shadow-secondary/20">
            <span className="material-symbols-outlined text-lg">add</span>
            <span className="hidden sm:inline">Novo Agendamento</span>
          </Button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {stats.map((s) => (
          <Card key={s.label} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 text-accent rounded-lg">
                <span className="material-symbols-outlined text-xl">{s.icon}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">{s.label}</p>
              <h3 className="text-2xl font-extrabold text-primary font-headline">{s.value}</h3>
            </div>
            <div className="mt-6">
              <div className="w-full h-1.5 bg-primary/5 rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full progress-bar-fill" style={{ width: s.value > 0 ? '100%' : '0%' }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* ── Mini Calendar Sidebar ── */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-lg">calendar_view_month</span>
              <h3 className="text-sm font-bold text-primary">Calendário</h3>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border-0 p-0 w-full"
              classNames={{
                months: "flex flex-col space-y-2 w-full",
                month: "space-y-2 w-full flex flex-col items-center",
                caption: "flex justify-center pt-1 relative items-center w-full",
                caption_label: "text-sm font-bold text-primary truncate",
                nav: "space-x-1 flex items-center",
                nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse mx-auto text-[12px]",
                head_row: "flex justify-between w-full",
                head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[10px] flex items-center justify-center",
                row: "flex justify-between w-full mt-1",
                cell: "aspect-square flex-1 text-center text-xs p-0 relative flex items-center justify-center",
                day: "w-full h-full flex items-center justify-center rounded-xl hover:bg-primary/10 aria-selected:bg-primary aria-selected:text-white transition-all",
                day_selected: "bg-primary text-white hover:bg-primary font-bold",
                day_today: "bg-secondary/10 text-secondary font-bold",
                day_outside: "text-muted-foreground opacity-40",
              }}
            />
          </Card>

          {/* Today's Quick Stats */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-secondary text-lg">bar_chart</span>
              <h3 className="text-sm font-bold text-primary">Hoje</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Agendados', value: todayAppointments.length, color: 'text-primary', dot: 'bg-primary' },
                { label: 'Confirmados', value: todayConfirmed, color: 'text-emerald-600', dot: 'bg-emerald-500' },
                { label: 'Pendentes', value: todayPending, color: 'text-amber-600', dot: 'bg-amber-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className={`text-sm font-black ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Main Calendar View ── */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">

            {/* Controls Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
                    <span className="material-symbols-outlined text-slate-600 text-base">chevron_left</span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
                    <span className="material-symbols-outlined text-slate-600 text-base">chevron_right</span>
                  </Button>
                  <h2 className="text-base font-black text-primary font-headline ml-1">
                    {viewMode === 'day'
                      ? format(selectedDate, "dd 'de' MMM, yyyy", { locale: ptBR })
                      : viewMode === 'week'
                      ? `${format(weekDays[0], "dd MMM", { locale: ptBR })} - ${format(weekDays[6], "dd MMM", { locale: ptBR })}`
                      : format(currentWeek, "MMMM yyyy", { locale: ptBR })}
                  </h2>
                </div>

                <Select value={viewMode} onValueChange={(v: 'day' | 'week' | 'month') => setViewMode(v)}>
                  <SelectTrigger className="w-28 rounded-xl border-slate-200 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">search</span>
                <Input
                  placeholder="Buscar agendamentos..."
                  className="pl-9 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Calendar Body */}
            <div>
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!isLoading && viewMode === 'day' && (
                <div>
                  <div className="grid grid-cols-[64px_1fr] sticky top-0 z-10 bg-primary/5 border-b border-slate-100">
                    <div className="p-3 text-xs text-muted-foreground border-r border-slate-100" />
                    <div className="p-3">
                      <div className="text-sm font-black text-primary">{format(selectedDate, 'EEEE', { locale: ptBR })}</div>
                      <div className="text-xs text-muted-foreground">{filteredAppointments.filter(apt => isSameDay(apt.date, selectedDate)).length} agendamentos</div>
                    </div>
                  </div>
                  {timeSlots.slice(7, 20).map((time) => {
                    const dayApts = filteredAppointments.filter(apt => isSameDay(apt.date, selectedDate) && apt.time === time);
                    return (
                      <div key={time} className="grid grid-cols-[64px_1fr] border-b border-slate-100/60 min-h-[56px] hover:bg-slate-50/40 transition-colors">
                        <div className="p-2 text-xs text-muted-foreground border-r border-slate-100 flex items-start justify-end pt-3 font-mono">{time}</div>
                        <div className="p-2 space-y-1.5">
                          {dayApts.map((apt) => {
                            const st = getStatusConfig(apt.status);
                            return (
                              <div key={apt.id} className={`rounded-xl border px-3 py-2 cursor-pointer hover:scale-[1.01] transition-all ${st.bg}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${st.dot} shrink-0`} />
                                  <span className="font-bold text-sm truncate">{apt.clientName}</span>
                                  <span className="text-xs ml-auto opacity-70">{apt.duration}min</span>
                                </div>
                                <div className="text-xs opacity-70 mt-0.5 ml-4">{apt.service}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isLoading && viewMode === 'week' && (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] sticky top-0 z-10 bg-primary/5 border-b border-slate-100">
                    <div className="p-2 border-r border-slate-100" />
                    {weekDays.map((day, idx) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div key={day.toISOString()} className={`p-2 text-center border-r border-slate-100 ${idx === 6 ? 'border-r-0' : ''}`}>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{format(day, 'EEE', { locale: ptBR })}</div>
                          <div className={`text-sm font-black mx-auto w-7 h-7 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-secondary text-white shadow-md shadow-orange-500/30' : 'text-primary'}`}>
                            {format(day, 'd')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    {timeSlots.slice(7, 20).map((time) => (
                      <div key={time} className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-100/60 min-h-[52px] hover:bg-slate-50/30 transition-colors">
                        <div className="p-1.5 text-[10px] text-muted-foreground border-r border-slate-100 flex items-start justify-end pt-2 font-mono">{time}</div>
                        {weekDays.map((day, idx) => {
                          const dayApts = filteredAppointments.filter(apt => isSameDay(apt.date, day) && apt.time === time);
                          return (
                            <div key={`${day.toISOString()}-${time}`} className={`p-1 border-r border-slate-100/60 ${idx === 6 ? 'border-r-0' : ''}`}>
                              {dayApts.map((apt) => {
                                const st = getStatusConfig(apt.status);
                                return (
                                  <div key={apt.id} className={`rounded-lg border px-1.5 py-1 mb-1 cursor-pointer hover:scale-[1.02] transition-all text-[10px] overflow-hidden ${st.bg}`}>
                                    <div className="flex items-center gap-1">
                                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0`} />
                                      <span className="font-bold truncate">{apt.clientName}</span>
                                    </div>
                                    <div className="opacity-60 truncate mt-0.5 pl-2.5">{apt.service}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isLoading && viewMode === 'month' && (
                <div>
                  <div className="grid grid-cols-7 border-b border-slate-100">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                      <div key={d} className="py-2 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-r border-slate-100 last:border-r-0">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-slate-100">
                    {getDisplayDates().map((date) => {
                      const dateApts = filteredAppointments.filter(apt => isSameDay(apt.date, date));
                      const isToday = isSameDay(date, new Date());
                      return (
                        <div
                          key={date.toISOString()}
                          className={`min-h-[90px] p-1.5 bg-white cursor-pointer hover:bg-primary/3 transition-colors ${isToday ? 'ring-2 ring-inset ring-secondary/60' : ''}`}
                          onClick={() => { setSelectedDate(date); setViewMode('day'); }}
                        >
                          <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-secondary text-white' : 'text-slate-600'}`}>
                            {format(date, 'd')}
                          </div>
                          <div className="space-y-0.5">
                            {dateApts.slice(0, 3).map((apt) => {
                              const st = getStatusConfig(apt.status);
                              return (
                                <div key={apt.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${st.bg}`}>
                                  <span className="font-bold">{apt.time}</span> {apt.clientName}
                                </div>
                              );
                            })}
                            {dateApts.length > 3 && (
                              <div className="text-[10px] text-muted-foreground pl-1">+{dateApts.length - 3} mais</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isLoading && filteredAppointments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-3xl">calendar_today</span>
                  </div>
                  <p className="font-bold text-primary">Nenhum agendamento encontrado</p>
                  <p className="text-sm text-muted-foreground">Clique em "Novo Agendamento" para começar</p>
                  <Button variant="secondary" size="xl" onClick={() => setOpenModal(true)} className="mt-2 shadow-lg shadow-secondary/20">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Novo Agendamento
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <NewAppointmentModal
        open={openModal}
        onOpenChange={setOpenModal}
        onSuccess={loadAppointments}
        initialDate={selectedDate}
      />
    </div>
  );
};

export default Appointments;