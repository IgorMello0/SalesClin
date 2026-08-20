import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, ArrowRight, Check, Loader2, AlertCircle } from "lucide-react";
import { leadsApi } from '@/lib/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: any[];
  funnelList: any[];
  onSuccess: () => void;
}

const SELLCLIN_FIELDS = [
  { id: 'name', label: 'Nome do Lead (*Obrigatório)' },
  { id: 'phone', label: 'Telefone' },
  { id: 'email', label: 'Email' },
  { id: 'value', label: 'Valor/Orçamento' },
  { id: 'origin', label: 'Origem (Instagram, Face, etc)' },
  { id: 'notes', label: 'Observações' }
];

export function ImportModal({ isOpen, onClose, team, funnelList, onSuccess }: ImportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  
  // mapping[csvHeader] = sellclinFieldId
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  const [defaultSdr, setDefaultSdr] = useState<string>("");
  const [defaultCloser, setDefaultCloser] = useState<string>("");
  const [defaultStage, setDefaultStage] = useState<string>("prospect_lead");
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      toast({ title: "Formato Inválido", description: "Por favor, envie um arquivo .csv", variant: "destructive" });
      return;
    }

    setFile(selectedFile);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        if (results.meta.fields && results.meta.fields.length > 0) {
          setHeaders(results.meta.fields);
          setRawRows(results.data);
          
          // Auto-map common headers
          const initialMapping: Record<string, string> = {};
          results.meta.fields.forEach(header => {
            const h = header.toLowerCase();
            if (h.includes('nome') || h.includes('name')) initialMapping[header] = 'name';
            else if (h.includes('telefone') || h.includes('celular') || h.includes('phone') || h.includes('whatsapp')) initialMapping[header] = 'phone';
            else if (h.includes('email') || h.includes('e-mail')) initialMapping[header] = 'email';
            else if (h.includes('valor') || h.includes('value')) initialMapping[header] = 'value';
            else if (h.includes('origem') || h.includes('origin') || h.includes('fonte')) initialMapping[header] = 'origin';
            else if (h.includes('obs') || h.includes('nota')) initialMapping[header] = 'notes';
          });
          setMapping(initialMapping);
          setStep(2);
        } else {
          toast({ title: "Arquivo Vazio", description: "Não conseguimos ler as colunas do arquivo.", variant: "destructive" });
        }
      },
      error: function(err: any) {
        toast({ title: "Erro ao ler arquivo", description: err.message, variant: "destructive" });
      }
    });
  };

  const resetState = () => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setDefaultSdr("");
    setDefaultCloser("");
    setDefaultStage("prospect_lead");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const executeImport = async () => {
    const isNameMapped = Object.values(mapping).includes('name');
    if (!isNameMapped) {
      toast({ title: "Mapeamento Incompleto", description: "Você precisa mapear qual coluna representa o Nome do lead.", variant: "destructive" });
      return;
    }

    setIsImporting(true);

    try {
      const mappedLeads = rawRows.map(row => {
        const lead: any = {};
        Object.entries(mapping).forEach(([csvHeader, sellclinField]) => {
          if (sellclinField && sellclinField !== 'none') {
             lead[sellclinField] = row[csvHeader];
          }
        });
        return lead;
      }).filter(lead => lead.name);

      const payload = {
        leads: mappedLeads,
        defaultSdrId: defaultSdr && defaultSdr !== 'none' ? Number(defaultSdr) : undefined,
        defaultCloserId: defaultCloser && defaultCloser !== 'none' ? Number(defaultCloser) : undefined,
        defaultStage: defaultStage || undefined
      };

      const res = await leadsApi.importLeads(payload);
      
      if (res.success) {
        toast({ 
          title: "Importação Concluída!", 
          description: `${res.data.createdCount} criados e ${res.data.updatedCount} atualizados.`
        });
        onSuccess();
        handleClose();
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro na Importação", description: e.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] bg-white p-0 overflow-hidden rounded-3xl border-slate-100 shadow-2xl">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <DialogTitle className="text-xl font-bold text-slate-800">Importar Leads (CSV)</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1">
            Mapeie os dados da sua planilha para dentro do SellClin.
          </DialogDescription>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-orange-50/50 hover:border-orange-200 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Clique para enviar seu arquivo CSV</h3>
              <p className="text-slate-500 text-sm mt-2 text-center">
                Se você usa Excel (.xlsx), vá em "Salvar Como" e escolha o formato "CSV (Separado por vírgulas)".
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">Mapeamento de Colunas</h4>
                  <p className="text-blue-700 text-xs mt-1">
                    Nós lemos a primeira linha do seu arquivo. Agora, diga para o SellClin o que cada coluna significa. Você não precisa mapear todas.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {headers.map(header => (
                  <div key={header} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-1/2 font-medium text-slate-700 text-sm truncate" title={header}>
                      Coluna: <span className="font-bold text-slate-900">{header}</span>
                    </div>
                    <div className="w-1/2 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                      <Select value={mapping[header] || 'none'} onValueChange={(val) => setMapping(prev => ({ ...prev, [header]: val }))}>
                        <SelectTrigger className="bg-white border-slate-200">
                          <span className="truncate">
                            {(mapping[header] || 'none') === 'none' ? 'Ignorar coluna' : SELLCLIN_FIELDS.find(f => f.id === mapping[header])?.label || 'Ignorar coluna'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-slate-400 italic">Ignorar coluna</SelectItem>
                          {SELLCLIN_FIELDS.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-bold text-orange-900 text-sm">Quase lá! Configurações Padrão</h4>
                  <p className="text-orange-700 text-xs mt-1">
                    Para qual funil e para quais responsáveis devemos enviar os {rawRows.length} leads importados?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Atribuir a um SDR (Opcional)</label>
                  <Select value={defaultSdr} onValueChange={setDefaultSdr}>
                    <SelectTrigger>
                      <span className="truncate">
                        {defaultSdr === 'none' ? 'Deixar sem SDR' : defaultSdr ? team?.find(t => t.id.toString() === defaultSdr)?.name : 'Selecione um SDR...'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Deixar sem SDR</SelectItem>
                      {team?.filter(t => t.role === 'sdr' || t.role === 'admin').map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Atribuir a um Closer (Opcional)</label>
                  <Select value={defaultCloser} onValueChange={setDefaultCloser}>
                    <SelectTrigger>
                      <span className="truncate">
                        {defaultCloser === 'none' ? 'Deixar sem Closer' : defaultCloser ? team?.find(t => t.id.toString() === defaultCloser)?.name : 'Selecione um Closer...'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Deixar sem Closer</SelectItem>
                      {team?.filter(t => t.role === 'closer' || t.role === 'admin').map(t => (
                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2 mt-2">
                  <label className="text-xs font-bold text-slate-500">Estágio Inicial no Funil</label>
                  <Select value={defaultStage} onValueChange={setDefaultStage}>
                    <SelectTrigger>
                      <span className="truncate">
                        {defaultStage ? funnelList.flatMap(f => f.stages).find(s => s?.code === defaultStage)?.label : 'Selecione o estágio...'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {funnelList.map(funnel => (
                         <div key={funnel.id}>
                           <div className="px-2 py-1.5 text-xs font-bold text-slate-400 bg-slate-50">{funnel.name}</div>
                           {funnel.stages?.map((stage: any) => (
                             <SelectItem key={stage.code} value={stage.code} className="ml-2">{stage.label}</SelectItem>
                           ))}
                         </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <Button variant="ghost" onClick={handleClose} disabled={isImporting}>Cancelar</Button>
          
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl" onClick={() => setStep(3)}>
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 3 && (
              <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl" onClick={executeImport} disabled={isImporting}>
                {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {isImporting ? 'Importando...' : 'Finalizar Importação'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
