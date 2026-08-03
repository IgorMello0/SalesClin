const fs = require('fs');
let content = fs.readFileSync('src/components/funnel/ProposalDialog.tsx', 'utf8');

// 1. Add state variables and isAdminOrGestor
content = content.replace(
  'const [isSaving, setIsSaving] = useState(false);',
  'const [isSaving, setIsSaving] = useState(false);\n  const [showConfirmModal, setShowConfirmModal] = useState(false);\n\n  const isAdminOrGestor = [\'admin\', \'manager\', \'gestor\', \'administrador\'].some(r => \n    professional?.role?.toLowerCase().includes(r)\n  );'
);

// 2. Remove showJustification from initial state
content = content.replace(
  'justificationType: \'\' as \'desconto\' | \'remocao\' | \'\',\n        showJustification: false,',
  'justificationType: \'\' as \'desconto\' | \'remocao\' | \'\','
);

// 3. Update handleSaveProposal to have the confirmation and edit logic
const newSaveMethod = `  const handleSaveProposal = async () => {
    if (!isAdminOrGestor && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    setIsSaving(true);
    try {
      await executeSaveProposal();
    } catch (e: any) {
      console.error('[ProposalDialog] Erro ao salvar propostas:', e);
      toast({ title: isEditMode ? 'Erro ao atualizar proposta' : 'Erro ao salvar propostas', description: e?.message || '', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const executeSaveProposal = async () => {
    if (!lead) return;

    if (isEditMode) {
      const proposalData = proposals[0];
      const newValue = parseCurrency(proposalData.value);

      const res = await leadsApi.updateProposal(Number(lead.id), editingProposal.id, {
        title: proposalData.title || editingProposal.title,
        value: newValue,
        validUntil: proposalData.validUntil || undefined,
        salespersonId: proposalData.salesperson ? Number(proposalData.salesperson) : null,
        specialistId: proposalData.specialist ? Number(proposalData.specialist) : null,
        sdrId: proposalData.sdr ? Number(proposalData.sdr) : null,
        tags: proposalData.tags,
        justification: proposalData.justification || null,
        discountApplied: false
      });

      if (!res.success) throw new Error(res.error?.message || 'Erro ao atualizar proposta');

      const changes = [];
      if (editingProposal.title !== proposalData.title && proposalData.title) {
        changes.push(\`o título para "\${proposalData.title}"\`);
      }
      
      if (newValue !== Number(editingProposal.value)) {
        changes.push(\`o valor para \${formatCurrency(newValue.toString())}\`);
      }

      let contentText = \`Proposta #\${editingProposal.id} atualizada\`;
      if (changes.length > 0) contentText += \` - Alterou \${changes.join(' e ')}\`;
      if (proposalData.justification) contentText += \` - Justificativa: \${proposalData.justification}\`;

      await leadsApi.addActivity(Number(lead.id), {
        type: 'proposta',
        content: contentText,
        createdBy: professional?.name || 'Vendedor'
      });
      toast({ title: "Proposta atualizada com sucesso!" });
    } else {
      for (let index = 0; index < proposals.length; index++) {
        const proposalData = proposals[index];
        const newValue = parseCurrency(proposalData.value);

        const res = await (targetType === 'client' ? clientsApi : leadsApi).addProposal(Number(lead.id), {
          title: proposalData.title || \`Proposta para \${lead.name} (\${index + 1})\`,
          value: newValue,
          validUntil: proposalData.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          salespersonId: proposalData.salesperson ? Number(proposalData.salesperson) : null,
          specialistId: proposalData.specialist ? Number(proposalData.specialist) : null,
          sdrId: proposalData.sdr ? Number(proposalData.sdr) : null,
          tags: proposalData.tags,
          justification: proposalData.justification || null,
          discountApplied: false
        });

        if (!res.success) throw new Error(res.error?.message || 'Erro ao criar proposta');

        const changesStr = newValue !== lead.value ? \` (Valor: \${formatCurrency(newValue.toString())})\` : '';
        await (targetType === 'client' ? clientsApi : leadsApi).addActivity(Number(lead.id), {
          type: 'proposta',
          content: \`Proposta gerada - \${proposalData.title}\${changesStr}\`,
          createdBy: professional?.name || 'Vendedor'
        });
      }

      const leadStatus = lead.status;
      if (targetType === 'lead') {
        const statusesBeforeProposal = ['prospect_lead', 'prospect_qualified', 'prospect_scheduled', 'prospect_attended'];
        if (statusesBeforeProposal.includes(leadStatus)) {
          await leadsApi.update(Number(lead.id), { status: 'comercial_proposal' });
        }
      }
      toast({ title: "Propostas Salvas com Sucesso!" });
    }
    setShowConfirmModal(false);
    onSuccess();
    onOpenChange(false);
  };
`;

const oldSaveMethodRegex = /  const handleSaveProposal = async \(\) => \{[\s\S]*?  const parseCurrency =/m;
content = content.replace(oldSaveMethodRegex, newSaveMethod + '\n  const parseCurrency =');

// 4. Update the Value input field to be disabled for non-admins and add warning text
content = content.replace(
  /<Input[\s]*value=\{formatCurrency\(proposal\.value\)\}[\s]*onChange=\{\(e\) => updateProposalField\(index, 'value', e\.target\.value\.replace\(\/\\D\/g, ''\)\)\}[\s]*placeholder="R\$ 0,00"[\s]*className="rounded-xl border-slate-200"[\s]*\/>/g,
  '<Input \n                          value={formatCurrency(proposal.value)}\n                          onChange={(e) => updateProposalField(index, \'value\', e.target.value.replace(/\\D/g, \'\'))}\n                          disabled={!isAdminOrGestor}\n                          placeholder="R$ 0,00" \n                          className="rounded-xl border-slate-200"\n                        />\n                        {!isAdminOrGestor && (\n                           <p className="text-[10px] text-slate-400 absolute -bottom-5">Apenas ADM/Gestor pode alterar o valor.</p>\n                        )}'
);
content = content.replace('className="space-y-2"', 'className="space-y-2 relative"');

// 5. Update justification rendering
const oldJustificationRegex = /\{isLowerValue && \([\s\S]*?\}\)/m;
const newJustification = `{parseCurrency(proposal.value) !== (isEditMode ? (editingProposal?.value || lead.value) : lead.value) && (
                      <div className="space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Alteração de Valor</Label>
                          <Textarea 
                            value={proposal.justification}
                            onChange={(e) => updateProposalField(index, 'justification', e.target.value)}
                            placeholder="Justifique a alteração do valor (obrigatório se foi alterado)..."
                            className="rounded-xl border-orange-200 bg-white min-h-[80px]"
                          />
                        </div>
                      </div>
                    )}`;
content = content.replace(oldJustificationRegex, newJustification);

// 6. Fix variables inside the map rendering
content = content.replace(
  'const isLowerValue = newValue < lead.value;',
  ''
);

// 7. Add Confirmation Modal
const confirmModalStr = `      {/* Confirmation Modal */}
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
              className="bg-secondary hover:bg-secondary/90 text-white rounded-xl gap-2 font-bold px-6"
            >
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
content = content.replace(/    <\/Dialog>\n  \);\n\}/m, confirmModalStr);
content = content.replace('<Dialog open={open} onOpenChange={onOpenChange}>', '<>\n      <Dialog open={open} onOpenChange={onOpenChange}>');

// Save the file
fs.writeFileSync('src/components/funnel/ProposalDialog.tsx', content);
console.log('Script executed successfully!');
