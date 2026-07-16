import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { billingApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, ShieldAlert, Users, Building2, CheckCircle2, Crown, Activity, Sparkles, Check } from 'lucide-react';
import type { BillingStatus, BillingUsage } from '@/lib/api';
import { format, parseISO } from 'date-fns';

export const BillingSettingsView = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [statusRes, usageRes] = await Promise.all([
        billingApi.getStatus(),
        billingApi.getUsage()
      ]);

      if (statusRes.success && statusRes.data) {
        setBillingStatus(statusRes.data);
      }
      
      if (usageRes.success && usageRes.data) {
        setBillingUsage(usageRes.data);
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao buscar o plano.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelReason) {
      toast({ title: 'Aviso', description: 'Por favor, selecione um motivo para o cancelamento.', variant: 'destructive' });
      return;
    }
    if (cancelReason === 'other' && !otherReason.trim()) {
      toast({ title: 'Aviso', description: 'Por favor, descreva o motivo do cancelamento.', variant: 'destructive' });
      return;
    }

    try {
      setIsCanceling(true);
      const res = await billingApi.cancelSubscription();
      if (res.success) {
        toast({ title: 'Sucesso', description: 'Sua assinatura foi cancelada.' });
        setIsCancelModalOpen(false);
        loadBillingData();
      } else {
        toast({ title: 'Erro', description: res.error?.message || 'Falha ao cancelar assinatura.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao cancelar assinatura.', variant: 'destructive' });
    } finally {
      setIsCanceling(false);
    }
  };

  const getPlanName = (code?: string) => {
    switch (code) {
      case 'start': return 'Start';
      case 'pro': return 'Pro';
      case 'enterprise': return 'Enterprise';
      default: return 'Básico';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-slate-500 font-medium animate-pulse">Carregando dados...</p>
      </div>
    );
  }

  if (!billingStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200">
        <CreditCard className="h-8 w-8 text-slate-400 mb-3" />
        <h3 className="text-base font-bold text-slate-900 mb-1">Nenhum plano ativo</h3>
        <p className="text-sm text-slate-500 text-center max-w-sm">Você ainda não possui uma assinatura ativa. Escolha um plano para liberar todos os recursos.</p>
      </div>
    );
  }

  const isActive = billingStatus.status === 'active' || billingStatus.status === 'trialing';
  const isEnterprise = billingStatus.planCode === 'enterprise';

  // Calculate Usage percentages
  const userUsage = billingUsage?.users;
  const userPercent = userUsage?.limit ? Math.min((userUsage.used / userUsage.limit) * 100, 100) : 0;
  
  const clinicUsage = billingUsage?.clinics;
  const clinicPercent = clinicUsage?.limit ? Math.min((clinicUsage.used / clinicUsage.limit) * 100, 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-8">
      
      {/* 1. CLEAN PLAN CARD (The one the user liked) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-sm ${isEnterprise ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-slate-900 text-white'}`}>
              {isEnterprise ? <Crown className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {getPlanName(billingStatus.planCode)}
                </h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {billingStatus.status === 'trialing' ? 'Em Teste' : billingStatus.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">
                O seu ciclo de faturamento é <span className="font-bold text-slate-700">{billingStatus.billingCycle === 'yearly' ? 'Anual' : 'Mensal'}</span>.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1 md:text-right border-t md:border-t-0 pt-4 md:pt-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {billingStatus.status === 'canceled' ? 'Data de Expiração' : 'Próxima Renovação'}
            </p>
            <p className="text-base font-bold flex items-center md:justify-end gap-1.5 text-slate-900">
              <Activity className="h-4 w-4 text-blue-500" />
              {billingStatus.currentPeriodEndsAt 
                ? format(parseISO(billingStatus.currentPeriodEndsAt), "dd/MM/yyyy")
                : '--/--/----'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC USAGE STATS (With cool animations from previous version) */}
      {billingUsage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Users Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/60 rounded-bl-[60px] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Usuários Ativos</h4>
                    <p className="text-[11px] font-medium text-slate-500">Contas na clínica</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-slate-900">{userUsage?.used}</span>
                  <span className="text-xs font-bold text-slate-400 ml-1">
                    / {userUsage?.limit === null ? '∞' : userUsage?.limit}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${userUsage?.limit === null ? 100 : userPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-slate-500 text-right">
                  {userUsage?.limit === null ? 'Uso ilimitado' : `${userPercent.toFixed(1)}% utilizado`}
                </p>
              </div>
            </div>
          </div>

          {/* Clinics Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-slate-200 hover:shadow-lg hover:border-orange-200 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/60 rounded-bl-[60px] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Unidades Clínicas</h4>
                    <p className="text-[11px] font-medium text-slate-500">Unidades cadastradas</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-slate-900">{clinicUsage?.used}</span>
                  <span className="text-xs font-bold text-slate-400 ml-1">
                    / {clinicUsage?.limit === null ? '∞' : clinicUsage?.limit}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-400 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${clinicUsage?.limit === null ? 100 : clinicPercent}%` }}
                  >
                     <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-slate-500 text-right">
                  {clinicUsage?.limit === null ? 'Uso ilimitado' : `${clinicPercent.toFixed(1)}% utilizado`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC INCLUDED FEATURES (Bento Grid) */}
      {billingStatus.modules && billingStatus.modules.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">O que está incluso no seu plano</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {billingStatus.modules.map((mod, i) => (
              <div 
                key={mod.code} 
                className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:shadow-md hover:border-emerald-200 transition-all duration-300"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-transform">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="font-bold text-slate-700 text-xs truncate">{mod.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. COMPACT DANGER ZONE (With styling) */}
      {isActive && (
        <div className="pt-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full blur-[60px] opacity-10 pointer-events-none" />
            
            <div className="relative z-10 max-w-lg">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <h4 className="text-sm font-bold text-red-950">Cancelar Assinatura</h4>
              </div>
              <p className="text-xs text-red-900/70 font-medium leading-relaxed">
                Se você cancelar, o sistema permanecerá ativo até o final do seu ciclo atual de cobrança. Nenhum dado será excluído imediatamente.
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              className="relative z-10 w-full sm:w-auto rounded-xl shadow-md shadow-red-500/20 font-bold shrink-0 hover:scale-105 transition-transform"
              onClick={() => setIsCancelModalOpen(true)}
            >
              Cancelar Plano
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Modal (Stylized) */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          <div className="bg-slate-950 p-6 text-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-red-500/20 to-transparent pointer-events-none" />
             <div className="mx-auto h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-3 relative z-10 border border-red-500/30 backdrop-blur-md">
                <ShieldAlert className="h-6 w-6 text-red-400" />
             </div>
             <DialogTitle className="text-lg font-black text-white relative z-10">
               Confirmar Cancelamento
             </DialogTitle>
             <DialogDescription className="text-slate-400 text-xs mt-1 relative z-10 max-w-sm mx-auto">
               Ajude-nos a melhorar! Selecione o principal motivo que levou você a tomar essa decisão.
             </DialogDescription>
          </div>
          
          <div className="p-6 bg-slate-50">
            <RadioGroup value={cancelReason} onValueChange={setCancelReason} className="grid gap-3">
              {[
                { id: 'too_expensive', label: 'Achei o valor muito alto' },
                { id: 'not_using', label: 'Não uso o suficiente' },
                { id: 'missing_features', label: 'Faltam funcionalidades' },
                { id: 'switching_software', label: 'Vou migrar de sistema' },
                { id: 'other', label: 'Outro motivo' }
              ].map((reason) => (
                <Label 
                  key={reason.id} 
                  htmlFor={reason.id} 
                  className={`
                    group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-300 border-2
                    ${cancelReason === reason.id 
                      ? 'border-red-500 bg-red-50 shadow-sm shadow-red-500/10' 
                      : 'border-transparent bg-white hover:border-slate-200 hover:shadow-sm'}
                  `}
                >
                  <span className={`text-sm font-bold ${cancelReason === reason.id ? 'text-red-900' : 'text-slate-700'}`}>
                    {reason.label}
                  </span>
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${cancelReason === reason.id ? 'border-red-500' : 'border-slate-300 group-hover:border-slate-400'}`}>
                    {cancelReason === reason.id && <div className="h-2 w-2 rounded-full bg-red-500" />}
                  </div>
                  <RadioGroupItem value={reason.id} id={reason.id} className="sr-only" />
                </Label>
              ))}
            </RadioGroup>

            {cancelReason === 'other' && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <Textarea 
                  placeholder="Conte para nós em detalhes..." 
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className="resize-none h-24 rounded-xl text-sm bg-white border-2 border-slate-200 focus-visible:ring-red-500 focus-visible:border-red-500 shadow-inner"
                />
              </div>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
              <Button 
                variant="outline" 
                className="h-11 rounded-xl w-full sm:w-1/3 font-bold text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900" 
                onClick={() => setIsCancelModalOpen(false)} 
                disabled={isCanceling}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                className="h-11 rounded-xl w-full sm:w-2/3 font-bold shadow-md shadow-red-500/20" 
                onClick={handleCancelSubscription} 
                disabled={isCanceling || !cancelReason}
              >
                {isCanceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isCanceling ? 'Cancelando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
