import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// Mock de dados de clientes com pacotes (adaptado para clínica de depilação a laser)
const mockClientPackages: any[] = [];

const Payments = () => {
  const [clients] = useState(mockClientPackages);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">Ativo</Badge>;
      case "completed":
        return <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold">Finalizado</Badge>;
      case "overdue":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold">Em Atraso</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">Pago</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold">Pendente</Badge>;
      case "overdue":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-bold">Atrasado</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "overdue" && client.status === "overdue") ||
      (filter === "active" && client.status === "active") ||
      (filter === "monthly" && client.packageType.toLowerCase().includes("mensal")) ||
      (filter === "package" && client.packageType.toLowerCase().includes("pacote"));

    const matchesSearch =
      client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.packageType.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Calcular estatísticas gerais
  const allPayments = clients.flatMap((c) => c.payments);
  const confirmedRevenue = allPayments
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + p.amount, 0);
  const pendingAmount = allPayments
    .filter((p) => p.status === "pending")
    .reduce((acc, p) => acc + p.amount, 0);
  const overdueAmount = allPayments
    .filter((p) => p.status === "overdue")
    .reduce((acc, p) => acc + p.amount, 0);
  const activeContracts = clients.filter((c) => c.status === "active").length;

  // Próximos vencimentos (7 dias)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const upcomingPayments = clients.filter((c) => {
    const paymentDate = new Date(c.nextPayment.date);
    return paymentDate >= today && paymentDate <= nextWeek;
  }).length;

  const handleAddManualPayment = (clientId: string) => {
    toast({
      title: "Adicionar Pagamento",
      description: `Funcionalidade em desenvolvimento para o cliente ${clientId}`,
    });
  };

  const handleViewContract = (clientId: string) => {
    toast({
      title: "Ver Detalhes",
      description: `Abrindo detalhes do contrato do cliente ${clientId}`,
    });
  };

  const stats = [
    { label: 'Receita Confirmada', value: `R$ ${confirmedRevenue.toFixed(2)}`, icon: 'payments' },
    { label: 'Pendentes',          value: `R$ ${pendingAmount.toFixed(2)}`,   icon: 'schedule' },
    { label: 'Em Atraso',          value: `R$ ${overdueAmount.toFixed(2)}`,   icon: 'warning',     destructive: true },
    { label: 'Contratos Ativos',   value: activeContracts.toString(),          icon: 'description' },
    { label: 'Próximos 7 Dias',    value: upcomingPayments.toString(),         icon: 'event' },
  ];

  return (
    <div className="w-full space-y-8 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-3 w-full">
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline whitespace-nowrap">Financeiro</h1>
          <div className="flex-1 h-px bg-slate-200/50"></div>
          <p className="text-slate-500 text-sm hidden md:block">Controle de pacotes, planos e pagamentos</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/40 w-full sm:w-fit backdrop-blur-sm">
          <TabsTrigger value="overview" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Visão Geral ── */}
        <TabsContent value="overview" className="space-y-8">
          {/* Stats Grid — Dashboard Mirror Pattern */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {stats.map((s) => (
              <Card key={s.label} className="p-6 bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm rounded-2xl hover-card transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 text-accent rounded-lg">
                    <span className="material-symbols-outlined text-xl">{s.icon}</span>
                  </div>
                  {s.destructive && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Atenção</span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{s.label}</p>
                  <h3 className={`text-2xl font-extrabold font-headline ${
                    s.destructive ? 'text-red-500' : 'text-primary'
                  }`}>{s.value}</h3>
                </div>
              </Card>
            ))}
          </div>

          {/* Main Content Area */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100/60 bg-white/40">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-3 flex-1">
                  <h3 className="text-lg font-bold text-primary font-headline whitespace-nowrap">Gerenciar Pagamentos</h3>
                  <div className="flex-1 h-px bg-slate-200/50"></div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative w-full sm:w-[300px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                    <Input
                      placeholder="Buscar cliente ou serviço..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white text-sm"
                    />
                  </div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] rounded-xl border-slate-200 font-bold text-slate-600 bg-slate-50">
                      <span className="material-symbols-outlined text-lg mr-2">filter_alt</span>
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="overdue">Em Atraso</SelectItem>
                      <SelectItem value="active">Pacotes Ativos</SelectItem>
                      <SelectItem value="monthly">Mensalidades</SelectItem>
                      <SelectItem value="package">Pacotes de Sessões</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-6">
              {filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm mx-auto mb-4 border border-slate-100">
                    <span className="material-symbols-outlined text-slate-300 text-3xl">account_balance_wallet</span>
                  </div>
                  <p className="font-bold text-slate-400">Nenhum registro encontrado</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-3">
                  {filteredClients.map((client) => (
                    <AccordionItem key={client.id} value={client.id} className="border border-slate-100 rounded-2xl overflow-hidden hover:border-primary/20 transition-all bg-white shadow-sm mb-4">
                      <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-slate-50 transition-all group">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-secondary"></span>
                              <span className="font-bold text-primary font-headline tracking-tight">{client.clientName}</span>
                              {getStatusBadge(client.status)}
                            </div>
                            <div className="text-xs font-medium text-slate-400">
                              {client.service} • {client.packageType}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-12 text-sm">
                            <div className="text-right hidden sm:block">
                              <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-2">Progresso</p>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary font-headline">{client.progress.completed}/{client.progress.total}</span>
                                <Progress
                                  value={(client.progress.completed / client.progress.total) * 100}
                                  className="w-16 h-1.5"
                                />
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Próx. Vencimento</p>
                              <p className="font-bold text-secondary">{client.nextPayment.date}</p>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-6 pb-6">
                        <div className="pt-4 space-y-6">
                          {/* Next Payment Detail */}
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">payments</span>
                              Detalhes da Próxima Parcela
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Data</p>
                                <p className="font-bold text-primary">{client.nextPayment.date}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Valor</p>
                                <p className="font-black text-xl text-primary">R$ {client.nextPayment.amount.toFixed(2)}</p>
                              </div>
                              <div className="col-span-2 md:col-span-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Método</p>
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-slate-400 text-lg">credit_card</span>
                                  <span className="font-bold text-primary">{client.nextPayment.method}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Payment History Table-like List */}
                          <div>
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">receipt_long</span>
                              Histórico Recente
                            </h4>
                            <div className="space-y-2">
                              {client.payments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white hover:bg-slate-50/50 transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/5 flex items-center justify-center">
                                      <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-primary">{payment.date}</p>
                                      <p className="text-[10px] font-medium text-muted-foreground">{payment.method}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <p className="font-black text-primary text-sm">R$ {payment.amount.toFixed(2)}</p>
                                    {getPaymentStatusBadge(payment.status)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button variant="secondary" className="flex-1 shadow-lg shadow-secondary/20" onClick={() => handleAddManualPayment(client.id)}>
                              <span className="material-symbols-outlined text-lg">add_card</span>
                              Lançar Pagamento Manual
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => handleViewContract(client.id)}>
                              <span className="material-symbols-outlined text-lg">visibility</span>
                              Ver Detalhes do Plano
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab: Relatórios ── */}
        <TabsContent value="reports" className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: 'Receita Total', value: `R$ ${confirmedRevenue.toFixed(2)}`, icon: 'trending_up', subtitle: 'Confirmado no período' },
              { label: 'Ticket Médio', value: `R$ ${clients.length > 0 ? (confirmedRevenue / clients.length).toFixed(2) : "0.00"}`, icon: 'query_stats', subtitle: 'Por cliente ativo' },
              { label: 'Inadimplência', value: `${allPayments.length > 0 ? ((allPayments.filter((p) => p.status === "overdue").length / allPayments.length) * 100).toFixed(1) : "0.0"}%`, icon: 'warning', subtitle: 'Dívidas em atraso', destructive: true },
            ].map(card => (
              <Card key={card.label} className="p-6 bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm rounded-2xl hover-card transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 text-accent rounded-lg">
                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                  </div>
                  {card.destructive && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Alerta</span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{card.label}</p>
                  <p className="text-[10px] text-slate-500 font-medium mb-2">{card.subtitle}</p>
                  <h3 className={`text-2xl font-extrabold font-headline ${card.destructive ? 'text-red-500' : 'text-primary'}`}>{card.value}</h3>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
             <Card className="p-8 bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm rounded-2xl hover-card">
                <div className="flex items-center gap-3 mb-8">
                  <h3 className="text-lg font-bold text-primary font-headline whitespace-nowrap">Serviços Lucrativos</h3>
                  <div className="flex-1 h-px bg-slate-200/50"></div>
                  <span className="material-symbols-outlined text-slate-300">pie_chart</span>
                </div>
                <div className="space-y-6 text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                   <p className="text-sm text-slate-400 italic">Nenhum dado de vendas disponível para o ranking.</p>
                </div>
             </Card>
 
             <Card className="p-8 bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm rounded-2xl hover-card">
                <div className="flex items-center gap-3 mb-8">
                  <h3 className="text-lg font-bold text-primary font-headline whitespace-nowrap">Saúde Financeira</h3>
                  <div className="flex-1 h-px bg-slate-200/50"></div>
                  <span className="material-symbols-outlined text-slate-300">analytics</span>
                </div>
                <div className="space-y-8">
                   <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-slate-500">Receitas</span>
                        </div>
                        <span className="text-emerald-500 font-bold">88%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                   </div>
                   <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-secondary"></span>
                          <span className="text-slate-500">Pendências</span>
                        </div>
                        <span className="text-secondary font-bold">12%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: '12%' }}></div>
                      </div>
                   </div>
                </div>
             </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payments;
