import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
    { label: 'Receita Confirmada', value: `R$ ${confirmedRevenue.toFixed(2)}`, icon: 'payments', color: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/20' },
    { label: 'Pendentes', value: `R$ ${pendingAmount.toFixed(2)}`, icon: 'schedule', color: 'from-amber-500 to-orange-500', glow: 'shadow-orange-500/20' },
    { label: 'Em Atraso', value: `R$ ${overdueAmount.toFixed(2)}`, icon: 'warning', color: 'from-red-500 to-rose-600', glow: 'shadow-red-500/20', destructive: true },
    { label: 'Contratos Ativos', value: activeContracts.toString(), icon: 'description', color: 'from-sky-500 to-blue-600', glow: 'shadow-sky-500/20' },
    { label: 'Próximos 7 Dias', value: upcomingPayments.toString(), icon: 'event', color: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/20' },
  ];

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 md:p-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-xl">account_balance_wallet</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary font-headline">
              Gestão Financeira
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Controle de pacotes, planos e pagamentos de clientes
          </p>
        </div>
      </div>

      {/* ── Tabs List ── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200/40 w-full sm:w-fit">
          <TabsTrigger value="overview" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Visão Geral ── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Stats Grid */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {stats.map((s) => (
              <Card key={s.label} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg ${s.glow}`}>
                    <span className="material-symbols-outlined text-white text-base">{s.icon}</span>
                  </div>
                </div>
                <p className={`text-xl sm:text-2xl font-black font-headline leading-none ${s.destructive ? 'text-red-500' : 'text-primary'}`}>
                  {s.value}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 uppercase font-bold tracking-wider">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Main Content Area */}
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100/60 bg-white/40">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-black text-primary font-headline">Gerenciar Pagamentos</h2>
                  <p className="text-sm text-muted-foreground">Clientes agrupados por pacotes e planos ativos</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
                    <Input
                      placeholder="Buscar por cliente, serviço ou tipo de pacote..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={filter} onValueChange={setFilter}>
                      <SelectTrigger className="w-full sm:w-[200px] rounded-xl border-slate-200 font-bold text-slate-600">
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
            </div>

            <div className="p-6">
              {filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm mx-auto mb-4 border border-slate-100">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">group_off</span>
                  </div>
                  <p className="font-bold text-slate-600">Nenhum registro encontrado</p>
                  <p className="text-sm text-muted-foreground">Tente ajustar seus filtros de busca</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-3">
                  {filteredClients.map((client) => (
                    <AccordionItem key={client.id} value={client.id} className="border border-slate-100 rounded-2xl overflow-hidden hover:border-primary/20 transition-all bg-white shadow-sm">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50/50 transition-all group">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-3">
                              <span className="font-black text-primary font-headline tracking-wide">{client.clientName}</span>
                              {getStatusBadge(client.status)}
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {client.service} • {client.packageType}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-12 text-sm">
                            <div className="text-right hidden sm:block">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-2">Progresso</p>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-primary">{client.progress.completed}/{client.progress.total}</span>
                                <Progress
                                  value={(client.progress.completed / client.progress.total) * 100}
                                  className="w-16 h-1.5"
                                />
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Próx. Vencimento</p>
                              <p className="font-black text-sky-600">{client.nextPayment.date}</p>
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
                            <button
                              onClick={() => handleAddManualPayment(client.id)}
                              className="flex-1 py-3 px-4 rounded-xl bg-primary text-white text-xs font-bold btn-hover shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-lg">add_card</span>
                              Lançar Pagamento Manual
                            </button>
                            <button
                              onClick={() => handleViewContract(client.id)}
                              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold btn-hover flex items-center justify-center gap-2 bg-white"
                            >
                              <span className="material-symbols-outlined text-lg">visibility</span>
                              Ver Detalhes do Plano
                            </button>
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
        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Receita Total', value: `R$ ${confirmedRevenue.toFixed(2)}`, icon: 'trending_up', subtitle: 'Confirmado no período', color: 'bg-emerald-500' },
              { label: 'Ticket Médio', value: `R$ ${clients.length > 0 ? (confirmedRevenue / clients.length).toFixed(2) : "0.00"}`, icon: 'query_stats', subtitle: 'Por cliente ativo', color: 'bg-indigo-500' },
              { label: 'Inadimplência', value: `${allPayments.length > 0 ? ((allPayments.filter((p) => p.status === "overdue").length / allPayments.length) * 100).toFixed(1) : "0.0"}%`, icon: 'warning', subtitle: 'Dívidas em atraso', color: 'bg-red-500', destructive: true },
            ].map(card => (
              <Card key={card.label} className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${card.color} flex items-center justify-center shadow-lg shadow-black/5`}>
                    <span className="material-symbols-outlined text-white text-xl">{card.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{card.label}</h3>
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  </div>
                </div>
                <p className={`text-4xl font-black font-headline ${card.destructive ? 'text-red-500' : 'text-primary'}`}>{card.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
             <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-primary font-headline">Serviços Mais Lucrativos</h3>
                    <p className="text-xs text-muted-foreground italic">Baseado em contratos ativos</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">pie_chart</span>
                </div>
                <div className="space-y-6 text-center py-10">
                   <p className="text-sm text-muted-foreground italic">Nenhum dado de vendas disponível para o ranking.</p>
                </div>
             </Card>

             <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-primary font-headline">Saúde Financeira</h3>
                    <p className="text-xs text-muted-foreground">Comparativo de fluxos</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">analytics</span>
                </div>
                <div className="space-y-4">
                   <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                        <span>Receitas</span>
                        <span className="text-emerald-500 font-black">88%</span>
                      </div>
                      <Progress value={88} className="h-2 bg-slate-100" />
                   </div>
                   <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                        <span>Pendências</span>
                        <span className="text-amber-500 font-black">12%</span>
                      </div>
                      <Progress value={12} className="h-2 bg-slate-100" />
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
