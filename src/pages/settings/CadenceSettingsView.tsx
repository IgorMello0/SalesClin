import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { funnelConfigApi, cadenceApi } from '@/lib/api';
import { Save, Plus, Trash, Clock, Phone, MessageCircle, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const METHOD_ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />
};

export default function CadenceSettingsView() {
  const { toast } = useToast();
  const [funnels, setFunnels] = useState<any[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [config, setConfig] = useState<{ isActive: boolean; steps: any[] }>({ isActive: true, steps: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFunnels();
  }, []);

  useEffect(() => {
    if (selectedStage) loadCadenceConfig(selectedStage);
  }, [selectedStage]);

  const loadFunnels = async () => {
    try {
      // Carregar todos os funis dinâmicos
      const res = await funnelConfigApi.getAll();
      if (res.data) setFunnels(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCadenceConfig = async (stageCode: string) => {
    setIsLoading(true);
    try {
      const res = await cadenceApi.getByStage(stageCode);
      if (res.data) {
        setConfig({
          isActive: res.data.isActive,
          steps: res.data.steps || []
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!selectedStage) return;
    try {
      setIsLoading(true);
      await cadenceApi.update(selectedStage, {
        isActive: config.isActive,
        steps: config.steps
      });
      toast({ title: 'Configuração salva com sucesso!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao salvar configuração', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const addStep = () => {
    setConfig(prev => ({
      ...prev,
      steps: [...prev.steps, { id: Date.now().toString(), method: 'call', waitMinutes: 0, title: 'Nova Ação', template: '' }]
    }));
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...config.steps];
    newSteps[index][field] = value;
    setConfig({ ...config, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = [...config.steps];
    newSteps.splice(index, 1);
    setConfig({ ...config, steps: newSteps });
  };

  const currentFunnelObj = funnels.find(f => f.code === selectedFunnel || f.id === selectedFunnel);
  const stages = currentFunnelObj ? currentFunnelObj.stages || [] : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cadência de Contatos</h2>
        <p className="text-muted-foreground">Automatize o fluxo de contatos para os leads em cada etapa do funil.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Funil e Etapa</CardTitle>
          <CardDescription>Escolha em qual etapa do funil a cadência será configurada.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1 space-y-2">
            <Label>Funil de Vendas</Label>
            <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funil...">
                  {funnels.find(f => (f.code || f.id.toString()) === selectedFunnel)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {funnels.map(f => (
                  <SelectItem key={f.id} value={f.code || f.id.toString()}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-2">
            <Label>Etapa do Funil</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage} disabled={!selectedFunnel}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa...">
                  {stages.find((s: any) => s.code === selectedStage)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stages.map((s: any) => (
                  <SelectItem key={s.id} value={s.code}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-6 flex gap-4 text-blue-900">
        <div className="bg-blue-100 p-3 rounded-full h-fit">
          <MessageCircle className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-2">Como funciona a Cadência Automática?</h3>
          <p className="text-sm text-blue-800/80 mb-3">
            A cadência de contatos é uma sequência de ações pré-programadas para garantir que o seu time comercial ou de atendimento 
            siga o roteiro ideal de abordagem. Ao mover um lead para a etapa configurada, o SellClin criará <b>automaticamente</b> as tarefas para os consultores executarem.
          </p>
          <ul className="text-sm text-blue-800/80 space-y-2 list-disc list-inside">
            <li><b>1º Passo:</b> Será agendado logo após o lead entrar na etapa (ou com o atraso configurado).</li>
            <li><b>Passos seguintes:</b> Quando o atendente clica em "Concluir Tarefa" no card do lead, o sistema lê esta configuração e agenda automaticamente o <b>próximo passo</b> respeitando o tempo de espera.</li>
            <li>Use o campo de "Template/Roteiro" para escrever instruções ou a mensagem exata que o SDR deve copiar e enviar no WhatsApp!</li>
          </ul>
        </div>
      </div>

      {selectedStage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Passos da Cadência</CardTitle>
              <CardDescription>Configure os passos automáticos quando o lead entrar nesta etapa.</CardDescription>
            </div>
            <Button onClick={saveConfig} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.steps.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-md border border-dashed">
                <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Nenhum passo de cadência configurado.</p>
                <Button variant="outline" className="mt-4" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Primeiro Passo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {config.steps.map((step, idx) => (
                  <div key={step.id || idx} className="border rounded-md p-4 bg-white shadow-sm flex flex-col gap-4 relative">
                    <div className="absolute top-4 right-4">
                      <Button variant="ghost" size="icon" onClick={() => removeStep(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-slate-100">Passo {idx + 1}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Título da Tarefa</Label>
                        <Input 
                          value={step.title} 
                          onChange={e => updateStep(idx, 'title', e.target.value)} 
                          placeholder="Ex: Primeira Ligação"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Canal de Contato</Label>
                        <Select value={step.method} onValueChange={v => updateStep(idx, 'method', v)}>
                          <SelectTrigger>
                            <SelectValue>
                              {step.method === 'call' ? 'Ligação' : step.method === 'whatsapp' ? 'WhatsApp' : step.method === 'email' ? 'E-mail' : 'Outro'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call"><div className="flex items-center gap-2"><Phone className="h-4 w-4"/> Ligação</div></SelectItem>
                            <SelectItem value="whatsapp"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4"/> WhatsApp</div></SelectItem>
                            <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="h-4 w-4"/> E-mail</div></SelectItem>
                            <SelectItem value="other"><div className="flex items-center gap-2">Outro</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Espera (após entrar ou passo ant.)</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="number" 
                            min="0"
                            value={step.waitValue !== undefined ? step.waitValue : (step.waitMinutes || 0)} 
                            onChange={e => updateStep(idx, 'waitValue', Number(e.target.value))} 
                            className="w-24"
                          />
                          <Select value={step.waitUnit || "minutes"} onValueChange={v => updateStep(idx, 'waitUnit', v)}>
                            <SelectTrigger className="flex-1">
                              <SelectValue>
                                {step.waitUnit === 'days' ? 'Dias' : step.waitUnit === 'hours' ? 'Horas' : 'Minutos'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutos</SelectItem>
                              <SelectItem value="hours">Horas</SelectItem>
                              <SelectItem value="days">Dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Template de Mensagem / Roteiro</Label>
                      <Textarea 
                        value={step.template} 
                        onChange={e => updateStep(idx, 'template', e.target.value)}
                        placeholder="Escreva o script ou mensagem sugerida para o vendedor..."
                        rows={3}
                      />
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full mt-4" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Próximo Passo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
