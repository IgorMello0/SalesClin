import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { 
  Settings as SettingsIcon,
  Building,
  Plus,
  Trash2,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { catalogsApi, professionalsApi, usuariosApi, permissionsApi, empresasApi, rolesApi, billingApi, googleCalendarApi, type BillingUsage } from '@/lib/api';
import { useSectionTour } from '@/hooks/useSectionTour';
import { TourPopover } from '@/components/onboarding/TourPopover';

// -- CARGOS HELPERS REMOVIDOS (Agora vêm do banco) --

// -- COMPONENTES DE CONFIGURAÇÃO --

const ServicosView = () => {
  const { professional: authUser } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [targetProfId, setTargetProfId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', durationMinutes: '30' });

  const loadTargetProfessional = async () => {
    try {
      if (authUser?.role === 'profissional') {
        setTargetProfId(Number(authUser.id));
      } else {
        // Para admins ou usuários de equipe, buscamos o profissional dono da clínica
        const res = await professionalsApi.getAll({ pageSize: 1 });
        if (res.success && res.data && res.data.length > 0) {
          // Sempre pegamos o primeiro (dono) para gerenciar serviços da clínica
          setTargetProfId(Number(res.data[0].id));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadServices = async (profId: number) => {
    try {
      setLoading(true);
      const res = await catalogsApi.getAll({ professionalId: profId });
      setServices(res.data || []);
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar serviços', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargetProfessional();
  }, []);

  useEffect(() => {
    if (targetProfId) {
      loadServices(targetProfId);
    }
  }, [targetProfId]);

  const handleSave = async () => {
    if (!newService.name || !newService.price || !targetProfId) {
      toast({ title: 'Aviso', description: 'Preencha nome e preço', variant: 'destructive' });
      return;
    }
    try {
      await catalogsApi.create({
        professionalId: targetProfId,
        name: newService.name,
        price: parseFloat(newService.price.replace(',', '.')),
        durationMinutes: parseInt(newService.durationMinutes) || 30,
        status: 'ativo'
      });
      toast({ title: 'Sucesso', description: 'Serviço adicionado' });
      setIsAdding(false);
      setNewService({ name: '', price: '', durationMinutes: '30' });
      loadServices(targetProfId);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao salvar', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await catalogsApi.delete(id);
      toast({ title: 'Sucesso', description: 'Serviço removido' });
      if (targetProfId) loadServices(targetProfId);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao remover', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h3 className="font-medium text-sm">Serviços Ativos ({services.length})</h3>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-2" /> {isAdding ? 'Cancelar' : 'Novo'}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Novo Serviço</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome do Serviço</Label>
                <Input value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} placeholder="Ex: Limpeza de Pele" className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço (R$)</Label>
                <Input value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} placeholder="150,00" className="h-8 text-sm" type="number" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Duração Média (minutos)</Label>
                <Input 
                  type="number" 
                  value={newService.durationMinutes} 
                  onChange={e => setNewService({...newService, durationMinutes: e.target.value})} 
                  placeholder="Ex: 45" 
                  className="h-8 text-sm" 
                  min="5"
                />
              </div>
            </div>
            <Button size="sm" className="w-full mt-2" onClick={handleSave}>Salvar Serviço</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Carregando serviços...</div>
      ) : (
        <div className="space-y-3">
          {services.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50 hover:border-primary/30 transition-colors">
              <div>
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                  <span className="font-semibold text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.price || 0)}
                  </span>
                  <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/>{s.durationMinutes} min</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
          {services.length === 0 && !isAdding && (
            <div className="text-sm text-center py-6 text-muted-foreground border border-dashed rounded-lg">
              Nenhum serviço cadastrado para este profissional.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EquipeView = () => {
  const { toast } = useToast();
  const { professional } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', roleId: '', companyIds: [] as number[] });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [showNewMemberPassword, setShowNewMemberPassword] = useState(false);
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [buyingUserExtra, setBuyingUserExtra] = useState(false);

  const loadRoles = async () => {
    try {
      const res = await rolesApi.getAll();
      if (res.success) setRoles(res.data || []);
    } catch (e) {
      console.error('Erro ao carregar cargos:', e);
    }
  };

  const loadClinicas = async () => {
    try {
      const res = await empresasApi.myCompanies();
      if (res.success) setClinicas(res.data || []);
    } catch (e) {
      console.error('Erro ao carregar clínicas', e);
    }
  };

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await usuariosApi.getAll({ pageSize: 50 });
      if (res.success && res.data) {
        setTeam(res.data);
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar a equipe', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadBillingUsage = async () => {
    try {
      const res = await billingApi.getUsage();
      if (res.success && res.data) setBillingUsage(res.data);
    } catch (e) {
      console.error('Erro ao carregar limites de billing:', e);
    }
  };

  useEffect(() => {
    loadTeam();
    loadRoles();
    loadClinicas();
    loadBillingUsage();
  }, []);

  const handleBuyUserExtra = async () => {
    setBuyingUserExtra(true);
    try {
      const res = await billingApi.createAddonCheckout({
        addonCode: 'extra_user',
        targetCompanyId: billingUsage?.users.companyId || professional?.companyId,
        billingCycle: billingUsage?.billingCycle,
        quantity: 1,
      });
      if (res.success && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }
      throw new Error(res.error?.message || 'Nao foi possivel abrir o checkout.');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setBuyingUserExtra(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email) {
      toast({ title: 'Atenção', description: 'Preencha nome e e-mail.', variant: 'destructive' });
      return;
    }
    
    try {
      const res = await usuariosApi.create({
        name: newMember.name,
        email: newMember.email,
        roleId: newMember.roleId ? Number(newMember.roleId) : null,
        isActive: true,
        companyIds: newMember.companyIds.length > 0 ? newMember.companyIds : undefined,
      });
      if (res.success) {
        toast({ title: 'Convite enviado', description: `${newMember.name} receberá um e-mail para definir a senha.` });
        setIsAdding(false);
        setNewMember({ name: '', email: '', roleId: '', companyIds: [] });
        loadTeam();
        loadBillingUsage();
      } else {
        throw new Error(res.error?.message || 'Erro ao adicionar');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteMember = async (id: number) => {
    try {
      const res = await usuariosApi.delete(id);
      if (res.success) {
        toast({ title: 'Sucesso', description: 'Membro removido da equipe.' });
        if (selectedUserId === id) setSelectedUserId(null);
        loadTeam();
        loadBillingUsage();
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const loadUserPermissions = async (userId: number) => {
    setLoadingPermissions(true);
    try {
      const res = await permissionsApi.getUserPermissions(userId);
      if (res.success && res.data) {
        setUserPermissions(res.data);
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar permissões', variant: 'destructive' });
    } finally {
      setLoadingPermissions(false);
    }
  };

  const [editingMember, setEditingMember] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSelectUser = (user: any) => {
    if (selectedUserId === user.id) {
      setSelectedUserId(null);
      setEditingMember(null);
      return;
    }
    setSelectedUserId(user.id);
    
    // Configura o membro em edição com as clínicas que ele já possui acesso
    const userCompanyIds = user.companyAccess && user.companyAccess.length > 0 
      ? user.companyAccess.map((ca: any) => ca.companyId) 
      : [user.companyId];

    setEditingMember({ 
      ...user, 
      roleId: user.roleId?.toString() || '',
      companyIds: userCompanyIds
    });
    loadUserPermissions(user.id);
  };

  const handleUpdateProfile = async () => {
    if (!editingMember) return;
    setSavingProfile(true);
    try {
      const res = await usuariosApi.update(editingMember.id, {
        name: editingMember.name,
        email: editingMember.email,
        roleId: editingMember.roleId ? Number(editingMember.roleId) : null,
        companyIds: editingMember.companyIds
      });
      if (res.success) {
        toast({ title: 'Sucesso', description: 'Perfil atualizado!' });
        loadTeam();
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingMember || !resetPassword) {
      toast({ title: 'Atenção', description: 'Digite a nova senha.', variant: 'destructive' });
      return;
    }
    if (resetPassword.length < 6) {
      toast({ title: 'Atenção', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await usuariosApi.update(editingMember.id, {
        name: editingMember.name,
        email: editingMember.email,
        password: resetPassword
      });
      if (res.success) {
        toast({ title: 'Sucesso', description: 'Senha redefinida com sucesso!' });
        setResetPassword('');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleTogglePermission = (moduleId: number) => {
    setUserPermissions(prev => prev.map(p => 
      p.moduleId === moduleId ? { ...p, hasAccess: !p.hasAccess } : p
    ));
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId) return;
    setSavingPermissions(true);
    try {
      const res = await permissionsApi.updateUserPermissions(
        selectedUserId, 
        userPermissions.map(p => ({ moduleId: p.moduleId, hasAccess: p.hasAccess }))
      );
      if (res.success) {
        toast({ title: 'Salvo!', description: 'Permissões individuais atualizadas.' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingPermissions(false);
    }
  };

  const getRoleBadge = (roleName?: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900',
      comercial: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-900',
    };
    
    return (
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${colors[roleName?.toLowerCase() || ''] || 'bg-primary/10 text-primary border-primary/20'}`}>
        {roleName || 'Sem Cargo'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-2xl text-sm border border-blue-200/50 dark:border-blue-800/50 flex items-start gap-3 shadow-sm">
        <Users className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="leading-relaxed">
          <strong className="block mb-0.5 text-blue-900 dark:text-blue-100 font-bold">Gestão de Equipe</strong>
          Adicione funcionários e controle o acesso. Eles acessam o sistema pela mesma tela de login.
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium text-sm">Funcionários ({team.length})</h3>
          {billingUsage && (
            <p className="text-xs text-muted-foreground mt-1">
              {billingUsage.users.used} / {billingUsage.users.limit ?? 'ilimitado'} usuários nesta clínica
            </p>
          )}
        </div>
        {billingUsage && !billingUsage.users.canCreate ? (
          <Button size="sm" onClick={handleBuyUserExtra} disabled={buyingUserExtra}>
            <Plus className="w-4 h-4 mr-2" /> {buyingUserExtra ? 'Abrindo...' : 'Comprar usuário extra'}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="w-4 h-4 mr-2" /> {isAdding ? 'Cancelar' : 'Novo Funcionário'}
          </Button>
        )}
      </div>
      
      {isAdding && (
        <div className="p-4 border rounded-lg bg-muted/50 space-y-4 mb-4">
          <h4 className="font-medium text-sm">Novo Funcionário</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="Ex: Maria Silva" />
            </div>
            <div className="space-y-2">
              <Label>E-mail (Login)</Label>
              <Input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} placeholder="maria@clinica.com" />
            </div>
            <div className="space-y-2">
              <Label>Cargo / Função</Label>
              <Select value={newMember.roleId} onValueChange={v => setNewMember({...newMember, roleId: v})}>
                <SelectTrigger className="h-9 text-sm bg-background">
                  <SelectValue placeholder="Selecione um cargo...">
                    {roles.find(r => r.id.toString() === newMember.roleId)?.name || 'Selecione um cargo...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent position="item-aligned" className="z-[200]">
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clinicas.length > 0 && (
              <div className="space-y-2 sm:col-span-2 mt-2">
                <Label className="mb-2 block">Acesso às Clínicas (Multi-Tenancy)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-4 bg-background/50">
                  {clinicas.map(c => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`new-clinica-${c.id}`} 
                        checked={newMember.companyIds.includes(c.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewMember({...newMember, companyIds: [...newMember.companyIds, c.id]});
                          } else {
                            setNewMember({...newMember, companyIds: newMember.companyIds.filter(id => id !== c.id)});
                          }
                        }}
                      />
                      <label htmlFor={`new-clinica-${c.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {c.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleAddMember}>Enviar convite</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-center py-4 text-muted-foreground">Carregando equipe...</div>
        ) : team.length === 0 ? (
          <div className="text-sm text-center py-6 text-muted-foreground border border-dashed rounded-lg">
            Nenhum funcionário cadastrado.
          </div>
        ) : team.map((u) => (
          <div key={u.id}>
            <div 
              className={`flex justify-between items-center p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer ${selectedUserId === u.id ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleSelectUser(u)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs uppercase">
                  {u.name.substring(0,2)}
                </div>
                <div>
                  <div className="font-medium text-sm">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(u.role?.name)}
                <Button 
                  variant="ghost" size="sm" 
                  onClick={(e) => { e.stopPropagation(); handleDeleteMember(u.id); }} 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {selectedUserId === u.id && (
              <div className="mt-2 p-5 border rounded-lg bg-background space-y-6 animate-in slide-in-from-top-2 duration-200 shadow-inner">
                {/* Editar Perfil */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Editar Perfil
                    </h4>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleUpdateProfile} 
                      disabled={savingProfile}
                      className="h-7 text-xs px-4 border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      {savingProfile ? 'Salvando...' : 'Atualizar Dados'}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase text-muted-foreground font-bold">Nome</Label>
                      <Input 
                        value={editingMember?.name || ''} 
                        onChange={e => setEditingMember({...editingMember, name: e.target.value})}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] uppercase text-muted-foreground font-bold">E-mail</Label>
                      <Input 
                        value={editingMember?.email || ''} 
                        onChange={e => setEditingMember({...editingMember, email: e.target.value})}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[11px] uppercase text-muted-foreground font-bold">Cargo</Label>
                      <Select 
                        value={editingMember?.roleId || ''} 
                        onValueChange={v => setEditingMember({...editingMember, roleId: v})}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Selecione um cargo...">
                            {roles.find(r => r.id.toString() === editingMember?.roleId)?.name || 'Selecione um cargo...'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[250]">
                          {roles.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {clinicas.length > 0 && (
                      <div className="space-y-2 sm:col-span-2 mt-4">
                        <Label className="text-[11px] uppercase text-muted-foreground font-bold mb-2 block">Acesso às Clínicas (Multi-Tenancy)</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-4 bg-muted/20">
                          {clinicas.map(c => (
                            <div key={c.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`edit-clinica-${c.id}`} 
                                checked={editingMember?.companyIds?.includes(c.id)}
                                onCheckedChange={(checked) => {
                                  const current = editingMember?.companyIds || [];
                                  if (checked) {
                                    setEditingMember({...editingMember, companyIds: [...current, c.id]});
                                  } else {
                                    setEditingMember({...editingMember, companyIds: current.filter((id: number) => id !== c.id)});
                                  }
                                }}
                              />
                              <label htmlFor={`edit-clinica-${c.id}`} className="text-sm font-medium leading-none cursor-pointer">
                                {c.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Resetar Senha */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-orange-500" />
                      Resetar Senha
                    </h4>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[11px] uppercase text-muted-foreground font-bold">Nova Senha</Label>
                      <div className="relative">
                        <Input
                          type={showResetPassword ? "text" : "password"}
                          value={resetPassword}
                          onChange={e => setResetPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="h-9 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetPassword}
                      disabled={savingPassword || !resetPassword}
                      className="h-9 text-xs px-4 border-orange-400 text-orange-600 hover:bg-orange-500 hover:text-white"
                    >
                      {savingPassword ? 'Salvando...' : 'Resetar Senha'}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Permissões Override */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Permissões Individuais (Override)
                    </h4>
                    <Button 
                      size="sm" 
                      onClick={handleSavePermissions} 
                      disabled={savingPermissions || loadingPermissions}
                      className="h-7 text-xs px-4"
                    >
                      {savingPermissions ? 'Salvando...' : 'Salvar Permissões'}
                    </Button>
                  </div>

                  {loadingPermissions ? (
                    <div className="text-sm text-center py-3 text-muted-foreground">Carregando permissões...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {userPermissions.map(p => (
                        <div 
                          key={p.moduleId} 
                          className={`flex items-center justify-between p-2.5 border rounded-lg text-sm transition-colors ${
                            p.hasAccess ? 'bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900' : 'bg-muted/50 border-muted opacity-60'
                          }`}
                        >
                          <span className="font-medium text-xs">{p.moduleName}</span>
                          <Switch 
                            checked={p.hasAccess} 
                            onCheckedChange={() => handleTogglePermission(p.moduleId)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const InfoNegocioView = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState({
    id: 0,
    name: '',
    domain: '',
    whatsapp: '',
    plan: '',
    openHour: '08:00',
    closeHour: '20:00',
  });

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const res = await empresasApi.getMyCompany();
      if (res.success && res.data) {
        setCompanyData({
          id: res.data.id,
          name: res.data.name || '',
          domain: res.data.domain || '',
          whatsapp: res.data.whatsapp || '',
          plan: res.data.plan || '',
          openHour: res.data.openHour || '08:00',
          closeHour: res.data.closeHour || '20:00',
        });
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar dados da empresa', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyData.name) {
      toast({ title: 'Atenção', description: 'O nome da empresa é obrigatório.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await empresasApi.update(companyData.id, {
        name: companyData.name,
        domain: companyData.domain || null,
        whatsapp: companyData.whatsapp || null,
        plan: companyData.plan || null,
        openHour: companyData.openHour,
        closeHour: companyData.closeHour,
      });
      if (res.success) {
        toast({ title: 'Salvo!', description: 'Informações da empresa atualizadas.' });
      } else {
        throw new Error(res.error?.message || 'Erro ao salvar');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-center py-8 text-muted-foreground">Carregando dados da empresa...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 rounded-lg text-sm border border-blue-100 dark:border-blue-900 flex items-start gap-3">
        <Building className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-0.5">Dados da Empresa</strong>
          Informações cadastrais da sua empresa no sistema. Estas informações são compartilhadas com toda a equipe.
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nome da Empresa *</Label>
        <Input 
          value={companyData.name} 
          onChange={e => setCompanyData({...companyData, name: e.target.value})} 
          placeholder="Ex: Clínica Estética Premium" 
        />
      </div>

      <div className="space-y-2">
        <Label>Domínio / Site</Label>
        <Input 
          value={companyData.domain} 
          onChange={e => setCompanyData({...companyData, domain: e.target.value})} 
          placeholder="www.minhaempresa.com.br" 
        />
      </div>

      <div className="space-y-2">
        <Label>WhatsApp</Label>
        <Input 
          value={companyData.whatsapp} 
          onChange={e => setCompanyData({...companyData, whatsapp: e.target.value})} 
          placeholder="(11) 99999-9999" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Horário de Abertura</Label>
          <Input 
            type="time"
            value={companyData.openHour} 
            onChange={e => setCompanyData({...companyData, openHour: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label>Horário de Fechamento</Label>
          <Input 
            type="time"
            value={companyData.closeHour} 
            onChange={e => setCompanyData({...companyData, closeHour: e.target.value})} 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Plano Atual</Label>
        <Input 
          value={companyData.plan} 
          onChange={e => setCompanyData({...companyData, plan: e.target.value})} 
          placeholder="Ex: Profissional, Básico" 
          disabled
          className="bg-muted cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">O plano é gerenciado pela plataforma.</p>
      </div>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar Informações da Empresa'}
      </Button>
    </div>
  );
};

const CargosView = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const loadModules = async () => {
    try {
      const res = await modulesApi.getAll();
      if (res.success) setModules(res.data || []);
    } catch (e) {
      console.error('Erro ao carregar módulos:', e);
    }
  };

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await rolesApi.getAll();
      if (res.success) setRoles(res.data || []);
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao carregar cargos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
    loadModules();
  }, []);

  const handleAddRole = async () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      toast({ title: 'Aviso', description: 'Digite o nome do cargo', variant: 'destructive' });
      return;
    }
    const value = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
    
    try {
      const res = await rolesApi.create({ 
        name: trimmed, 
        value,
        permissions: modules.map(m => ({ moduleId: m.id, hasAccess: true }))
      });
      if (res.success) {
        toast({ title: 'Cargo criado!', description: `"${trimmed}" agora está salvo no banco de dados.` });
        setNewRoleName('');
        setIsAdding(false);
        loadRoles();
      } else {
        throw new Error(res.error?.message || 'Erro ao criar');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleSelectRole = (role: any) => {
    if (selectedRoleId === role.id) {
      setSelectedRoleId(null);
      return;
    }
    setSelectedRoleId(role.id);
    
    const currentPermissions = modules.map(m => {
      const existing = role.permissions?.find((p: any) => p.moduleId === m.id);
      return {
        moduleId: m.id,
        moduleName: m.name,
        hasAccess: existing ? existing.hasAccess : true
      };
    });
    setRolePermissions(currentPermissions);
  };

  const handleTogglePermission = (moduleId: number) => {
    setRolePermissions(prev => prev.map(p => 
      p.moduleId === moduleId ? { ...p, hasAccess: !p.hasAccess } : p
    ));
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setSavingPermissions(true);
    try {
      const role = roles.find(r => r.id === selectedRoleId);
      const res = await rolesApi.update(selectedRoleId, {
        name: role.name,
        permissions: rolePermissions.map(p => ({ moduleId: p.moduleId, hasAccess: p.hasAccess }))
      });
      if (res.success) {
        toast({ title: 'Salvo!', description: 'Permissões do cargo atualizadas.' });
        loadRoles();
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleDeleteRole = async (id: number) => {
    try {
      const res = await rolesApi.delete(id);
      if (res.success) {
        toast({ title: 'Removido', description: 'Cargo removido com sucesso.' });
        loadRoles();
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro ao remover cargo', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-2xl text-sm border border-blue-200/50 dark:border-blue-800/50 flex items-start gap-3 shadow-sm">
        <Tag className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="leading-relaxed">
          <strong className="block mb-0.5 text-blue-900 dark:text-blue-100 font-bold">Cargos e Funções</strong>
          Crie cargos personalizados e defina o que cada um pode acessar no sistema.
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-medium text-sm">Cargos Disponíveis ({roles.length})</h3>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-2" /> {isAdding ? 'Cancelar' : 'Novo Cargo'}
        </Button>
      </div>

      {isAdding && (
        <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
          <h4 className="font-medium text-sm">Novo Cargo</h4>
          <div className="flex gap-3">
            <Input 
              value={newRoleName} 
              onChange={e => setNewRoleName(e.target.value)} 
              placeholder="Ex: Auxiliar, Dentista, Marketing..."
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && handleAddRole()}
            />
            <Button onClick={handleAddRole}>Adicionar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-center py-4 text-muted-foreground">Carregando cargos...</div>
        ) : roles.length === 0 ? (
          <div className="text-sm text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            Nenhum cargo cadastrado.
          </div>
        ) : roles.map(role => (
          <div key={role.id}>
            <div 
              className={`flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:border-primary/30 transition-colors cursor-pointer ${selectedRoleId === role.id ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleSelectRole(role)}
            >
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
                  {role.name}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{role.value}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {selectedRoleId === role.id && (
              <div className="mt-2 p-4 border rounded-lg bg-background space-y-4 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Módulos Liberados para "{role.name}"
                  </h4>
                  <Button 
                    size="sm" 
                    onClick={handleSavePermissions} 
                    disabled={savingPermissions}
                    className="h-7 text-xs px-4"
                  >
                    {savingPermissions ? 'Salvando...' : 'Salvar Permissões'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rolePermissions.map(p => (
                    <div 
                      key={p.moduleId} 
                      className={`flex items-center justify-between p-2.5 border rounded-lg text-sm transition-colors ${
                        p.hasAccess ? 'bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900' : 'bg-muted/50 border-muted opacity-60'
                      }`}
                    >
                      <span className="font-medium text-xs">{p.moduleName}</span>
                      <Switch 
                        checked={p.hasAccess} 
                        onCheckedChange={() => handleTogglePermission(p.moduleId)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


const ClinicasView = () => {
  const { toast } = useToast();
  const { switchCompany, professional } = useAuth();
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newClinica, setNewClinica] = useState({ name: '', domain: '', whatsapp: '' });
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [buyingClinicExtra, setBuyingClinicExtra] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: '', domain: '', whatsapp: '', openHour: '08:00', closeHour: '20:00' });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadClinicas = async () => {
    try {
      setLoading(true);
      const res = await empresasApi.myCompanies();
      if (res.success && res.data) {
        setClinicas(res.data);
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao carregar clínicas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadBillingUsage = async () => {
    try {
      const res = await billingApi.getUsage();
      if (res.success && res.data) setBillingUsage(res.data);
    } catch (e) {
      console.error('Erro ao carregar limites de billing:', e);
    }
  };

  useEffect(() => {
    loadClinicas();
    loadBillingUsage();
  }, []);

  const handleBuyClinicExtra = async () => {
    setBuyingClinicExtra(true);
    try {
      const res = await billingApi.createAddonCheckout({
        addonCode: 'extra_clinic',
        billingCycle: billingUsage?.billingCycle,
        quantity: 1,
      });
      if (res.success && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }
      throw new Error(res.error?.message || 'Nao foi possivel abrir o checkout.');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setBuyingClinicExtra(false);
    }
  };

  const handleCreate = async () => {
    if (!newClinica.name) {
      toast({ title: 'Atenção', description: 'Nome da clínica é obrigatório', variant: 'destructive' });
      return;
    }
    try {
      const res = await empresasApi.create({
        name: newClinica.name,
        domain: newClinica.domain,
        whatsapp: newClinica.whatsapp,
        isActive: true,
      });
      if (res.success) {
        toast({ title: 'Sucesso', description: 'Clínica criada! A página será recarregada para atualizar seu acesso.' });
        setIsAdding(false);
        setNewClinica({ name: '', domain: '', whatsapp: '' });
        loadClinicas();
        loadBillingUsage();
        
        // Timeout para atualizar a página e o token JWT ler a nova clínica
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro ao criar', variant: 'destructive' });
    }
  };

  const startEditing = (c: any) => {
    setEditingId(c.id);
    setEditData({
      name: c.name || '',
      domain: c.domain || '',
      whatsapp: c.whatsapp || '',
      openHour: c.openHour || '08:00',
      closeHour: c.closeHour || '20:00'
    });
  };

  const handleUpdate = async () => {
    if (!editData.name) {
      toast({ title: 'Atenção', description: 'O nome da empresa é obrigatório.', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      const res = await empresasApi.update(editingId!, editData);
      if (res.success) {
        toast({ title: 'Salvo!', description: 'Informações da filial atualizadas.' });
        setEditingId(null);
        loadClinicas();
      } else {
        throw new Error(res.error?.message || 'Erro ao salvar');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center bg-background border p-4 rounded-xl shadow-sm">
        <div>
          <h3 className="text-lg font-bold">Minhas Clínicas</h3>
          <p className="text-sm text-muted-foreground">Gerencie as filiais da sua rede (Multi-Tenancy)</p>
          {billingUsage && (
            <p className="text-xs text-muted-foreground mt-1">
              {billingUsage.clinics.used} / {billingUsage.clinics.limit ?? 'ilimitado'} clínicas no plano
            </p>
          )}
        </div>
        {billingUsage && !billingUsage.clinics.canCreate ? (
          <Button onClick={handleBuyClinicExtra} disabled={buyingClinicExtra}>
            <Plus className="w-4 h-4 mr-2" /> {buyingClinicExtra ? 'Abrindo...' : 'Comprar clínica extra'}
          </Button>
        ) : (
          <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"}>
            {isAdding ? "Cancelar" : <><Plus className="w-4 h-4 mr-2" /> Nova Clínica</>}
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-primary/20 bg-primary/5 animate-in slide-in-from-top-2">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Clínica / Filial *</Label>
                <Input value={newClinica.name} onChange={e => setNewClinica({...newClinica, name: e.target.value})} placeholder="Ex: Matriz, Filial Centro..." />
              </div>
              <div className="space-y-2">
                <Label>Domínio / Subdomínio</Label>
                <Input value={newClinica.domain} onChange={e => setNewClinica({...newClinica, domain: e.target.value})} placeholder="Ex: centro.salesclin.com" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp (Opcional)</Label>
                <Input value={newClinica.whatsapp} onChange={e => setNewClinica({...newClinica, whatsapp: e.target.value})} placeholder="Ex: 11999999999" />
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full sm:w-auto">Criar Filial</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-4 text-muted-foreground">Carregando clínicas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinicas.map((c) => (
            <Card key={c.id} className={c.id === professional?.companyId ? "border-primary shadow-sm ring-1 ring-primary/20" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="w-4 h-4 text-primary" />
                    {c.name}
                  </CardTitle>
                  {c.id === professional?.companyId && (
                    <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Ativa
                    </span>
                  )}
                </div>
                <CardDescription>{c.domain || 'Sem domínio'}</CardDescription>
              </CardHeader>
              
              {editingId === c.id ? (
                <CardContent className="pt-2 pb-4 space-y-4 animate-in fade-in">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome da Filial</Label>
                      <Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Domínio / Site</Label>
                      <Input value={editData.domain} onChange={e => setEditData({...editData, domain: e.target.value})} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input value={editData.whatsapp} onChange={e => setEditData({...editData, whatsapp: e.target.value})} className="h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Abertura</Label>
                        <Input type="time" value={editData.openHour} onChange={e => setEditData({...editData, openHour: e.target.value})} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fechamento</Label>
                        <Input type="time" value={editData.closeHour} onChange={e => setEditData({...editData, closeHour: e.target.value})} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                    <Button size="sm" disabled={savingEdit} onClick={handleUpdate}>
                      {savingEdit ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-4">
                    ID da Clínica: {c.id}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <Button variant="outline" size="sm" onClick={() => startEditing(c)} className="h-7 text-xs px-3">
                      <SettingsIcon className="w-3.5 h-3.5 mr-1.5" /> Editar
                    </Button>
                    <span className="text-[10px] text-muted-foreground">
                      Troque de clínica pelo Dashboard
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const AparenciaView = () => {
  const { layout, setLayout } = useLayout();
  const { toast } = useToast();

  const handleLayoutChange = (value: 'top' | 'side') => {
    setLayout(value);
    toast({ title: 'Sucesso', description: 'Preferência de layout atualizada.' });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="p-4 bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-2xl text-sm border border-orange-200/50 dark:border-orange-800/50 flex items-start gap-3 shadow-sm">
        <Monitor className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
        <div className="leading-relaxed">
          <strong className="block mb-0.5 text-orange-900 dark:text-orange-100 font-bold">Layout e Navegação</strong>
          Escolha como prefere navegar pelo sistema. Essa preferência é salva no seu navegador.
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-sm">Posição do Menu</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div 
            onClick={() => handleLayoutChange('top')}
            className={`p-4 border rounded-xl cursor-pointer transition-all ${layout === 'top' ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-md' : 'hover:border-primary/50 bg-background'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <LayoutTemplate className={`w-6 h-6 ${layout === 'top' ? 'text-primary' : 'text-muted-foreground'}`} />
              {layout === 'top' && <div className="w-3 h-3 rounded-full bg-primary" />}
            </div>
            <div className="font-bold text-sm">Menu Superior</div>
            <div className="text-xs text-muted-foreground mt-1">Navegação no topo da tela, ideal para foco no conteúdo.</div>
          </div>

          <div 
            onClick={() => handleLayoutChange('side')}
            className={`p-4 border rounded-xl cursor-pointer transition-all ${layout === 'side' ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-md' : 'hover:border-primary/50 bg-background'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <PanelLeft className={`w-6 h-6 ${layout === 'side' ? 'text-primary' : 'text-muted-foreground'}`} />
              {layout === 'side' && <div className="w-3 h-3 rounded-full bg-primary" />}
            </div>
            <div className="font-bold text-sm">Menu Lateral</div>
            <div className="text-xs text-muted-foreground mt-1">Navegação na lateral esquerda, estilo clássico de CRM.</div>
          </div>
        </div>
      </div>

    </div>
  );
};


// Gerenciador de conexão WhatsApp integrado para Evolution API
const WhatsAppStatusManager = () => {
  const { toast } = useToast();
  const [statusInfo, setStatusInfo] = useState<{
    status: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'ERROR' | 'LOADING';
    qrcode?: string | null;
    pairingCode?: string | null;
    message?: string;
  }>({ status: 'LOADING' });

  const fetchStatus = async () => {
    setStatusInfo(prev => ({ ...prev, status: 'LOADING' }));
    try {
      const res = await empresasApi.getWhatsappStatus();
      if (res.success && res.data) {
        setStatusInfo({
          status: res.data.status,
          qrcode: res.data.qrcode,
          pairingCode: res.data.pairingCode
        });
      } else {
        setStatusInfo({ status: 'ERROR', message: res.error?.message || 'Falha ao buscar status' });
      }
    } catch (e: any) {
      setStatusInfo({ status: 'ERROR', message: e.message });
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp da clínica? Seu celular precisará escanear o QR Code novamente para reativar.')) return;
    try {
      setStatusInfo(prev => ({ ...prev, status: 'LOADING' }));
      const res = await empresasApi.disconnectWhatsapp();
      if (res.success) {
        toast({ title: '🔌 WhatsApp Desconectado', description: 'Instância desconectada com sucesso.' });
        fetchStatus();
      } else {
        throw new Error(res.error?.message || 'Erro ao desconectar');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      fetchStatus();
    }
  };

  const handleRestart = async () => {
    try {
      setStatusInfo(prev => ({ ...prev, status: 'LOADING' }));
      const res = await empresasApi.restartWhatsapp();
      if (res.success) {
        toast({ title: '♻️ Instância Reiniciada', description: 'Aguarde alguns segundos e atualize o status.' });
        setTimeout(fetchStatus, 4000);
      } else {
        throw new Error(res.error?.message || 'Erro ao reiniciar');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      fetchStatus();
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (statusInfo.status === 'NOT_CONFIGURED') {
    return null;
  }

  return (
    <Card className="border border-emerald-500/20 bg-emerald-50/5 dark:bg-slate-900/40 backdrop-blur-md shadow-lg rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4">
      <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl text-white shadow-md shadow-emerald-500/20">
            <span className="material-symbols-outlined block text-xl">qr_code_scanner</span>
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">Status da Conexão WhatsApp</CardTitle>
            <CardDescription className="text-xs">Monitore a conexão e escaneie o QR Code diretamente do CRM</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {statusInfo.status === 'LOADING' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <span className="material-symbols-outlined animate-spin text-3xl text-emerald-500">progress_activity</span>
            <span className="text-xs text-muted-foreground">Comunicando com a sua VPS da Evolution API...</span>
          </div>
        )}

        {statusInfo.status === 'CONNECTED' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">WhatsApp Conectado e Ativo</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">Sua clínica está integrada. Leads e mensagens automáticas estão funcionando normalmente.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={fetchStatus} className="flex-1 min-w-[140px] border-emerald-500/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 font-semibold transition-all">
                <span className="material-symbols-outlined text-sm mr-2">refresh</span>
                Atualizar Status
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleRestart} className="flex-1 min-w-[140px] hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all">
                <span className="material-symbols-outlined text-sm mr-2">restart_alt</span>
                Reiniciar Conexão
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={handleDisconnect} className="flex-1 min-w-[140px] font-semibold transition-all">
                <span className="material-symbols-outlined text-sm mr-2">logout</span>
                Desconectar Número
              </Button>
            </div>
          </div>
        )}

        {statusInfo.status === 'DISCONNECTED' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl shadow-inner min-h-[220px]">
              {statusInfo.qrcode ? (
                <div className="space-y-2 flex flex-col items-center">
                  <img 
                    src={statusInfo.qrcode.startsWith('data:') ? statusInfo.qrcode : `data:image/png;base64,${statusInfo.qrcode}`} 
                    alt="WhatsApp QR Code" 
                    className="w-44 h-44 rounded-lg border border-slate-100 bg-white p-1 shadow-sm"
                  />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    QR Code pronto para escaneamento
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                  <span className="material-symbols-outlined text-3xl text-amber-500 font-light">qr_code_2</span>
                  <p className="text-xs text-muted-foreground max-w-[180px]">QR Code expirado ou não gerado. Clique no botão de atualizar abaixo.</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl space-y-1.5">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Aguardando Escaneamento
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Abra o WhatsApp no celular que deseja conectar, acesse <strong>Aparelhos Conectados &gt; Conectar um Aparelho</strong> e escaneie o QR Code ao lado.
                </p>
              </div>

              {statusInfo.pairingCode && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex items-center justify-between text-xs border border-slate-200/40 dark:border-slate-800">
                  <span className="text-muted-foreground">Código de pareamento alternativo:</span>
                  <strong className="font-mono text-sm font-extrabold tracking-wider bg-white dark:bg-slate-900 px-2.5 py-1 rounded border shadow-sm text-slate-800 dark:text-slate-100">{statusInfo.pairingCode}</strong>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button type="button" onClick={fetchStatus} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-md shadow-emerald-500/10">
                  <span className="material-symbols-outlined text-sm mr-2">sync</span>
                  Gerar / Atualizar QR Code
                </Button>
                <Button type="button" variant="outline" onClick={handleRestart} className="w-full font-semibold border-slate-200 hover:bg-slate-50 transition-all text-slate-600 dark:text-slate-300">
                  <span className="material-symbols-outlined text-sm mr-2">restart_alt</span>
                  Reiniciar Instância Evolution
                </Button>
              </div>
            </div>
          </div>
        )}

        {statusInfo.status === 'ERROR' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <span className="material-symbols-outlined text-rose-500 mt-0.5">error_outline</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-rose-800 dark:text-rose-400">Servidor Inacessível</p>
                <p className="text-xs text-rose-600 dark:text-rose-500 leading-relaxed">
                  {statusInfo.message || 'Falha ao se comunicar com a Evolution API. Certifique-se de que a instância e a URL estão corretas.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <Button type="button" onClick={fetchStatus} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold">
                <span className="material-symbols-outlined text-sm mr-2">cached</span>
                Tentar Conectar
              </Button>
              <Button type="button" variant="outline" onClick={handleRestart} className="flex-1 border-rose-200 hover:bg-slate-50 text-slate-600 dark:text-slate-300 font-semibold">
                <span className="material-symbols-outlined text-sm mr-2">restart_alt</span>
                Forçar Reinício (VPS)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const GoogleCalendarView = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const res = await googleCalendarApi.status();
      if (res.success) {
        setStatus(res.data);
      } else {
        throw new Error(res.error?.message || 'Nao foi possivel consultar o Google Calendar');
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    const calendarResult = params.get('googleCalendar');
    if (calendarResult === 'connected') {
      toast({ title: 'Google Calendar conectado', description: 'A agenda da clinica ja pode ser sincronizada.' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (calendarResult === 'error') {
      toast({ title: 'Erro no Google Calendar', description: 'Nao foi possivel concluir a conexao.', variant: 'destructive' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setIsWorking(true);
    try {
      const res = await googleCalendarApi.connect();
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      throw new Error(res.error?.message || 'Nao foi possivel iniciar a conexao');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setIsWorking(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Desconectar o Google Calendar desta clinica? Os agendamentos continuam no SalesClin.')) return;
    setIsWorking(true);
    try {
      const res = await googleCalendarApi.disconnect();
      if (!res.success) throw new Error(res.error?.message || 'Erro ao desconectar');
      toast({ title: 'Google Calendar desconectado', description: 'A agenda interna continua funcionando normalmente.' });
      await loadStatus();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsWorking(false);
    }
  };

  const handleResync = async () => {
    setIsWorking(true);
    try {
      const res = await googleCalendarApi.resync();
      if (!res.success) throw new Error(res.error?.message || 'Erro ao sincronizar');
      toast({
        title: 'Sincronizacao concluida',
        description: `${res.data.synced || 0} agendamentos sincronizados. ${res.data.failed || 0} pendentes.`,
      });
      await loadStatus();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsWorking(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;
  }

  const connected = !!status?.connected;
  const hasError = status?.status === 'error';

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className={`p-4 rounded-2xl text-sm border flex items-start gap-3 shadow-sm ${
        connected
          ? hasError
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <span className="material-symbols-outlined flex-shrink-0 mt-0.5">
          {connected ? (hasError ? 'sync_problem' : 'event_available') : 'calendar_month'}
        </span>
        <div className="leading-relaxed">
          <strong className="block mb-0.5 font-bold">
            {connected ? 'Google Calendar conectado' : 'Google Calendar desconectado'}
          </strong>
          {connected
            ? `Agenda conectada: ${status.googleEmail || status.calendarId || 'Google Calendar'}`
            : 'Conecte uma agenda Google da clinica para espelhar os agendamentos criados no SalesClin.'}
        </div>
      </div>

      {connected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ultima sincronizacao</p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('pt-BR') : 'Ainda nao sincronizou'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pendencias</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{status.pendingCount || 0} agendamentos</p>
          </div>
        </div>
      )}

      {hasError && status?.lastError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {status.lastError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {!connected ? (
          <Button onClick={handleConnect} disabled={isWorking} className="font-bold">
            <span className="material-symbols-outlined text-sm mr-2">add_link</span>
            Conectar Google Calendar
          </Button>
        ) : (
          <>
            <Button onClick={handleResync} disabled={isWorking} className="font-bold">
              <span className="material-symbols-outlined text-sm mr-2">sync</span>
              Sincronizar novamente
            </Button>
            <Button onClick={handleDisconnect} disabled={isWorking} variant="outline" className="font-bold">
              <span className="material-symbols-outlined text-sm mr-2">link_off</span>
              Desconectar
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const WhatsAppView = () => {
  const { toast } = useToast();
  const { professional } = useAuth();
  const [data, setData] = useState({
    whatsappProvider: 'evolution',
    evolutionApiUrl: '',
    apiKey: '',
    evolutionInstance: '',
    metaToken: '',
    metaPhoneNumberId: '',
    webhookToken: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      if (!professional?.companyId) return;
      const res = await empresasApi.getById(professional.companyId);
      if (res.success && res.data) {
        setData({
          whatsappProvider: res.data.whatsappProvider || 'evolution',
          evolutionApiUrl: res.data.evolutionApiUrl || '',
          apiKey: res.data.apiKey || '',
          evolutionInstance: res.data.evolutionInstance || '',
          metaToken: res.data.metaToken || '',
          metaPhoneNumberId: res.data.metaPhoneNumberId || '',
          webhookToken: res.data.webhookToken || ''
        });
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar as configurações', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!professional?.companyId) throw new Error("ID da empresa não encontrado");
      const res = await empresasApi.update(professional.companyId, {
        whatsappProvider: data.whatsappProvider,
        evolutionApiUrl: data.evolutionApiUrl,
        apiKey: data.apiKey,
        evolutionInstance: data.evolutionInstance,
        metaToken: data.metaToken,
        metaPhoneNumberId: data.metaPhoneNumberId
      });
      if (res.success) {
        toast({ title: 'Sucesso', description: 'Configurações de WhatsApp atualizadas!' });
      } else {
        throw new Error(res.error?.message || "Erro ao salvar");
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm border border-emerald-200/50 dark:border-emerald-800/50 flex items-start gap-3 shadow-sm">
        <span className="material-symbols-outlined flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">chat</span>
        <div className="leading-relaxed">
          <strong className="block mb-0.5 text-emerald-900 dark:text-emerald-100 font-bold">Integração WhatsApp</strong>
          Configure as credenciais para permitir disparos em massa automáticos e conversas com clientes. Suporta Evolution API ou API Oficial da Meta (Cloud API).
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label>Provedor de WhatsApp</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setData({...data, whatsappProvider: 'evolution'})}
              className={`p-4 border rounded-xl cursor-pointer transition-all ${data.whatsappProvider === 'evolution' ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 shadow-md' : 'hover:border-emerald-500/50 bg-background'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-sm text-emerald-700">Evolution API</div>
                {data.whatsappProvider === 'evolution' && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Usa uma instância Evolution já conectada para disparos e captura de mensagens.</div>
            </div>

            <div 
              onClick={() => setData({...data, whatsappProvider: 'meta'})}
              className={`p-4 border rounded-xl cursor-pointer transition-all ${data.whatsappProvider === 'meta' ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 shadow-md' : 'hover:border-emerald-500/50 bg-background'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-sm text-emerald-700">API Oficial Meta</div>
                {data.whatsappProvider === 'meta' && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
              </div>
              <div className="text-xs text-muted-foreground mt-1">WhatsApp Business Cloud API (Oficial). Requer número verificado no Facebook.</div>
            </div>
          </div>
        </div>

        <Separator />

        {data.whatsappProvider === 'evolution' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <Label>URL da Evolution API</Label>
              <Input 
                placeholder="Ex: https://api.sua-evolution.com" 
                value={data.evolutionApiUrl}
                onChange={e => setData({...data, evolutionApiUrl: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">URL base onde sua instância da Evolution API está hospedada (sem barra no final).</p>
            </div>

            <div className="space-y-1.5">
              <Label>Global API Key</Label>
              <Input 
                type="password"
                placeholder="Sua Global API Key" 
                value={data.apiKey}
                onChange={e => setData({...data, apiKey: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">Chave de autenticação global configurada na Evolution API.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Nome da Instância</Label>
              <Input 
                placeholder="Ex: clinica-whatsapp" 
                value={data.evolutionInstance}
                onChange={e => setData({...data, evolutionInstance: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">Nome exato da instância criada para conectar seu número de WhatsApp.</p>
            </div>
          </div>
        )}

        {data.whatsappProvider === 'meta' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <Label>Phone Number ID (ID do Número de Telefone)</Label>
              <Input 
                placeholder="Ex: 1048593849502" 
                value={data.metaPhoneNumberId}
                onChange={e => setData({...data, metaPhoneNumberId: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">Encontrado no painel de desenvolvedor da Meta (WhatsApp &gt; API Setup).</p>
            </div>

            <div className="space-y-1.5">
              <Label>Access Token (Token de Acesso Permanente)</Label>
              <Input 
                type="password"
                placeholder="Ex: EAAQZAM..." 
                value={data.metaToken}
                onChange={e => setData({...data, metaToken: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">Token gerado no painel da Meta com permissões de 'whatsapp_business_messaging'.</p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ═══ SEÇÃO: CAPTURA AUTOMÁTICA DE LEADS VIA WEBHOOK ═══ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-[#F97316]">webhook</span>
          <div>
            <h3 className="font-bold text-sm text-primary">Captura Automática de Leads</h3>
            <p className="text-xs text-muted-foreground">Quando alguém mandar mensagem no WhatsApp da clínica, o lead será criado automaticamente no funil.</p>
          </div>
        </div>

        {/* Status da configuração */}
        {(() => {
          const isEvolutionReady = data.whatsappProvider === 'evolution' && data.evolutionApiUrl && data.apiKey && data.evolutionInstance;
          const isMetaReady = data.whatsappProvider === 'meta' && data.metaToken && data.metaPhoneNumberId;
          const isReady = isEvolutionReady || isMetaReady;
          
          // Usar a URL de produção, não localhost
          const productionOrigin = import.meta.env.PROD 
            ? window.location.origin 
            : 'https://sales-clin.vercel.app';
          
          // URL com token exclusivo da clínica (seguro e sem conflito)
          const tokenSuffix = data.webhookToken ? `/${data.webhookToken}` : '';
          const webhookUrl = data.whatsappProvider === 'evolution' 
            ? `${productionOrigin}/api/webhooks/evolution${tokenSuffix}`
            : `${productionOrigin}/api/webhooks/meta${tokenSuffix}`;

          return (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${
                isReady 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {isReady ? 'check_circle' : 'warning'}
                </span>
                {isReady 
                  ? 'Credenciais configuradas — Webhook pronto para usar!'
                  : 'Preencha as credenciais acima para ativar a captura automática.'
                }
              </div>

              {isReady && (
                <>
                  {/* Aviso de segurança sobre o token */}
                  {data.webhookToken && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-xl border text-xs bg-blue-50 border-blue-200 text-blue-700">
                      <span className="material-symbols-outlined text-sm mt-0.5">lock</span>
                      <span>Esta URL é <strong>exclusiva da sua clínica</strong>. Ela contém um token de segurança único que identifica sua empresa. Não compartilhe com outras clínicas.</span>
                    </div>
                  )}

                  {/* Webhook URL com botão de copiar */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      URL Exclusiva do Webhook ({data.whatsappProvider === 'evolution' ? 'Evolution API' : 'Meta Official'})
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        readOnly
                        value={webhookUrl}
                        className="bg-white font-mono text-xs"
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        className="shrink-0 px-3"
                        onClick={() => {
                          navigator.clipboard.writeText(webhookUrl);
                          toast({ title: '📋 URL copiada!', description: 'Cole na configuração do seu provedor de WhatsApp.' });
                        }}
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </Button>
                    </div>
                  </div>

                  {/* Instruções de configuração */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                      {data.whatsappProvider === 'evolution' ? '📋 Como configurar na Evolution API' : '📋 Como configurar na Meta Business'}
                    </p>
                    {data.whatsappProvider === 'evolution' ? (
                      <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                        <li>Acesse o painel da sua <strong>Evolution API</strong></li>
                        <li>Vá em <strong>Settings → Webhook</strong> da instância <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">{data.evolutionInstance}</code></li>
                        <li>Cole a URL acima no campo <strong>Webhook URL</strong></li>
                        <li>Selecione o evento <strong>MESSAGES_UPSERT</strong></li>
                        <li>Salve. Pronto! Novos leads serão criados automaticamente.</li>
                      </ol>
                    ) : (
                      <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                        <li>Acesse o <strong>Meta Developer Console</strong> ({`developers.facebook.com`})</li>
                        <li>Vá em <strong>WhatsApp → Configuration → Webhook</strong></li>
                        <li>Cole a URL acima no campo <strong>Callback URL</strong></li>
                        <li>Use qualquer <strong>Verify Token</strong> (ex: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">salesclin-verify</code>)</li>
                        <li>Assine o evento <strong>messages</strong></li>
                        <li>Salve. Pronto! Novos leads serão criados automaticamente.</li>
                      </ol>
                    )}
                  </div>

                  {/* Botão de configuração automática (apenas para Evolution) */}
                  {data.whatsappProvider === 'evolution' && (
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full border-[#F97316]/30 text-[#F97316] hover:bg-[#F97316]/5 font-bold"
                      onClick={async () => {
                        const baseUrl = data.evolutionApiUrl.replace(/\/+$/, '');
                        const instance = data.evolutionInstance;
                        
                        // Tentar múltiplos endpoints (Evolution API v1 e v2 têm formatos diferentes)
                        const attempts = [
                          // Evolution v2 (mais recente)
                          {
                            url: `${baseUrl}/webhook/set/${instance}`,
                            body: { url: webhookUrl, enabled: true, webhookByEvents: true, events: ['MESSAGES_UPSERT'] }
                          },
                          // Evolution v2 alternativo
                          {
                            url: `${baseUrl}/webhook/manage/${instance}`,
                            body: { url: webhookUrl, enabled: true, webhookByEvents: true, events: ['MESSAGES_UPSERT'] }
                          },
                          // Evolution v1
                          {
                            url: `${baseUrl}/webhook/instance/${instance}`,
                            body: { url: webhookUrl, enabled: true, webhook_by_events: true, events: ['MESSAGES_UPSERT'] }
                          }
                        ];
                        
                        let success = false;
                        let lastError = '';
                        
                        for (const attempt of attempts) {
                          try {
                            const response = await fetch(attempt.url, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'apikey': data.apiKey
                              },
                              body: JSON.stringify(attempt.body)
                            });
                            
                            if (response.ok) {
                              success = true;
                              toast({ title: '✅ Webhook configurado!', description: `Endpoint: ${attempt.url}. A Evolution API já está enviando mensagens para o SalesClin.` });
                              break;
                            } else {
                              const errBody = await response.text().catch(() => '');
                              lastError = `${attempt.url} → HTTP ${response.status}: ${errBody.substring(0, 200)}`;
                            }
                          } catch (e: any) {
                            lastError = `${attempt.url} → ${e.message}`;
                          }
                        }
                        
                        if (!success) {
                          toast({ 
                            title: '⚠️ Configuração automática falhou', 
                            description: `Configure manualmente no painel da Evolution. Último erro: ${lastError}`, 
                            variant: 'destructive' 
                          });
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-sm mr-2">settings_suggest</span>
                      Configurar Webhook Automaticamente
                    </Button>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};

// Map of components per setting
type SettingsItem = {
  key: string;
  name: string;
  description: string;
};

const ViewsMap: Record<string, React.FC<any>> = {
  services: ServicosView,
  team: EquipeView,
  roles: CargosView,
  clinics: ClinicasView,
  business: InfoNegocioView,
  appearance: AparenciaView,
  googleCalendar: GoogleCalendarView,
  whatsapp: WhatsAppView,
};

const Settings = () => {
  const { toast } = useToast();
  const [selectedSetting, setSelectedSetting] = useState<SettingsItem | null>(null);

  const { professional: authUser } = useAuth();
  const isOwner = authUser?.role === 'profissional' || authUser?.role === 'admin';

  // Tour de primeira visita
  const { tourActive, tourStep, tourSteps, tourHandleNext, tourHandlePrev, tourHandleClose } =
    useSectionTour('settings', [
      { id: null, title: '⚙️ Configurações', description: 'Aqui você personaliza tudo do seu CRM: serviços, equipe, layout e informações da clínica.', position: 'center' },
      { id: '#settings-grid', title: '📋 Opções', description: 'Clique em qualquer item para configurar. Cada seção abre um painel lateral com as opções detalhadas.', position: 'bottom' },
    ]);

  const settingsSections = [
    {
      title: 'Configurações Gerais',
      icon: SettingsIcon,
      items: [
        { key: 'appearance', name: 'Aparência', description: 'Ajuste o menu lateral ou superior' },
        { key: 'services', name: 'Serviços', description: 'Gerencie os serviços oferecidos' },
        ...(isOwner ? [
          { key: 'team', name: 'Equipe', description: 'Gerencie membros da equipe e permissões' },
          { key: 'roles', name: 'Cargos', description: 'Gerencie os cargos e funções da equipe' },
        ] : []),
      ]
    },
    {
      title: 'Minhas Filiais',
      icon: Building,
      items: [
        ...(isOwner ? [
          { key: 'clinics', name: 'Minhas Clínicas', description: 'Crie e gerencie sua rede de clínicas' },
          { key: 'googleCalendar', name: 'Google Calendar', description: 'Sincronize a agenda da clínica' },
          { key: 'whatsapp', name: 'Integração WhatsApp', description: 'Configure API para disparos em massa' },
        ] : []),
      ]
    },
  ];

  // Define Active View safely
  const ActiveView = selectedSetting ? (ViewsMap[selectedSetting.key] || null) : null;

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8 relative">
      <TourPopover active={tourActive} step={tourStep} steps={tourSteps} onNext={tourHandleNext} onPrev={tourHandlePrev} onClose={tourHandleClose} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Painel de Configurações</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ajuste permissões, negócios, agendamentos e API.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Separator className="my-6" />

      {/* Settings Grid */}
      <div id="settings-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {settingsSections.map((section) => (
          <Card key={section.title} className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-3 border-b bg-muted/50">
              <CardTitle className="flex items-center gap-2 text-base sm:text-md">
                <section.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {section.items.map((item) => (
                  <div 
                    key={item.key}
                    onClick={() => setSelectedSetting(item)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-primary/5 cursor-pointer transition-all gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-semibold text-sm group-hover:text-primary transition-colors">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hidden sm:inline-flex shrink-0 text-xs shadow-none hover:bg-primary hover:text-white transition-all w-24"
                    >
                      Configurar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


      {/* THE DRAWING SHEET CONFIG MENU (The Magic Drawer) */}
      <Sheet open={!!selectedSetting} onOpenChange={(open) => !open && setSelectedSetting(null)}>
        <SheetContent className="w-[90vw] sm:max-w-xl md:max-w-2xl p-0 flex flex-col border-l shadow-2xl max-h-screen">
          {selectedSetting && (
            <>
              {/* Sheet Header Custom */}
              <div className="px-6 py-6 border-b bg-muted/80 z-10 backdrop-blur pb-6 shrink-0">
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                    {selectedSetting.name}
                  </SheetTitle>
                  <SheetDescription className="text-sm">
                    {selectedSetting.description}
                  </SheetDescription>
                </SheetHeader>
              </div>
              
              {/* Variable Content injected via Map */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {ActiveView && <ActiveView name={selectedSetting.name} />}
              </div>

              {/* Footer */}
              <div className="p-4 bg-muted border-t mt-auto text-xs text-center text-muted-foreground shrink-0">
                Módulo Auraia CRM v1.0.5 - Configurações protegidas.
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default Settings;
