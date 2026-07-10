import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { leadsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { format, addMonths } from 'date-fns';

interface Proposal {
  id: number;
  title: string;
  value: number;
  status: string;
  createdAt: string;
}

interface ConfirmPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  leadValue: number;
  onSuccess: () => void;
}

export function ConfirmPaymentModal({ open, onOpenChange, leadId, leadValue, onSuccess }: ConfirmPaymentModalProps) {
  const [method, setMethod] = useState('cartao');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>('none');
  const [loadingProposals, setLoadingProposals] = useState(false);
  const { toast } = useToast();

  // Buscar propostas do lead quando o modal abre
  useEffect(() => {
    if (open && leadId) {
      fetchProposals();
    }
    if (!open) {
      setSelectedProposalId('none');
      setProposals([]);
    }
  }, [open, leadId]);

  const fetchProposals = async () => {
    if (!leadId) return;
    setLoadingProposals(true);
    try {
      const res = await leadsApi.getProposals(Number(leadId));
      if (res.success && res.data) {
        setProposals(res.data);
        // Se tem apenas uma proposta pendente, selecionar automaticamente
        const pending = res.data.filter((p: Proposal) => p.status === 'pending');
        if (pending.length === 1) {
          setSelectedProposalId(pending[0].id.toString());
        }
      }
    } catch (e) {
      console.error('Erro ao buscar propostas:', e);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Se selecionou uma proposta, usar o valor dela
      const selectedProposal = proposals.find(p => p.id.toString() === selectedProposalId);
      const valueToUse = selectedProposal ? Number(selectedProposal.value) : leadValue;
      generateInstallments(method, installmentsCount, valueToUse);
    }
  }, [open, method, installmentsCount, leadValue, selectedProposalId, proposals]);

  const getActiveValue = () => {
    const selectedProposal = proposals.find(p => p.id.toString() === selectedProposalId);
    return selectedProposal ? Number(selectedProposal.value) : leadValue;
  };

  const generateInstallments = (currentMethod: string, count: number, totalValue: number) => {
    const valuePerInstallment = totalValue / count;
    const newInstallments = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      newInstallments.push({
        id: i + 1,
        amount: valuePerInstallment,
        date: format(addMonths(today, i), 'yyyy-MM-dd'),
        method: currentMethod,
        status: i === 0 && (currentMethod === 'pix' || currentMethod === 'dinheiro') ? 'pago' : 'pendente'
      });
    }
    setInstallments(newInstallments);
  };

  const handleInstallmentChange = (index: number, field: string, value: any) => {
    const updated = [...installments];
    updated[index] = { ...updated[index], [field]: value };
    setInstallments(updated);
  };

  const handleSubmit = async () => {
    if (!leadId) return;

    const activeValue = getActiveValue();
    
    // Validate
    const totalInput = installments.reduce((acc, curr) => acc + Number(curr.amount), 0);
    if (Math.abs(totalInput - activeValue) > 0.1) {
      toast({
        title: "Valores divergentes",
        description: `A soma das parcelas (R$ ${totalInput.toFixed(2)}) não bate com o valor (R$ ${activeValue.toFixed(2)}).`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        proposalId: selectedProposalId !== 'none' ? Number(selectedProposalId) : null,
        payments: installments.map(i => ({
          amount: Number(i.amount),
          date: new Date(i.date).toISOString(),
          method: i.method,
          status: i.status
        }))
      };

      const res = await leadsApi.confirmPayment(Number(leadId), payload);
      
      if (res.success) {
        toast({
          title: "Pagamento Confirmado! 💰",
          description: selectedProposalId !== 'none' 
            ? "Pagamento registrado e proposta marcada como aceita." 
            : "Os dados foram enviados para o dossiê do cliente.",
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: "Erro", description: res.error?.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erro ao confirmar pagamento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const activeValue = getActiveValue();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl rounded-3xl p-0 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-start gap-4 bg-white shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[24px]">payments</span>
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-800 font-headline">
              Confirmar Recebimento
            </DialogTitle>
            <p className="text-slate-500 text-sm mt-1">
              Defina a forma de pagamento e as parcelas para o valor de <strong className="text-emerald-600">R$ {activeValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-slate-50/30 flex-1 overflow-y-auto custom-scrollbar">
          {/* Seletor de Proposta */}
          {proposals.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <Label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">description</span>
                Proposta Vinculada
              </Label>
              <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <SelectValue placeholder="Selecione uma proposta...">
                    {selectedProposalId === 'none' 
                      ? 'Nenhuma proposta (usar valor do lead)' 
                      : (() => {
                          const p = proposals.find(p => p.id.toString() === selectedProposalId);
                          return p ? `${p.title} — R$ ${Number(p.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '';
                        })()
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma proposta (usar valor do lead)</SelectItem>
                  {proposals.filter(p => p.status !== 'rejected').map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${(p.status === 'pending' || p.status === 'comercial_closed' || p.status === 'sales_payment') ? 'bg-orange-400' : p.status === 'accepted' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span>{p.title}</span>
                        <span className="text-slate-400">—</span>
                        <span className="font-semibold">R$ {Number(p.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${(p.status === 'pending' || p.status === 'comercial_closed' || p.status === 'sales_payment') ? 'bg-orange-100 text-orange-600' : p.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {(p.status === 'pending' || p.status === 'comercial_closed' || p.status === 'sales_payment') ? 'Pendente' : p.status === 'accepted' ? 'Aceita' : 'Rejeitada'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProposalId !== 'none' && (
                <div className="text-xs text-emerald-700 flex items-start gap-2 mt-2 bg-emerald-50/80 p-3 rounded-xl border border-emerald-100">
                  <span className="material-symbols-outlined text-[16px] mt-0.5 text-emerald-500">check_circle</span>
                  <span className="leading-relaxed">Esta proposta será marcada como <strong className="text-emerald-800">Aceita</strong> ao confirmar o pagamento.</span>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[14px]">credit_card</span>
                  Forma de Pagamento
                </Label>
                <Select value={method} onValueChange={(val) => { setMethod(val); if(val !== 'cartao') setInstallmentsCount(1); }}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecione...">
                      {method === 'cartao' ? 'Cartão de Crédito' : 
                       method === 'pix' ? 'PIX' : 
                       method === 'dinheiro' ? 'Dinheiro' : 
                       method === 'transferencia' ? 'Boleto' : method}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="transferencia">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {method === 'cartao' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-right-2">
                  <Label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[14px]">format_list_numbered</span>
                    Parcelas
                  </Label>
                  <Select 
                    value={installmentsCount.toString()} 
                    onValueChange={(val) => setInstallmentsCount(Number(val))}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Parcelas">
                        {installmentsCount}x
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <Label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <span className="material-symbols-outlined text-[14px]">receipt_long</span>
              Detalhamento das Parcelas
            </Label>
            <div className="space-y-2.5">
              {installments.map((inst, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 self-start sm:self-auto">
                    {idx + 1}
                  </div>
                  
                  <div className="flex-1 w-full">
                    <Input 
                      type="date"
                      value={inst.date}
                      onChange={(e) => handleInstallmentChange(idx, 'date', e.target.value)}
                      className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    />
                  </div>
                  
                  <div className="flex-1 relative w-full">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                    <Input 
                      type="number"
                      value={inst.amount}
                      onChange={(e) => handleInstallmentChange(idx, 'amount', Number(e.target.value))}
                      className="h-10 text-sm pl-9 bg-slate-50 border-slate-200 font-semibold text-slate-700 focus:bg-white transition-colors"
                      step="0.01"
                    />
                  </div>

                  <div className="flex-1 w-full">
                    <Select value={inst.status} onValueChange={(val) => handleInstallmentChange(idx, 'status', val)}>
                      <SelectTrigger className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors">
                        <SelectValue>
                          {inst.status === 'pago' ? 'Pago' : 'Pendente'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-5 bg-white border-t border-slate-200 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-10">
            <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto text-center sm:text-left">
              Total: <span className={Math.abs(installments.reduce((acc, curr) => acc + Number(curr.amount), 0) - activeValue) > 0.1 ? "text-red-500 font-bold ml-1" : "text-emerald-600 font-extrabold text-base ml-1"}>
                R$ {installments.reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 border-0 shadow-lg shadow-emerald-500/20 text-white flex-1 sm:flex-none h-10 px-6 transition-all hover:scale-[1.02]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <span className="material-symbols-outlined text-[18px] mr-1.5">check_circle</span>}
                Confirmar
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
