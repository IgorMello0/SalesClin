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


import { 
  Settings as SettingsIcon, 
  Building, 
  Plus,
  Trash2,
  Clock,
  Lock,
  Users,
  Tag,
  Monitor,
  LayoutTemplate,
  PanelLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { catalogsApi, professionalsApi, usuariosApi, permissionsApi, empresasApi, rolesApi } from '@/lib/api';
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
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', roleId: '' });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  const loadRoles = async () => {
    try {
      const res = await rolesApi.getAll();
      if (res.success) setRoles(res.data || []);
    } catch (e) {
      console.error('Erro ao carregar cargos:', e);
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

  useEffect(() => {
    loadTeam();
    loadRoles();
  }, []);

  const handleAddMember = async () => {
    if (!newMember.name || !newMember.email || !newMember.password) {
      toast({ title: 'Atenção', description: 'Preencha nome, email e senha.', variant: 'destructive' });
      return;
    }
    
    try {
      const res = await usuariosApi.create({
        name: newMember.name,
        email: newMember.email,
        password: newMember.password,
        roleId: newMember.roleId ? Number(newMember.roleId) : null,
        isActive: true,
      });
      if (res.success) {
        toast({ title: 'Sucesso', description: `${newMember.name} adicionado(a) à equipe!` });
        setIsAdding(false);
        setNewMember({ name: '', email: '', password: '', roleId: '' });
        loadTeam();
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

  const handleSelectUser = (user: any) => {
    if (selectedUserId === user.id) {
      setSelectedUserId(null);
      setEditingMember(null);
      return;
    }
    setSelectedUserId(user.id);
    setEditingMember({ ...user, roleId: user.roleId?.toString() || '' });
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
        <h3 className="font-medium text-sm">Funcionários ({team.length})</h3>
        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          <Plus className="w-4 h-4 mr-2" /> {isAdding ? 'Cancelar' : 'Novo Funcionário'}
        </Button>
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
              <Label>Senha</Label>
              <Input type="password" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Cargo / Função</Label>
              <Select value={newMember.roleId} onValueChange={v => setNewMember({...newMember, roleId: v})}>
                <SelectTrigger className="h-9 text-sm bg-background">
                  <SelectValue placeholder="Selecione um cargo..." />
                </SelectTrigger>
                <SelectContent position="item-aligned" className="z-[200]">
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleAddMember}>Adicionar à Equipe</Button>
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
                          <SelectValue placeholder="Selecione um cargo..." />
                        </SelectTrigger>
                        <SelectContent className="z-[250]">
                          {roles.map(r => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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

// Map of components per setting
const ViewsMap: Record<string, React.FC<any>> = {
  'Serviços': ServicosView,
  'Equipe': EquipeView,
  'Cargos': CargosView,
  'Meu Negócio': InfoNegocioView,
  'Aparência': AparenciaView,
};

const Settings = () => {
  const { toast } = useToast();
  const [selectedSetting, setSelectedSetting] = useState<{name: string, description: string} | null>(null);

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
        { name: 'Aparência', description: 'Ajuste o menu lateral ou superior' },
        { name: 'Serviços', description: 'Gerencie os serviços oferecidos' },
        ...(isOwner ? [
          { name: 'Equipe', description: 'Gerencie membros da equipe e permissões' },
          { name: 'Cargos', description: 'Gerencie os cargos e funções da equipe' },
        ] : []),
      ]
    },
    {
      title: 'Meu negócio',
      icon: Building,
      items: [
        { name: 'Meu Negócio', description: 'Informações e configurações da empresa' },
      ]
    },
  ];

  // Define Active View safely
  const ActiveView = selectedSetting ? (ViewsMap[selectedSetting.name] || null) : null;

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
                    key={item.name}
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