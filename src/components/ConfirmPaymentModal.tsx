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
      <DialogContent className="max-w-2xl bg-white border-0 shadow-2xl rounded-3xl p-0 overflow-hidden">
        <div className="p-6 bg-[#0B1525] relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent pointer-events-none" />
          <DialogTitle className="text-xl font-bold text-white font-headline flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-emerald-400">payments</span>
            Confirmar Recebimento
          </DialogTitle>
          <p className="text-emerald-100/70 text-sm mt-1 relative z-10">Defina a forma de pagamento e as parcelas para o valor de R$ {activeValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Seletor de Proposta */}
          {proposals.length > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Proposta Vinculada</Label>
              <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
                <SelectTrigger className="h-11 rounded-xl border-orange-200 bg-orange-50/50">
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
                  {proposals.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${p.status === 'pending' ? 'bg-orange-400' : p.status === 'accepted' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span>{p.title}</span>
                        <span className="text-slate-400">—</span>
                        <span className="font-semibold">R$ {Number(p.value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.status === 'pending' ? 'bg-orange-100 text-orange-600' : p.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {p.status === 'pending' ? 'Pendente' : p.status === 'accepted' ? 'Aceita' : 'Rejeitada'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProposalId !== 'none' && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Esta proposta será marcada como <strong>Aceita</strong> ao confirmar o pagamento.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento</Label>
              <Select value={method} onValueChange={(val) => { setMethod(val); if(val !== 'cartao') setInstallmentsCount(1); }}>
                <SelectTrigger className="h-11 rounded-xl">
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
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parcelas</Label>
                <Select 
                  value={installmentsCount.toString()} 
                  onValueChange={(val) => setInstallmentsCount(Number(val))}
                >
                  <SelectTrigger className="h-11 rounded-xl">
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

          <div className="space-y-3 mt-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhamento das Parcelas</Label>
            
            {installments.map((inst, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {idx + 1}
                </div>
                
                <div className="flex-1">
                  <Input 
                    type="date"
                    value={inst.date}
                    onChange={(e) => handleInstallmentChange(idx, 'date', e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                  <Input 
                    type="number"
                    value={inst.amount}
                    onChange={(e) => handleInstallmentChange(idx, 'amount', Number(e.target.value))}
                    className="h-9 text-sm pl-8"
                    step="0.01"
                  />
                </div>

                <div className="flex-1">
                  <Select value={inst.status} onValueChange={(val) => handleInstallmentChange(idx, 'status', val)}>
                    <SelectTrigger className="h-9 text-sm">
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

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <div className="text-sm font-medium text-slate-500">
              Total das parcelas: <span className={Math.abs(installments.reduce((acc, curr) => acc + Number(curr.amount), 0) - activeValue) > 0.1 ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>
                R$ {installments.reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 border-0 shadow-md shadow-emerald-500/20">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <span className="material-symbols-outlined text-[18px] mr-1.5">check_circle</span>}
                Confirmar Recebimento
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
