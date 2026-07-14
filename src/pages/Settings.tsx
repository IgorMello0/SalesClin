import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { 
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Settings as SettingsIcon,
  Building,
  Clock,
  CreditCard,
  Lock,
  Monitor,
  Plus,
  Tag,
  Trash2,
  Users,
  Mail,
  Loader2,
  Zap,
  ArrowRight,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import InfoNegocioView from './settings/InfoNegocioView';
import FunnelsSettingsView from './settings/FunnelsSettingsView';
import LeadStatusesSettingsView from './settings/LeadStatusesSettingsView';

import { useAuth } from '@/contexts/AuthContext';
import { catalogsApi, professionalsApi, usuariosApi, permissionsApi, empresasApi, rolesApi, modulesApi, billingApi, googleCalendarApi, whatsappMetaApi, type BillingStatus, type BillingUsage } from '@/lib/api';
import { useSectionTour } from '@/hooks/useSectionTour';
import { TourPopover } from '@/components/onboarding/TourPopover';
import Profile from './Profile';

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

const EquipeView = ({ isSpecialistMode = false }: { isSpecialistMode?: boolean }) => {
  const { toast } = useToast();
  const { professional } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', roleId: '', companyIds: [] as number[] });
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [buyingUserExtra, setBuyingUserExtra] = useState(false);
  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);

  const validRoles = roles.filter((role) => role?.id !== undefined && role?.id !== null && (isSpecialistMode ? role.isSpecialist : !role.isSpecialist));
  
  const filteredTeam = team.filter((user) => {
    const isSpec = user.role?.isSpecialist || false;
    return isSpecialistMode ? isSpec : !isSpec;
  });
  const getUserDisplayName = (user: any) => String(user?.name || user?.email || 'Usuario');
  const getUserEmail = (user: any) => String(user?.email || 'E-mail nao informado');
  const getUserInitials = (user: any) => {
    const displayName = getUserDisplayName(user);
    return displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  };
  const getRoleIdValue = (roleId: unknown) => (roleId === undefined || roleId === null ? '' : String(roleId));

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
      if (res.success) {
        const merged = new Map<number, any>();
        for (const clinic of professional?.companies || []) {
          if (clinic?.id) merged.set(Number(clinic.id), clinic);
        }
        for (const clinic of res.data || []) {
          if (clinic?.id) merged.set(Number(clinic.id), clinic);
        }
        setClinicas(Array.from(merged.values()));
      }
    } catch (e) {
      console.error('Erro ao carregar clínicas', e);
      setClinicas(professional?.companies || []);
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
    
    setIsSavingMember(true);
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
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleResendInvite = async (user: any) => {
    setResendingInviteId(user.id);
    try {
      const res = await usuariosApi.resendInvite(user.id);
      if (res.success) {
        toast({ title: 'Convite reenviado', description: `${user.name} recebera um novo link para definir a senha.` });
      } else {
        throw new Error(res.error?.message || 'Nao foi possivel reenviar o convite');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setResendingInviteId(null);
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
        const officialModuleCodes = ['dashboard', 'agendamentos', 'clientes', 'funnel', 'metas', 'tarefas', 'campanhas'];
        const filtered = res.data.filter((p: any) => officialModuleCodes.includes(p.moduleCode));
        setUserPermissions(filtered);
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
    const userCompanyIds = Array.from(new Set([
      ...(Array.isArray(user.companyAccess)
        ? user.companyAccess.map((ca: any) => Number(ca?.companyId)).filter(Boolean)
        : []),
      ...(user.companyId ? [Number(user.companyId)] : []),
    ]));

    setEditingMember({ 
      ...user, 
      roleId: getRoleIdValue(user.roleId),
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
          <h3 className="font-medium text-sm">{isSpecialistMode ? 'Especialistas' : 'Membros da Equipe'} ({filteredTeam.length})</h3>
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
            <Plus className="w-4 h-4 mr-2" /> {isAdding ? 'Cancelar' : (isSpecialistMode ? 'Novo Especialista' : 'Novo Membro')}
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
                    {validRoles.find(r => String(r.id) === newMember.roleId)?.name || 'Selecione um cargo...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent position="item-aligned" className="z-[200]">
                  {validRoles.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
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
            <Button onClick={handleAddMember} disabled={isSavingMember}>
              {isSavingMember ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar convite
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-center py-4 text-muted-foreground">Carregando {isSpecialistMode ? 'especialistas' : 'equipe'}...</div>
        ) : filteredTeam.length === 0 ? (
          <div className="text-sm text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            Nenhum {isSpecialistMode ? 'especialista' : 'membro'} cadastrado.
          </div>
        ) : filteredTeam.map((u) => (
          <div key={u.id}>
            <div 
              className={`flex justify-between items-center p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer ${selectedUserId === u.id ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleSelectUser(u)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs uppercase">
                  {getUserInitials(u)}
                </div>
                <div>
                  <div className="font-medium text-sm">{getUserDisplayName(u)}</div>
                  <div className="text-xs text-muted-foreground">{getUserEmail(u)}</div>
                  {(!u.isActive || !u.emailVerified) && (
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                      Convite pendente
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleBadge(u.role?.name)}
                {(!u.isActive || !u.emailVerified) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleResendInvite(u); }}
                    disabled={resendingInviteId === u.id}
                    className="h-7 px-2 text-xs"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    {resendingInviteId === u.id ? 'Enviando...' : 'Reenviar'}
                  </Button>
                )}
                <Button 
                  variant="ghost" size="sm" 
                  onClick={(e) => { e.stopPropagation(); handleDeleteMember(u.id); }} 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {selectedUserId === u.id && editingMember && (
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
                            {validRoles.find(r => String(r.id) === editingMember?.roleId)?.name || 'Selecione um cargo...'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[250]">
                          {validRoles.map(r => (
                            <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
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
                          type="password"
                          value={resetPassword}
                          onChange={e => setResetPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="h-9 text-sm"
                        />
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

const SUB_PERMISSIONS_CONFIG: Record<string, Array<{ key: string; label: string }>> = {
  dashboard: [
    { key: 'verFaturamento', label: 'Ver Faturamento e Receita' },
    { key: 'verDesempenhoEquipe', label: 'Ver Desempenho da Equipe' },
    { key: 'verMetricasLeads', label: 'Ver Métricas Quantitativas de Leads' },
  ],
  agendamentos: [
    { key: 'verAgendamentosAlheios', label: 'Ver Agenda de Outros Profissionais' },
    { key: 'criarAgendamentos', label: 'Criar Agendamentos' },
    { key: 'editarAgendamentos', label: 'Editar/Reagendar Agendamentos' },
    { key: 'cancelarAgendamentos', label: 'Cancelar Agendamentos' },
  ],
  clientes: [
    { key: 'verClientes', label: 'Acesso à aba de Clientes Ativos' },
    { key: 'verLeads', label: 'Acesso à aba de Leads' },
    { key: 'exportarContatos', label: 'Permitir Exportar Contatos' },
    { key: 'editarContatos', label: 'Criar e Editar Fichas' },
    { key: 'excluirContatos', label: 'Permitir Excluir Contatos' },
  ],
  funnel: [
    { key: 'moverFases', label: 'Permitir Mover Oportunidades de Fase' },
    { key: 'criarPropostas', label: 'Criar Novas Propostas' },
    { key: 'aprovarPropostas', label: 'Fechar/Aprovar Propostas' },
    { key: 'excluirOportunidades', label: 'Excluir Oportunidades do Funil' },
  ],
  tarefas: [
    { key: 'atribuirParaOutros', label: 'Delegar Tarefas para Outros Membros' },
    { key: 'verTarefasAlheias', label: 'Ver Tarefas de Outros Profissionais' },
    { key: 'excluirTarefas', label: 'Excluir Tarefas' },
  ],
  metas: [
    { key: 'gerenciarMetas', label: 'Gerenciar Metas da Clínica (Criar/Editar/Excluir)' },
    { key: 'verMetasEquipe', label: 'Ver Metas de Outros Colaboradores' },
  ],
  campanhas: [
    { key: 'criarCampanhas', label: 'Criar/Disparar Campanhas' },
    { key: 'conectarWhatsApp', label: 'Conectar/Gerenciar Instância do WhatsApp' },
    { key: 'excluirCampanhas', label: 'Excluir Campanhas do Histórico' },
  ],
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
  const [isSpecialistRole, setIsSpecialistRole] = useState(false);

  const loadModules = async () => {
    try {
      const res = await modulesApi.getAll();
      if (res.success) {
        const officialModuleCodes = ['dashboard', 'agendamentos', 'clientes', 'funnel', 'metas', 'tarefas', 'campanhas'];
        const filtered = (res.data || []).filter((m: any) => officialModuleCodes.includes(m.code));
        setModules(filtered);
      } else {
        toast({ title: 'Erro', description: res.error?.message || 'Erro ao carregar módulos', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Erro ao carregar módulos', variant: 'destructive' });
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
        permissions: modules.map(m => ({ moduleId: m.id, hasAccess: true })),
        isSpecialist: isSpecialistRole
      });
      if (res.success) {
        toast({ title: 'Cargo criado!', description: `"${trimmed}" agora está salvo no banco de dados.` });
        setNewRoleName('');
        setIsSpecialistRole(false);
        setIsAdding(false);
        
        // Selecionar e expandir automaticamente as permissões do novo cargo
        if (res.data) {
          const newRole = res.data;
          setSelectedRoleId(newRole.id);
          const currentPermissions = modules.map(m => ({
            moduleId: m.id,
            moduleName: m.name,
            moduleCode: m.code,
            hasAccess: true,
            subPermissions: {}
          }));
          setRolePermissions(currentPermissions);
        }
        
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
        moduleCode: m.code,
        hasAccess: existing ? existing.hasAccess : true,
        subPermissions: existing ? (existing.subPermissions || {}) : {}
      };
    });
    setRolePermissions(currentPermissions);
  };

  const handleTogglePermission = (moduleId: number) => {
    setRolePermissions(prev => prev.map(p => 
      p.moduleId === moduleId ? { ...p, hasAccess: !p.hasAccess } : p
    ));
  };

  const handleToggleSubPermission = (moduleId: number, key: string) => {
    setRolePermissions(prev => prev.map(p => {
      if (p.moduleId === moduleId) {
        const subPerms = { ...(p.subPermissions || {}) };
        const currentVal = subPerms[key] !== undefined ? subPerms[key] : true;
        subPerms[key] = !currentVal;
        return { ...p, subPermissions: subPerms };
      }
      return p;
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setSavingPermissions(true);
    try {
      const role = roles.find(r => r.id === selectedRoleId);
      const res = await rolesApi.update(selectedRoleId, {
        name: role.name,
        permissions: rolePermissions.map(p => ({ 
          moduleId: p.moduleId, 
          hasAccess: p.hasAccess,
          subPermissions: p.subPermissions || {}
        }))
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
          <div className="flex flex-col gap-3">
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
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="isSpecialist" 
                checked={isSpecialistRole}
                onCheckedChange={(checked) => setIsSpecialistRole(checked as boolean)}
              />
              <label 
                htmlFor="isSpecialist" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Este cargo representa um Especialista (ex: Médico, Dentista)?
              </label>
            </div>
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
                <span className="text-[10px] text-muted-foreground/70 hidden sm:inline-block font-normal ml-2">
                  (clique para ver/configurar permissões)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                {selectedRoleId === role.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
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

                <div className="grid grid-cols-1 gap-3">
                  {rolePermissions.map(p => {
                    const subPermsList = SUB_PERMISSIONS_CONFIG[p.moduleCode] || [];
                    return (
                      <div 
                        key={p.moduleId} 
                        className={`p-4 border rounded-2xl transition-all duration-300 ${
                          p.hasAccess 
                            ? 'bg-green-50/20 dark:bg-green-950/5 border-green-100 dark:border-green-900/60 shadow-sm' 
                            : 'bg-muted/30 border-slate-100 dark:border-slate-800/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{p.moduleName}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{p.moduleCode}</span>
                          </div>
                          <Switch 
                            checked={p.hasAccess} 
                            onCheckedChange={() => handleTogglePermission(p.moduleId)}
                          />
                        </div>

                        {p.hasAccess && subPermsList.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-dashed border-green-100/50 dark:border-green-900/40 space-y-2.5 pl-2 animate-in fade-in slide-in-from-top-1">
                            <h5 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Permissões Granulares</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {subPermsList.map(sub => {
                                const isChecked = p.subPermissions?.[sub.key] !== undefined 
                                  ? p.subPermissions[sub.key] 
                                  : true;
                                return (
                                  <div key={sub.key} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-xs hover:border-green-200/50 transition-colors">
                                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium pr-2">{sub.label}</span>
                                    <Switch 
                                      checked={isChecked}
                                      onCheckedChange={() => handleToggleSubPermission(p.moduleId, sub.key)}
                                      className="scale-90"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
  const [isSavingClinica, setIsSavingClinica] = useState(false);
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [buyingClinicExtra, setBuyingClinicExtra] = useState(false);
  const [openingPlanCheckout, setOpeningPlanCheckout] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: '', domain: '', whatsapp: '', openHour: '08:00', closeHour: '20:00' });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadClinicas = async () => {
    try {
      setLoading(true);
      const res = await empresasApi.myCompanies();
      if (res.success) {
        const merged = new Map<number, any>();
        for (const clinic of professional?.companies || []) {
          if (clinic?.id) merged.set(Number(clinic.id), clinic);
        }
        for (const clinic of res.data || []) {
          if (clinic?.id) merged.set(Number(clinic.id), clinic);
        }
        setClinicas(Array.from(merged.values()));
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao carregar clínicas', variant: 'destructive' });
      setClinicas(professional?.companies || []);
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

  const loadBillingStatus = async () => {
    try {
      const res = await billingApi.getStatus();
      if (res.success && res.data) setBillingStatus(res.data);
    } catch (e) {
      console.error('Erro ao carregar assinatura:', e);
    }
  };

  useEffect(() => {
    loadClinicas();
    loadBillingUsage();
    loadBillingStatus();
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

  const handleOpenPlanCheckout = async () => {
    if (!billingStatus) return;

    setOpeningPlanCheckout(true);
    try {
      const res = await billingApi.createCheckout(billingStatus.planCode, billingStatus.billingCycle);
      if (res.success && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }
      throw new Error(res.error?.message || 'Nao foi possivel abrir o checkout do plano.');
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setOpeningPlanCheckout(false);
    }
  };

  const handleChangePlan = async (planCode: 'start' | 'pro', billingCycle: 'monthly' | 'yearly') => {
    setChangingPlan(true);
    try {
      const res = await billingApi.changePlan(planCode, billingCycle);
      if (!res.success) {
        throw new Error(res.error?.message || 'Nao foi possivel alterar o plano.');
      }
      toast({
        title: 'Alteracao agendada',
        description: 'A AbacatePay vai aplicar a troca no proximo ciclo de cobranca.',
      });
      loadBillingStatus();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelingSubscription(true);
    try {
      const res = await billingApi.cancelSubscription();
      if (!res.success) {
        throw new Error(res.error?.message || 'Nao foi possivel cancelar a assinatura.');
      }
      toast({
        title: 'Assinatura cancelada',
        description: 'O cancelamento foi aplicado agora e novas cobrancas nao serao geradas.',
      });
      loadBillingStatus();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setCancelingSubscription(false);
    }
  };

  const handleCreate = async () => {
    if (!newClinica.name) {
      toast({ title: 'Atenção', description: 'Nome da clínica é obrigatório', variant: 'destructive' });
      return;
    }
    setIsSavingClinica(true);
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
    } finally {
      setIsSavingClinica(false);
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

  const planLabel = billingStatus?.planCode === 'pro'
    ? 'Pro'
    : billingStatus?.planCode === 'enterprise'
      ? 'Enterprise'
      : 'Start';
  const cycleLabel = billingStatus?.billingCycle === 'yearly' ? 'anual' : 'mensal';
  const subscriptionStatusLabel: Record<string, string> = {
    trialing: 'Teste gratis',
    active: 'Plano ativo',
    expired: 'Teste encerrado',
    payment_pending: 'Pagamento pendente',
    canceled: 'Cancelado',
  };
  const isSubscriptionBlocked = billingStatus ? ['expired', 'payment_pending', 'canceled'].includes(billingStatus.status) : false;
  const trialEndsAtLabel = billingStatus?.trialEndsAt
    ? new Date(billingStatus.trialEndsAt).toLocaleDateString('pt-BR')
    : null;
  const targetPlanCode = billingStatus?.planCode === 'pro' ? 'start' : 'pro';
  const targetPlanLabel = targetPlanCode === 'pro' ? 'Pro' : 'Start';
  const targetBillingCycle = billingStatus?.billingCycle === 'yearly' ? 'monthly' : 'yearly';
  const targetBillingCycleLabel = targetBillingCycle === 'yearly' ? 'anual' : 'mensal';
  const pendingPlanLabel = billingStatus?.pendingPlanCode === 'pro'
    ? 'Pro'
    : billingStatus?.pendingPlanCode === 'start'
      ? 'Start'
      : null;
  const pendingCycleLabel = billingStatus?.pendingBillingCycle === 'yearly' ? 'anual' : 'mensal';

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

      {billingStatus && (
        <Card className={isSubscriptionBlocked ? 'border-orange-300 bg-orange-50/70' : 'border-primary/15 bg-primary/5'}>
          <CardContent className="pt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2 ${isSubscriptionBlocked ? 'bg-orange-100 text-orange-700' : 'bg-primary/10 text-primary'}`}>
                  {isSubscriptionBlocked ? <AlertCircle className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-foreground">Plano {planLabel}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isSubscriptionBlocked ? 'bg-orange-200 text-orange-900' : 'bg-primary text-primary-foreground'}`}>
                      {subscriptionStatusLabel[billingStatus.status] || billingStatus.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ciclo {cycleLabel}
                    {billingStatus.status === 'trialing' && ` - teste termina em ${trialEndsAtLabel || 'breve'}`}
                  </p>
                  {billingStatus.status === 'trialing' ? (
                    <p className="text-sm font-medium text-orange-800">
                      Faltam {Math.max(0, billingStatus.daysRemaining)} dia{billingStatus.daysRemaining === 1 ? '' : 's'}. Depois do teste, o login continua, mas os módulos operacionais ficam bloqueados até ativar o plano.
                    </p>
                  ) : billingStatus.planChangeStatus === 'PENDING' && pendingPlanLabel ? (
                    <p className="text-sm font-medium text-blue-700">
                      Alteracao agendada para Plano {pendingPlanLabel} {pendingCycleLabel}. A troca entra no proximo ciclo de cobranca.
                    </p>
                  ) : isSubscriptionBlocked ? (
                    <p className="text-sm font-medium text-orange-900">
                      Esta clínica está sem assinatura ativa. Ative o plano para liberar os módulos operacionais novamente.
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-emerald-700">
                      Assinatura ativa. Os módulos do plano continuam liberados conforme as permissões internas da equipe.
                    </p>
                  )}
                </div>
              </div>

              {billingStatus.status !== 'active' ? (
                <Button onClick={handleOpenPlanCheckout} disabled={openingPlanCheckout} className="w-full lg:w-auto">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {openingPlanCheckout ? 'Abrindo...' : 'Ativar plano'}
                </Button>
              ) : (
                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  {billingStatus.planCode !== 'enterprise' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleChangePlan(targetPlanCode, billingStatus.billingCycle)}
                        disabled={changingPlan || cancelingSubscription}
                      >
                        {changingPlan ? 'Agendando...' : `Trocar para ${targetPlanLabel}`}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleChangePlan(billingStatus.planCode as 'start' | 'pro', targetBillingCycle)}
                        disabled={changingPlan || cancelingSubscription}
                      >
                        {changingPlan ? 'Agendando...' : `Trocar para ${targetBillingCycleLabel}`}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="destructive"
                    onClick={handleCancelSubscription}
                    disabled={changingPlan || cancelingSubscription || !billingStatus.abacateSubscriptionId}
                  >
                    {cancelingSubscription ? 'Cancelando...' : 'Cancelar assinatura'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                <Input value={newClinica.domain} onChange={e => setNewClinica({...newClinica, domain: e.target.value})} placeholder="Ex: centro.sellclin.com" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp (Opcional)</Label>
                <Input value={newClinica.whatsapp} onChange={e => setNewClinica({...newClinica, whatsapp: e.target.value})} placeholder="Ex: 11999999999" />
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full sm:w-auto" disabled={isSavingClinica}>
              {isSavingClinica ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Filial"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-4 text-muted-foreground">Carregando clínicas...</div>
      ) : clinicas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma clínica encontrada para este acesso. Saia e entre novamente para renovar o token ou verifique se a clínica está vinculada ao proprietário.
        </div>
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
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="p-4 bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-2xl text-sm border border-orange-200/50 dark:border-orange-800/50 flex items-start gap-3 shadow-sm">
        <Monitor className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
        <div className="leading-relaxed">
          <strong className="block mb-0.5 text-orange-900 dark:text-orange-100 font-bold">Interface do CRM</strong>
          O SellClin agora usa menu lateral como navegacao padrao para manter o sistema mais consistente.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
            <span className="material-symbols-outlined text-[20px]">dock_to_left</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Menu lateral ativo</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              A opcao de alternar para menu superior foi removida por enquanto. O menu lateral continua podendo ser recolhido para ganhar espaco.
            </p>
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
    qrcodeStatus?: 'ready' | 'empty' | 'error';
    qrcodeEndpoint?: string | null;
    qrcodeError?: string | null;
    instance?: string | null;
    evolutionMode?: 'managed' | 'custom';
    webhookUrl?: string | null;
    webhookStatus?: 'configured' | 'error' | 'pending' | 'not_configured';
    webhookEndpoint?: string | null;
    webhookError?: string | null;
    message?: string;
  }>({ status: 'LOADING' });
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [testingEvolution, setTestingEvolution] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [evolutionConfig, setEvolutionConfig] = useState({
    companyId: 0,
    evolutionMode: 'custom' as 'managed' | 'custom',
    evolutionApiUrl: '',
    apiKey: '',
    evolutionInstance: '',
    webhookToken: '',
  });

  const applyStatusData = (data: any) => {
    setStatusInfo({
      status: data.status,
      qrcode: data.qrcode,
      pairingCode: data.pairingCode,
      qrcodeStatus: data.qrcodeStatus,
      qrcodeEndpoint: data.qrcodeEndpoint,
      qrcodeError: data.qrcodeError,
      instance: data.instance,
      evolutionMode: data.evolutionMode,
      webhookUrl: data.webhookUrl,
      webhookStatus: data.webhookStatus,
      webhookEndpoint: data.webhookEndpoint,
      webhookError: data.webhookError,
      message: data.message
    });
  };

  const loadEvolutionConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await empresasApi.getMyCompany();
      if (res.success && res.data) {
        const hasSavedEvolutionConfig = Boolean(res.data.evolutionApiUrl && res.data.apiKey && res.data.evolutionInstance);
        setEvolutionConfig({
          companyId: res.data.id,
          evolutionMode: 'custom',
          evolutionApiUrl: res.data.evolutionApiUrl || '',
          apiKey: res.data.apiKey || '',
          evolutionInstance: res.data.evolutionInstance || '',
          webhookToken: res.data.webhookToken || '',
        });
        if (hasSavedEvolutionConfig) {
          const statusRes = await empresasApi.getWhatsappStatus();
          if (statusRes.success && statusRes.data) {
            applyStatusData(statusRes.data);
          }
        } else {
          setStatusInfo({ status: 'NOT_CONFIGURED', message: 'Informe URL da Evolution, API key e nome da instancia.' });
        }
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Nao foi possivel carregar configuracao Evolution', variant: 'destructive' });
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchStatus = async () => {
    if (!evolutionConfig.evolutionApiUrl || !evolutionConfig.apiKey || !evolutionConfig.evolutionInstance) {
      setStatusInfo({ status: 'NOT_CONFIGURED', message: 'Informe URL da Evolution, API key e nome da instancia.' });
      return;
    }

    setStatusInfo(prev => ({ ...prev, status: 'LOADING' }));
    try {
      const res = await empresasApi.getWhatsappStatus();
      if (res.success && res.data) {
        applyStatusData(res.data);
      } else {
        setStatusInfo({ status: 'ERROR', message: res.error?.message || 'Falha ao buscar status' });
      }
    } catch (e: any) {
      setStatusInfo({ status: 'ERROR', message: e.message });
    }
  };

  const saveEvolutionConfig = async () => {
    if (!evolutionConfig.companyId) return;
    if (!evolutionConfig.evolutionApiUrl || !evolutionConfig.apiKey || !evolutionConfig.evolutionInstance) {
      toast({ title: 'Campos obrigatorios', description: 'Informe URL, API key e nome da instancia da Evolution.', variant: 'destructive' });
      return;
    }

    setSavingConfig(true);
    try {
      const payload: any = {
        whatsappProvider: 'evolution',
        evolutionMode: 'custom',
        evolutionApiUrl: evolutionConfig.evolutionApiUrl.trim(),
        apiKey: evolutionConfig.apiKey.trim(),
        evolutionInstance: evolutionConfig.evolutionInstance.trim(),
      };

      const res = await empresasApi.update(evolutionConfig.companyId, payload);
      if (!res.success) throw new Error(res.error?.message || 'Nao foi possivel salvar Evolution API');

      setEvolutionConfig(prev => ({ ...prev, ...payload }));
      toast({
        title: 'Evolution API salva',
        description: 'O SellClin vai usar a URL, API key e instancia informadas para esta clinica.',
      });
      await fetchStatus();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSetupWebhook = async () => {
    setStatusInfo(prev => ({ ...prev, status: 'LOADING' }));
    try {
      const res = await empresasApi.setupWhatsappWebhook();
      if (!res.success) throw new Error(res.error?.message || 'Nao foi possivel configurar o webhook');
      toast({ title: 'Webhook configurado', description: 'Agora as mensagens recebidas pela Evolution podem virar leads no SellClin.' });
      await fetchStatus();
    } catch (e: any) {
      setStatusInfo({ status: 'ERROR', message: e.message });
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };
  const handleStartConnection = handleSetupWebhook;

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp da clinica na Evolution?')) return;
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

  const handleTestEvolution = async () => {
    setTestingEvolution(true);
    try {
      const res = await empresasApi.getWhatsappDiagnostics();
      if (res.success && res.data) {
        setDiagnostics(res.data);
        toast({
          title: res.data.webhookStatus === 'configured' ? 'Evolution validada' : 'Diagnostico concluido',
          description: res.data.message || 'Teste finalizado.',
          variant: res.data.webhookStatus === 'configured' ? 'default' : 'destructive'
        });
      } else {
        throw new Error(res.error?.message || 'Nao foi possivel testar a Evolution');
      }
    } catch (e: any) {
      setDiagnostics({ webhookStatus: 'error', message: e.message, attempts: [] });
      toast({ title: 'Erro no teste', description: e.message, variant: 'destructive' });
    } finally {
      setTestingEvolution(false);
    }
  };

  useEffect(() => {
    loadEvolutionConfig();
  }, []);

  const webhookProblem = statusInfo.webhookStatus === 'error';
  const webhookOk = statusInfo.webhookStatus === 'configured';
  const qrProblem = false;
  const evolutionConfigured = Boolean(evolutionConfig.evolutionApiUrl && evolutionConfig.apiKey && evolutionConfig.evolutionInstance);
  const appOrigin = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
    ? 'https://sellclin.com'
    : window.location.origin;
  const evolutionWebhookUrl = statusInfo.webhookUrl || (
    evolutionConfig.webhookToken
      ? `${appOrigin}/api/webhooks/evolution/${evolutionConfig.webhookToken}`
      : `${appOrigin}/api/webhooks/evolution`
  );

  return (
    <>
    <Card className="border border-slate-200/70 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Evolution API da Clinica</CardTitle>
        <CardDescription>Informe os dados da Evolution propria do cliente. O SellClin usa esses dados para configurar webhook, consultar status e capturar leads automaticamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>URL da Evolution</Label>
              <Input value={evolutionConfig.evolutionApiUrl} onChange={e => setEvolutionConfig({ ...evolutionConfig, evolutionApiUrl: e.target.value })} placeholder="https://api.exemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label>API key</Label>
              <Input type="password" value={evolutionConfig.apiKey} onChange={e => setEvolutionConfig({ ...evolutionConfig, apiKey: e.target.value })} placeholder="Global API key" />
            </div>
            <div className="space-y-1.5">
              <Label>Instancia</Label>
              <Input value={evolutionConfig.evolutionInstance} onChange={e => setEvolutionConfig({ ...evolutionConfig, evolutionInstance: e.target.value })} placeholder="clinica-whatsapp" />
            </div>
          </div>
          <Button size="sm" onClick={saveEvolutionConfig} disabled={savingConfig || configLoading}>
            <span className="material-symbols-outlined text-sm mr-2">save</span>
            Salvar Evolution API
          </Button>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-blue-700 mt-0.5">webhook</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-900">URL para colar na Evolution</p>
                <p className="text-xs text-blue-700">Use esta URL no webhook da instancia e habilite o evento MESSAGES_UPSERT.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={evolutionWebhookUrl} className="bg-white font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(evolutionWebhookUrl);
                  toast({ title: 'URL copiada', description: 'Cole essa URL no webhook da instancia Evolution.' });
                }}
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
              </Button>
            </div>
          </div>
          {!evolutionConfigured && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="material-symbols-outlined text-sm mt-0.5">info</span>
              <p>Preencha e salve os dados da Evolution para liberar status da conexao, webhook e captura automatica de leads.</p>
            </div>
          )}
        </div>

        {evolutionConfigured && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl border p-3">
            <p className="font-bold uppercase text-muted-foreground">Modo</p>
            <p className="mt-1 font-mono">Evolution propria</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-bold uppercase text-muted-foreground">Instancia</p>
            <p className="mt-1 font-mono break-all">{statusInfo.instance || evolutionConfig.evolutionInstance || '-'}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="font-bold uppercase text-muted-foreground">Webhook</p>
            <p className="mt-1">{webhookOk ? 'Configurado' : 'Pendente'}</p>
            <button
              type="button"
              className="mt-1 text-[11px] font-semibold text-blue-700 hover:underline"
              onClick={() => {
                navigator.clipboard.writeText(evolutionWebhookUrl);
                toast({ title: 'URL copiada', description: 'Cole essa URL no webhook da instancia Evolution.' });
              }}
            >
              Copiar URL
            </button>
          </div>
        </div>
        )}
      </CardContent>
    </Card>

    {evolutionConfigured && (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in slide-in-from-top-4">
      <CardHeader className="border-b border-slate-100 bg-white pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <span className="material-symbols-outlined block text-xl">settings_input_antenna</span>
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Status da Conexão WhatsApp</CardTitle>
            <CardDescription className="text-xs text-slate-500">Monitore a conexao e configure o webhook para capturar leads</CardDescription>
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

        {statusInfo.status !== 'LOADING' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`rounded-2xl border p-3 text-xs shadow-sm ${
              webhookOk
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : webhookProblem
                  ? 'bg-orange-50 border-orange-200 text-orange-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base mt-0.5">
                  {webhookOk ? 'verified' : webhookProblem ? 'warning' : 'webhook'}
                </span>
                <div className="min-w-0">
                  <p className="font-bold">
                    {webhookOk ? 'Webhook configurado' : webhookProblem ? 'Webhook nao configurado' : 'Webhook pendente'}
                  </p>
                  <p className="mt-1 leading-relaxed break-words">
                    {webhookOk
                      ? statusInfo.webhookEndpoint || statusInfo.webhookUrl || 'A captura automatica de mensagens esta ativa.'
                      : webhookProblem
                        ? statusInfo.webhookError || 'A conexao/QR pode funcionar, mas a captura automatica precisa do webhook.'
                        : statusInfo.webhookUrl || 'Aguardando teste da Evolution.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-950 text-xs text-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-white">Diagnostico Evolution</p>
                  <p className="mt-1 text-slate-400 break-words">
                    {diagnostics
                      ? `${diagnostics.apiKeyAccepted ? 'API key OK' : 'API key/base URL pendente'} · ${diagnostics.instance || statusInfo.instance || 'sem instancia'}`
                      : 'Teste a VPS para ver URL, instancia e endpoint aceito.'}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleTestEvolution} disabled={testingEvolution} className="shrink-0 h-8 border-white/15 bg-white text-xs text-slate-700 hover:bg-slate-100">
                  <span className="material-symbols-outlined text-sm mr-1">{testingEvolution ? 'progress_activity' : 'science'}</span>
                  {testingEvolution ? 'Testando' : 'Testar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {diagnostics && (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><strong>Base URL:</strong> <span className="break-all">{diagnostics.baseUrl || 'Nao configurada'}</span></div>
              <div><strong>Instancia:</strong> <span className="break-all">{diagnostics.instance || statusInfo.instance || 'Nao definida'}</span></div>
              <div><strong>API responde:</strong> {diagnostics.apiReachable ? 'Sim' : 'Nao'}</div>
              <div><strong>API key:</strong> {diagnostics.apiKeyAccepted ? 'Aceita' : 'Nao confirmada'}</div>
              <div className="sm:col-span-2"><strong>Webhook:</strong> <span className="break-all">{diagnostics.webhookEndpoint || diagnostics.message || 'Nao configurado'}</span></div>
              {statusInfo.qrcodeEndpoint && (
                <div className="sm:col-span-2"><strong>QR Code:</strong> <span className="break-all">{statusInfo.qrcodeEndpoint}</span></div>
              )}
            </div>
            {Array.isArray(diagnostics.attempts) && diagnostics.attempts.length > 0 && (
              <details className="pt-2">
                <summary className="cursor-pointer font-bold text-slate-600">Ver tentativas tecnicas</summary>
                <div className="mt-2 max-h-48 overflow-auto space-y-1 font-mono text-[10px] text-slate-600">
                  {diagnostics.attempts.slice(-8).map((attempt: any, index: number) => (
                    <div key={`${attempt.url}-${index}`} className="break-all">
                      {attempt.method} {attempt.url} - {attempt.status || 'sem status'} {attempt.ok ? 'OK' : 'falhou'}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {statusInfo.status === 'NOT_CONFIGURED' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span className="material-symbols-outlined mt-0.5 text-amber-600">settings_alert</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Evolution API nao configurada</p>
                <p className="text-xs leading-relaxed text-amber-700">
                  {statusInfo.message || 'Informe URL da Evolution, API key e nome da instancia acima para liberar status e webhook.'}
                </p>
              </div>
            </div>
            <Button type="button" onClick={handleSetupWebhook} className="w-full bg-emerald-600 font-bold text-white hover:bg-emerald-700">
              <span className="material-symbols-outlined text-sm mr-2">webhook</span>
              Configurar Webhook
            </Button>
          </div>
        )}

        {statusInfo.status === 'CONNECTED' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-800">WhatsApp Conectado e Ativo</p>
                <p className="text-xs leading-relaxed text-emerald-700">Sua clínica está integrada. Leads e mensagens automáticas estão funcionando normalmente.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={fetchStatus} className="flex-1 min-w-[140px] border-slate-200 bg-white font-semibold text-slate-700 transition-all hover:bg-slate-50">
                <span className="material-symbols-outlined text-sm mr-2">refresh</span>
                Atualizar Status
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleRestart} className="flex-1 min-w-[140px] border-slate-200 bg-white font-semibold text-slate-700 transition-all hover:bg-slate-50">
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
          <div className="space-y-4">
            <div className="space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <span className="material-symbols-outlined text-sm">info</span>
                WhatsApp nao conectado na Evolution
              </p>
              <p className="text-[11px] leading-relaxed text-amber-700">
                Conecte o numero diretamente no painel da Evolution do cliente. Depois volte aqui para atualizar o status e configurar o webhook do SellClin.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button type="button" onClick={handleSetupWebhook} className="flex-1 bg-emerald-600 font-bold text-white shadow-sm transition-all hover:bg-emerald-700">
                <span className="material-symbols-outlined text-sm mr-2">webhook</span>
                Configurar Webhook
              </Button>
              <Button type="button" variant="outline" onClick={fetchStatus} className="flex-1 border-slate-200 bg-white font-semibold text-slate-700 transition-all hover:bg-slate-50">
                <span className="material-symbols-outlined text-sm mr-2">refresh</span>
                Atualizar Status
              </Button>
              <Button type="button" variant="outline" onClick={handleRestart} className="flex-1 border-slate-200 bg-white font-semibold text-slate-500 transition-all hover:bg-slate-50">
                <span className="material-symbols-outlined text-sm mr-2">restart_alt</span>
                Reiniciar Evolution
              </Button>
            </div>
          </div>
        )}

        {false && statusInfo.status === 'DISCONNECTED' && (
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
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    {statusInfo.qrcodeError || 'QR Code expirado ou nao gerado. Clique no botao de atualizar abaixo.'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {qrProblem && (
                <div className="p-4 bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl space-y-1.5">
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">qr_code_2_add</span>
                    QR Code nao retornado
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                    {statusInfo.qrcodeError || 'A Evolution respondeu, mas nao enviou a imagem do QR Code. Reinicie a instancia e gere novamente.'}
                  </p>
                  {statusInfo.qrcodeEndpoint && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-500 break-all">Endpoint: {statusInfo.qrcodeEndpoint}</p>
                  )}
                </div>
              )}

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
                <Button type="button" onClick={handleStartConnection} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-md shadow-emerald-500/10">
                  <span className="material-symbols-outlined text-sm mr-2">sync</span>
                  Gerar / Atualizar QR Code
                </Button>
                <Button type="button" variant="outline" onClick={handleStartConnection} className="w-full font-semibold border-emerald-200 hover:bg-emerald-50 transition-all text-emerald-700 dark:text-emerald-300">
                  <span className="material-symbols-outlined text-sm mr-2">qr_code_scanner</span>
                  Conectar WhatsApp
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
                <p className="text-sm font-bold text-rose-800 dark:text-rose-400">
                  {webhookProblem ? 'Webhook nao configurado' : 'Evolution API indisponivel'}
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-500 leading-relaxed">
                  {statusInfo.webhookError || statusInfo.message || 'Falha ao se comunicar com a Evolution API. Certifique-se de que a instancia e a URL estao corretas.'}
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
    )}
    </>
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
    if (!confirm('Desconectar o Google Calendar desta clinica? Os agendamentos continuam no SellClin.')) return;
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
            : 'Conecte uma agenda Google da clinica para espelhar os agendamentos criados no SellClin.'}
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

const LegacyWhatsAppView = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm border border-emerald-200/50 dark:border-emerald-800/50 flex items-start gap-3 shadow-sm">
        <span className="material-symbols-outlined flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">chat</span>
        <div className="leading-relaxed">
          <strong className="block mb-0.5 text-emerald-900 dark:text-emerald-100 font-bold">WhatsApp integrado ao SellClin</strong>
          Conecte o numero da clinica na Evolution propria. Quando uma pessoa nova mandar mensagem, o SellClin verifica o telefone nesta clinica e cria o lead automaticamente no funil.
        </div>
      </div>

      <WhatsAppStatusManager />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: 'person_add', title: 'Novo contato', desc: 'Telefone novo vira lead em Novos Leads.' },
          { icon: 'rule', title: 'Sem duplicar', desc: 'A verificacao usa telefone + clinica.' },
          { icon: 'forum', title: 'Historico salvo', desc: 'Mensagem e conversa ficam vinculadas ao lead.' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200/70 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-900/40">
            <span className="material-symbols-outlined text-[#F97316] text-xl mb-2 block">{item.icon}</span>
            <p className="text-sm font-bold text-primary">{item.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

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
                        <li>Use qualquer <strong>Verify Token</strong> (ex: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">sellclin-verify</code>)</li>
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
                              toast({ title: '✅ Webhook configurado!', description: `Endpoint: ${attempt.url}. A Evolution API já está enviando mensagens para o SellClin.` });
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

const MetaWhatsAppManager = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [manual, setManual] = useState({
    phoneNumberId: '',
    wabaId: '',
    businessId: '',
    accessToken: '',
    webhookVerifyToken: '',
    twoStepPin: '',
    displayPhoneNumber: '',
  });

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      const res = await whatsappMetaApi.status();
      if (!res.success) throw new Error(res.error?.message || 'Nao foi possivel consultar a Meta');
      setStatus(res.data);
      setManual({
        phoneNumberId: res.data?.phoneNumberId || '',
        wabaId: res.data?.wabaId || '',
        businessId: res.data?.businessId || '',
        accessToken: '',
        webhookVerifyToken: res.data?.webhookVerifyToken || '',
        twoStepPin: '',
        displayPhoneNumber: res.data?.displayPhoneNumber || '',
      });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    const result = params.get('whatsappMeta');
    if (result === 'connected') {
      toast({ title: 'WhatsApp Oficial conectado', description: 'A conta Meta foi vinculada a esta clinica.' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (result === 'error') {
      toast({ title: 'Erro na Meta', description: 'Nao foi possivel concluir a conexao.', variant: 'destructive' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleDisconnect = async () => {
    if (!confirm('Desconectar a API Oficial Meta desta clinica?')) return;
    setIsWorking(true);
    try {
      const res = await whatsappMetaApi.disconnect();
      if (!res.success) throw new Error(res.error?.message || 'Erro ao desconectar Meta');
      toast({ title: 'Meta desconectada', description: 'As credenciais oficiais foram removidas desta clinica.' });
      await loadStatus();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsWorking(false);
    }
  };

  const handleManualSave = async () => {
    setIsWorking(true);
    try {
      const res = await whatsappMetaApi.configure({
        phoneNumberId: manual.phoneNumberId,
        wabaId: manual.wabaId,
        businessId: manual.businessId,
        accessToken: manual.accessToken,
        webhookVerifyToken: manual.webhookVerifyToken,
        twoStepPin: manual.twoStepPin,
        displayPhoneNumber: manual.displayPhoneNumber,
      });
      if (!res.success) throw new Error(res.error?.message || 'Erro ao salvar Meta manualmente');
      toast({ title: 'Credenciais Meta salvas', description: 'Cole a URL de webhook e o verify token no app da Meta.' });
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
  const configured = !!status?.configured;

  return (
    <Card className="border border-emerald-500/20 rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">API Oficial Meta</CardTitle>
            <CardDescription>Configure Phone Number ID, WABA ID, token permanente e webhook da propria clinica.</CardDescription>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {connected ? 'Conectado' : 'Pendente'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`rounded-2xl border p-4 text-sm ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : configured ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-xl">{connected ? 'verified' : configured ? 'add_link' : 'settings_alert'}</span>
            <div className="space-y-1">
              <p className="font-bold">
                {connected ? 'WhatsApp Oficial configurado' : configured ? 'Servidor pronto para receber webhook' : 'META_APP_SECRET pendente na VPS'}
              </p>
              <p className="text-xs leading-relaxed">
                {connected
                  ? `Numero: ${status.displayPhoneNumber || status.phoneNumberId || 'Meta WhatsApp'}. Mensagens e campanhas usam a Cloud API oficial.`
                  : configured
                    ? 'Preencha as credenciais da clinica e configure o callback no painel da Meta.'
                    : 'Defina META_APP_SECRET no ambiente da VPS para validar a assinatura dos webhooks.'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Webhook Callback URL</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input value={status?.webhookUrl || 'Salve a configuracao para gerar a URL'} readOnly className="bg-white font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!status?.webhookUrl) return;
                navigator.clipboard.writeText(status.webhookUrl);
                toast({ title: 'URL copiada' });
              }}
            >
              Copiar
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border bg-slate-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input value={manual.phoneNumberId} onChange={e => setManual({ ...manual, phoneNumberId: e.target.value })} placeholder="100234567890123" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp Business Account ID</Label>
              <Input value={manual.wabaId} onChange={e => setManual({ ...manual, wabaId: e.target.value })} placeholder="100234567890456" />
            </div>
            <div className="space-y-1.5">
              <Label>Business ID</Label>
              <Input value={manual.businessId} onChange={e => setManual({ ...manual, businessId: e.target.value })} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Numero exibido</Label>
              <Input value={manual.displayPhoneNumber} onChange={e => setManual({ ...manual, displayPhoneNumber: e.target.value })} placeholder="+55 11 99999-9999" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Permanent Access Token</Label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={manual.accessToken}
                  onChange={e => setManual({ ...manual, accessToken: e.target.value })}
                  placeholder={status?.hasAccessToken ? 'Token salvo. Preencha apenas se quiser trocar.' : 'EAA...'}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowToken(!showToken)}
                >
                  <span className="material-symbols-outlined text-base">{showToken ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Webhook Verify Token</Label>
              <Input value={manual.webhookVerifyToken} onChange={e => setManual({ ...manual, webhookVerifyToken: e.target.value })} placeholder="Crie uma chave sua" />
            </div>
            <div className="space-y-1.5">
              <Label>Two-step PIN</Label>
              <Input value={manual.twoStepPin} onChange={e => setManual({ ...manual, twoStepPin: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="Opcional" inputMode="numeric" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleManualSave} disabled={isWorking || !manual.phoneNumberId || !manual.wabaId || !manual.webhookVerifyToken || (!manual.accessToken && !status?.hasAccessToken)} className="font-bold">
              {isWorking ? 'Salvando...' : 'Salvar WhatsApp Oficial'}
            </Button>
            <Button onClick={loadStatus} disabled={isWorking} variant="outline" className="font-bold">
              Atualizar
            </Button>
            {connected && (
              <Button onClick={handleDisconnect} disabled={isWorking} variant="outline" className="font-bold text-red-600 hover:text-red-700">
                Desconectar Meta
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const WhatsAppView = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm border border-emerald-200/50 dark:border-emerald-800/50 flex items-start gap-3 shadow-sm">
        <span className="material-symbols-outlined flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400">chat</span>
        <div className="leading-relaxed">
          <strong className="block mb-0.5 text-emerald-900 dark:text-emerald-100 font-bold">WhatsApp integrado ao SellClin</strong>
          Configure a API Oficial Meta da clinica para capturar mensagens e criar leads automaticamente.
        </div>
      </div>

      <MetaWhatsAppManager />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: 'person_add', title: 'Novo contato', desc: 'Telefone novo vira lead em Novos Leads.' },
          { icon: 'rule', title: 'Sem duplicar', desc: 'A verificacao usa telefone + clinica.' },
          { icon: 'forum', title: 'Historico salvo', desc: 'Mensagem e conversa ficam vinculadas ao lead.' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-200/70 dark:border-slate-800 p-4 bg-white/70 dark:bg-slate-900/40">
            <span className="material-symbols-outlined text-[#F97316] text-xl mb-2 block">{item.icon}</span>
            <p className="text-sm font-bold text-primary">{item.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

type IntegrationKey =
  | 'googleCalendar'
  | 'metaWhatsapp'
  | 'instagram'
  | 'email'
  | 'messenger'
  | 'liveChat';

type IntegrationCategory = 'all' | 'agenda' | 'messaging' | 'future';

const integrationCards: Array<{
  key: IntegrationKey;
  name: string;
  eyebrow: string;
  description: string;
  status: string;
  category: Exclude<IntegrationCategory, 'all'>;
  available: boolean;
  actionLabel: string;
  bannerClassName: string;
  badgeClassName: string;
  logo?: string;
  logoAlt?: string;
  secondaryLogo?: string;
  secondaryLogoAlt?: string;
  logoClassName?: string;
  fallbackIcon?: string;
  fallbackLabel?: string;
  fallbackClassName?: string;
}> = [
  {
    key: 'googleCalendar',
    name: 'Google Calendar',
    eyebrow: 'Agenda',
    description: 'Sincronize os agendamentos da clinica com uma agenda Google conectada.',
    status: 'Disponivel',
    category: 'agenda',
    available: true,
    actionLabel: 'Configurar',
    bannerClassName: 'from-blue-100 via-white to-amber-100 border-blue-200',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    logo: '/integrations/google-calendar.webp',
    logoAlt: 'Google Calendar',
  },
  {
    key: 'metaWhatsapp',
    name: 'WhatsApp Oficial Meta',
    eyebrow: 'Business Messaging',
    description: 'API oficial da Meta com credenciais da propria clinica, webhooks e captura de leads.',
    status: 'Recomendado',
    category: 'messaging',
    available: true,
    actionLabel: 'Conectar canal',
    bannerClassName: 'from-blue-50 via-white to-sky-100 border-blue-200',
    badgeClassName: 'bg-blue-50 text-blue-700 ring-blue-100',
    logo: '/integrations/whatsapp.webp',
    logoAlt: 'WhatsApp',
    secondaryLogo: '/integrations/meta-logo.png',
    secondaryLogoAlt: 'Meta',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    eyebrow: 'Social messaging',
    description: 'Capte conversas e leads do Instagram Direct em uma proxima etapa.',
    status: 'Em breve',
    category: 'future',
    available: false,
    actionLabel: 'Em breve',
    bannerClassName: 'from-pink-100 via-white to-orange-100 border-pink-200',
    badgeClassName: 'bg-slate-100 text-slate-500 ring-slate-200',
    logo: '/integrations/instagram-icon.png',
    logoAlt: 'Instagram',
  },
  {
    key: 'email',
    name: 'E-mail SMTP/IMAP',
    eyebrow: 'Inbox',
    description: 'Centralize entradas por e-mail e respostas do time comercial futuramente.',
    status: 'Em breve',
    category: 'future',
    available: false,
    actionLabel: 'Em breve',
    bannerClassName: 'from-slate-100 via-white to-blue-100 border-slate-200',
    badgeClassName: 'bg-slate-100 text-slate-500 ring-slate-200',
    fallbackIcon: 'mail',
  },
  {
    key: 'messenger',
    name: 'Facebook Messenger',
    eyebrow: 'Meta',
    description: 'Receba mensagens do Facebook Messenger quando o canal for liberado.',
    status: 'Em breve',
    category: 'future',
    available: false,
    actionLabel: 'Em breve',
    bannerClassName: 'from-indigo-100 via-white to-sky-100 border-indigo-200',
    badgeClassName: 'bg-slate-100 text-slate-500 ring-slate-200',
    logo: '/integrations/facebook-messenger-logo.png',
    logoAlt: 'Facebook Messenger',
  },
  {
    key: 'liveChat',
    name: 'Chat do site',
    eyebrow: 'Atendimento',
    description: 'Widget de chat para o site da clinica, conectado ao funil comercial.',
    status: 'Em breve',
    category: 'future',
    available: false,
    actionLabel: 'Em breve',
    bannerClassName: 'from-violet-100 via-white to-cyan-100 border-violet-200',
    badgeClassName: 'bg-slate-100 text-slate-500 ring-slate-200',
    fallbackIcon: 'chat_bubble',
  },
];

const integrationFilters: Array<{ key: IntegrationCategory; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'messaging', label: 'Mensagens' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'future', label: 'Em breve' },
];

const WhatsAppBenefits = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {[
      { icon: 'person_add', title: 'Novo contato', desc: 'Telefone novo vira lead em Novos Leads.' },
      { icon: 'rule', title: 'Sem duplicar', desc: 'A verificacao usa telefone + clinica.' },
      { icon: 'forum', title: 'Historico salvo', desc: 'Mensagem e conversa ficam vinculadas ao lead.' },
    ].map((item) => (
      <div key={item.title} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <span className="material-symbols-outlined text-[#F97316] text-xl mb-2 block">{item.icon}</span>
        <p className="text-sm font-bold text-slate-900">{item.title}</p>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">{item.desc}</p>
      </div>
    ))}
  </div>
);

const IntegrationLogo = ({ card }: { card: (typeof integrationCards)[number] }) => (
  <div className={`relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${!card.logo && card.fallbackClassName ? card.fallbackClassName : ''}`}>
    {card.logo ? (
      <img
        src={card.logo}
        alt={card.logoAlt || card.name}
        className={`h-9 w-9 object-contain ${card.logoClassName || ''}`}
        loading="lazy"
      />
    ) : card.fallbackLabel ? (
      <span className="text-sm font-black tracking-tight">{card.fallbackLabel}</span>
    ) : (
      <span className="material-symbols-outlined text-[24px] text-slate-500">{card.fallbackIcon || 'extension'}</span>
    )}
    {card.secondaryLogo && (
      <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
        <img src={card.secondaryLogo} alt={card.secondaryLogoAlt || ''} className="h-3.5 w-3.5 object-contain" loading="lazy" />
      </span>
    )}
  </div>
);

export const IntegrationsView = () => {
  const [activeIntegration, setActiveIntegration] = useState<IntegrationKey | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<IntegrationCategory>('all');
  const activeCard = integrationCards.find((card) => card.key === activeIntegration);
  const visibleCards = integrationCards.filter((card) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesFilter = activeFilter === 'all' || card.category === activeFilter;
    const matchesSearch = !search
      || card.name.toLowerCase().includes(search)
      || card.eyebrow.toLowerCase().includes(search)
      || card.description.toLowerCase().includes(search);

    return matchesFilter && matchesSearch;
  });

  const renderIntegration = () => {
    if (activeIntegration === 'googleCalendar') return <GoogleCalendarView />;
    if (activeIntegration === 'metaWhatsapp') {
      return (
        <div className="space-y-6">
          <MetaWhatsAppManager />
          <WhatsAppBenefits />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {!activeIntegration ? (
        <>
          <div className="flex flex-col gap-5 bg-transparent mb-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-500">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-950">Central de Integrações</h3>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
                  Conecte canais para configurar agenda, mensagens, captura de leads e automações da sua clínica.
                </p>
              </div>
            </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center justify-between">
                <div className="relative lg:max-w-xs lg:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar integracao..."
                    className="h-10 rounded-xl border-slate-200 bg-white pl-9 shadow-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {integrationFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setActiveFilter(filter.key)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        activeFilter === filter.key
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleCards.map((card) => (
              <button
                type="button"
                key={card.key}
                onClick={() => card.available && setActiveIntegration(card.key)}
                disabled={!card.available}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left transition-all duration-300 flex flex-col p-5 ${
                  card.available ? 'hover:-translate-y-0.5 hover:shadow-lg hover:border-slate-300' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <IntegrationLogo card={card} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.eyebrow}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide border ${card.badgeClassName}`}>
                        {card.status}
                      </span>
                    </div>
                    <h4 className="truncate text-base font-bold text-slate-950 group-hover:text-primary transition-colors">{card.name}</h4>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{card.description}</p>
                  </div>
                </div>
                
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className={`text-xs font-bold transition-colors ${card.available ? 'text-primary' : 'text-slate-400'}`}>
                    {card.actionLabel}
                  </span>
                  <div className={`grid h-8 w-8 place-items-center rounded-full transition-all ${
                    card.available ? 'bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:shadow-md' : 'bg-slate-50 text-slate-300'
                  }`}>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {visibleCards.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-muted-foreground">
              Nenhuma integracao encontrada para esse filtro.
            </div>
          )}
        </>
      ) : (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setActiveIntegration(null)}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#F97316]"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Voltar para integracoes
          </button>

          {activeCard && (
            <div className={`rounded-3xl border bg-gradient-to-br ${activeCard.bannerClassName} p-5`}>
              <div className="flex items-start gap-4">
                <IntegrationLogo card={activeCard} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{activeCard.eyebrow}</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">{activeCard.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{activeCard.description}</p>
                </div>
              </div>
            </div>
          )}

          {renderIntegration()}
        </div>
      )}
    </div>
  );
};

// Map of components per setting
type SettingsItem = {
  key: string;
  name: string;
  description: string;
  icon: string;
  ownerOnly?: boolean;
};

type SettingsSection = {
  title: string;
  items: SettingsItem[];
};

const ProfileSettingsView = () => <Profile embedded />;

const PlaceholderSettingsView = ({ title, description, icon }: { title: string; description: string; icon: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
      <span className="material-symbols-outlined text-[24px]">{icon}</span>
    </div>
    <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
  </div>
);

const EspecialistasView = () => <EquipeView isSpecialistMode={true} />;

const ViewsMap: Record<string, React.FC<any>> = {
  profile: ProfileSettingsView,
  security: () => <PlaceholderSettingsView title="Seguranca" description="A troca de senha e controles de acesso ficam concentrados aqui em uma proxima etapa." icon="lock" />,
  notifications: () => <PlaceholderSettingsView title="Notificacoes" description="Preferencias de alertas, lembretes e avisos serao organizadas nesta area." icon="notifications" />,
  services: ServicosView,
  team: EquipeView,
  specialists: EspecialistasView,
  roles: CargosView,
  clinics: ClinicasView,
  business: InfoNegocioView,
  appearance: AparenciaView,
  funnels: FunnelsSettingsView,
  lead_statuses: LeadStatusesSettingsView,
};

const Settings = () => {
  const [selectedKey, setSelectedKey] = useState('profile');
  const { professional: authUser } = useAuth();
  const isOwner = authUser?.role === 'profissional' || authUser?.role === 'admin';

  const { tourActive, tourStep, tourSteps, tourHandleNext, tourHandlePrev, tourHandleClose } =
    useSectionTour('settings', [
      { id: null, title: 'Configuracoes', description: 'Gerencie sua conta, equipe e dados da clinica em uma tela unica.', position: 'center' },
      { id: '#settings-navigation', title: 'Navegacao interna', description: 'Use o menu lateral para alternar entre perfil, organizacao e sistema.', position: 'right' },
    ]);

  const settingsSections: SettingsSection[] = [
    {
      title: 'Conta',
      items: [
        { key: 'profile', name: 'Perfil', description: 'Dados pessoais e foto do usuario', icon: 'person' },
        { key: 'security', name: 'Seguranca', description: 'Senha e acesso da conta', icon: 'lock' },
        { key: 'notifications', name: 'Notificacoes', description: 'Alertas e preferencias', icon: 'notifications' },
      ],
    },
    {
      title: 'Organizacao',
      items: [
        { key: 'business', name: 'Clinica', description: 'Dados comerciais da empresa', icon: 'business', ownerOnly: true },
        { key: 'services', name: 'Servicos', description: 'Servicos oferecidos', icon: 'medical_services', ownerOnly: true },
        { key: 'team', name: 'Equipe', description: 'Usuarios e convites', icon: 'group', ownerOnly: true },
        { key: 'specialists', name: 'Especialistas', description: 'Gerenciar prestadores', icon: 'medical_information', ownerOnly: true },
        { key: 'roles', name: 'Cargos', description: 'Funcoes e permissoes', icon: 'badge', ownerOnly: true },
        { key: 'clinics', name: 'Minhas clinicas', description: 'Filiais e multi-clinica', icon: 'apartment', ownerOnly: true },
      ],
    },
    {
      title: 'Comercial',
      items: [
        { key: 'funnels', name: 'Funis de Vendas', description: 'Pipelines e etapas do comercial', icon: 'view_kanban', ownerOnly: true },
        { key: 'lead_statuses', name: 'Status', description: 'Status rápidos dos negócios', icon: 'label', ownerOnly: true },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { key: 'appearance', name: 'Interface', description: 'Menu lateral e experiencia visual', icon: 'palette' },
      ],
    },
  ];

  const visibleSections = settingsSections
    .map(section => ({ ...section, items: section.items.filter(item => !item.ownerOnly || isOwner) }))
    .filter(section => section.items.length > 0);

  const allItems = visibleSections.flatMap(section => section.items);
  const selectedItem = allItems.find(item => item.key === selectedKey) || allItems[0];
  const ActiveView = selectedItem ? ViewsMap[selectedItem.key] : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get('tab') || params.get('view');
    if (requestedTab && allItems.some(item => item.key === requestedTab)) {
      setSelectedKey(requestedTab);
    }
  }, [isOwner]);

  const handleSelect = (item: SettingsItem) => {
    setSelectedKey(item.key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', item.key);
    url.searchParams.delete('view');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 md:p-8 relative">
      <TourPopover active={tourActive} step={tourStep} steps={tourSteps} onNext={tourHandleNext} onPrev={tourHandlePrev} onClose={tourHandleClose} />

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Configuracoes</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gerencie sua conta, equipe, clinicas e preferencias do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside id="settings-navigation" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm h-fit lg:sticky lg:top-6">
          <div className="space-y-4">
            {visibleSections.map(section => (
              <div key={section.title}>
                <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map(item => {
                    const active = selectedItem?.key === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined text-[18px] ${active ? 'text-orange-400' : 'text-slate-400'}`}>{item.icon}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{item.name}</p>
                            <p className={`truncate text-[11px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{item.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {selectedItem && (
            <div className="mb-5 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
                  <span className="material-symbols-outlined text-[20px]">{selectedItem.icon}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedItem.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                </div>
              </div>
            </div>
          )}

          {ActiveView && <ActiveView name={selectedItem?.name} />}
        </section>
      </div>
    </div>
  );
};

export default Settings;
