const fs = require('fs');
let content = fs.readFileSync('src/components/funnel/ProposalDialog.tsx', 'utf8');

const confirmModalStr = `      </DialogContent>
    </Dialog>
    {/* Confirmation Modal */}
    <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white border-0 rounded-3xl shadow-2xl z-[100]">
        <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
          <DialogTitle className="text-xl font-bold text-slate-800">
            Confirme os Dados da Proposta
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Verifique os dados abaixo antes de gerar a proposta para o lead.
          </p>
        </DialogHeader>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {proposals.map((p, idx) => (
            <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Proposta</span>
                <span className="text-sm font-bold text-primary">{p.title || 'Sem título'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Valor</span>
                <span className="text-base font-black text-secondary">R$ {formatCurrency(p.value) || '0,00'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Especialista</span>
                <span className="text-sm font-medium text-slate-700">
                  {specialists.find(s => s.id.toString() === p.specialist)?.name || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Closer</span>
                <span className="text-sm font-medium text-slate-700">
                  {closers.find(c => c.id.toString() === p.salesperson)?.name || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-xs font-bold text-slate-400 uppercase">SDR</span>
                <span className="text-sm font-medium text-slate-700">
                  {sdrs.find(s => s.id.toString() === p.sdr)?.name || '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="p-6 border-t border-slate-100 bg-white">
          <Button variant="ghost" onClick={() => setShowConfirmModal(false)} className="rounded-xl">
            Revisar Dados
          </Button>
          <Button 
            onClick={() => {
              setIsSaving(true);
              executeSaveProposal().catch(e => {
                console.error(e);
                toast({ title: 'Erro', description: e.message || '', variant: 'destructive' });
              }).finally(() => setIsSaving(false));
            }}
            disabled={isSaving}
            className="bg-secondary hover:bg-secondary/90 text-white rounded-xl gap-2 font-bold px-6">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
            ) : (
              'Confirmar e Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}`;

content = content.replace(/      <\/DialogContent>\r?\n    <\/Dialog>\r?\n  \);\r?\n\}/, confirmModalStr);
fs.writeFileSync('src/components/funnel/ProposalDialog.tsx', content);
