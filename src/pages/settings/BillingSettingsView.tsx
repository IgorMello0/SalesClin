import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { billingApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, ShieldAlert } from 'lucide-react';
import type { BillingStatus } from '@/lib/api';
import { format, parseISO } from 'date-fns';

export const BillingSettingsView = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    loadBillingStatus();
  }, []);

  const loadBillingStatus = async () => {
    try {
      setLoading(true);
      const res = await billingApi.getStatus();
      if (res.success && res.data) {
        setBillingStatus(res.data);
      } else {
        toast({ title: 'Erro', description: 'Não foi possível carregar os dados do plano.', variant: 'destructive' });
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
      
      // Aqui poderíamos enviar o motivo (cancelReason / otherReason) para um backend de feedback.
      console.log('Motivo do cancelamento:', cancelReason === 'other' ? otherReason : cancelReason);
      
      const res = await billingApi.cancelSubscription();
      if (res.success) {
        toast({ title: 'Sucesso', description: 'Sua assinatura foi cancelada.' });
        setIsCancelModalOpen(false);
        loadBillingStatus();
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
      case 'start': return 'Plano Start';
      case 'pro': return 'Plano Pro';
      case 'enterprise': return 'Plano Enterprise';
      default: return 'Plano Básico';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!billingStatus) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum plano ativo encontrado.
      </div>
    );
  }

  const isActive = billingStatus.status === 'active' || billingStatus.status === 'trialing';

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Meu Plano</h2>
          <p className="text-sm text-slate-500">Gerencie sua assinatura e cobranças.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
        {/* Background Accent */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-bl-full -mr-10 -mt-10 ${isActive ? 'from-emerald-400 to-emerald-600' : 'from-red-400 to-red-600'}`} />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-black text-slate-900">{getPlanName(billingStatus.planCode)}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                  isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {billingStatus.status === 'trialing' ? 'Testando' : billingStatus.status === 'active' ? 'Ativo' : 'Cancelado'}
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Ciclo de cobrança: <span className="font-semibold">{billingStatus.billingCycle === 'yearly' ? 'Anual' : 'Mensal'}</span>
              </p>
              {billingStatus.currentPeriodEndsAt && (
                <p className="text-sm text-slate-500 mt-1">
                  {billingStatus.status === 'canceled' ? 'Acesso válido até: ' : 'Próxima cobrança em: '}
                  <span className="font-semibold">{format(parseISO(billingStatus.currentPeriodEndsAt), 'dd/MM/yyyy')}</span>
                </p>
              )}
            </div>
          </div>
          
          {isActive && (
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full md:w-auto text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => setIsCancelModalOpen(true)}>
                Cancelar Assinatura
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Cancelar Assinatura
            </DialogTitle>
            <DialogDescription>
              Sentimos muito em ver você partir. Para nos ajudar a melhorar, por favor, nos conte o motivo do cancelamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup value={cancelReason} onValueChange={setCancelReason} className="gap-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="too_expensive" id="r1" />
                <Label htmlFor="r1" className="cursor-pointer">Achei o valor muito alto</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_using" id="r2" />
                <Label htmlFor="r2" className="cursor-pointer">Não estou utilizando o suficiente</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="missing_features" id="r3" />
                <Label htmlFor="r3" className="cursor-pointer">Faltou alguma funcionalidade importante</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="switching_software" id="r4" />
                <Label htmlFor="r4" className="cursor-pointer">Vou migrar para outro sistema</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="r5" />
                <Label htmlFor="r5" className="cursor-pointer">Outro motivo</Label>
              </div>
            </RadioGroup>

            {cancelReason === 'other' && (
              <div className="mt-4">
                <Textarea 
                  placeholder="Por favor, detalhe o seu motivo..." 
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className="resize-none h-24"
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)} disabled={isCanceling}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={isCanceling || !cancelReason}>
              {isCanceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
