import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { empresasApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Tag, Loader2 } from 'lucide-react';

export default function DiscountSettingsView() {
  const { toast } = useToast();
  const { professional } = useAuth();
  const [maxDiscount, setMaxDiscount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await empresasApi.myCompanies();
      if (res.success && res.data && res.data.length > 0) {
        // Find current company
        const currentCompany = res.data.find((c: any) => c.id === professional?.companyId) || res.data[0];
        setMaxDiscount(currentCompany.maxDiscountPercentage ? String(currentCompany.maxDiscountPercentage) : '0');
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar configuracoes de desconto', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!professional?.companyId) return;
    
    const value = parseFloat(maxDiscount.replace(',', '.'));
    if (isNaN(value) || value < 0 || value > 100) {
      toast({ title: 'Valor invalido', description: 'O desconto deve ser entre 0 e 100.', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const res = await empresasApi.update(professional.companyId, {
        maxDiscountPercentage: value
      });
      
      if (res.success) {
        toast({ title: 'Salvo com sucesso', description: 'Limite de desconto atualizado.' });
      } else {
        toast({ title: 'Erro', description: res.error?.message || 'Erro ao salvar desconto', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar desconto', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-primary/10 text-primary rounded-2xl text-sm border border-primary/20 flex items-start gap-3 shadow-sm">
        <Tag className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="block mb-0.5 font-bold">Descontos e Alcadas</strong>
          Defina o desconto maximo que os membros da sua equipe comercial (SDR/Closer) podem oferecer sem precisar de autorizacao. Descontos acima deste valor precisarao da justificativa de um Gestor/Admin.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Limite de Desconto Comercial</CardTitle>
          <CardDescription>
            Percentual maximo permitido para fechamentos de vendas pela equipe comercial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Desconto Maximo (%)</Label>
              <div className="flex gap-4">
                <Input 
                  type="number" 
                  value={maxDiscount} 
                  onChange={e => setMaxDiscount(e.target.value)} 
                  placeholder="Ex: 10" 
                  className="max-w-[200px]"
                  min="0"
                  max="100"
                />
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

