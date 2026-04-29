import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Save,
  Edit2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { professionalsApi } from '@/lib/api';

const Profile = () => {
  const { professional } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    crm: '',
    bio: '',
    photoUrl: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await professionalsApi.getMe();
      if (res.success && res.data) {
        const d = res.data;
        setFormData({
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          specialization: d.specialization || '',
          crm: d.crm || '',
          bio: d.bio || '',
          photoUrl: d.photoUrl || '',
        });
        if (d.photoUrl) setProfileImage(d.photoUrl);
      }
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar o perfil', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Erro', description: 'Imagem deve ter no máximo 2MB.', variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setProfileImage(base64);
        setFormData(prev => ({ ...prev, photoUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: 'Atenção', description: 'O nome é obrigatório.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await professionalsApi.updateMe({
        name: formData.name,
        phone: formData.phone || null,
        specialization: formData.specialization || null,
        crm: formData.crm || null,
        bio: formData.bio || null,
        photoUrl: formData.photoUrl || null,
      });
      if (res.success) {
        toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas com sucesso.' });
        setIsEditing(false);
      } else {
        throw new Error(res.error?.message || 'Erro ao salvar');
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-headline">Meu Perfil</h1>
          <p className="text-slate-500 mt-1">
            Gerencie suas informações pessoais e profissionais
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => { setIsEditing(false); loadProfile(); }} className="rounded-xl font-headline border-slate-200">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-secondary hover:bg-secondary/90 text-primary font-bold rounded-xl font-headline shadow-lg shadow-secondary/20">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl font-headline shadow-lg shadow-primary/20">
              <Edit2 className="h-4 w-4 mr-2" />
              Editar Perfil
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Picture & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">account_circle</span>
                Foto do Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="relative inline-block">
                <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                  <AvatarImage src={profileImage || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-headline">
                    {getInitials(formData.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Label
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-secondary text-primary flex items-center justify-center cursor-pointer hover:scale-110 transition-all shadow-lg border-2 border-white"
                  >
                    <Camera className="h-4 w-4" />
                  </Label>
                )}
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              
              <div className="space-y-2 pb-2">
                <h3 className="text-xl font-bold text-primary font-headline">{formData.name}</h3>
                {formData.specialization && (
                  <Badge className="bg-secondary/10 text-secondary border-secondary/20 font-bold px-3 py-1 rounded-full mb-2">
                    {formData.specialization}
                  </Badge>
                )}
                {formData.crm && (
                  <p className="text-sm font-medium text-slate-500 bg-slate-50 py-1 rounded-lg">
                    {formData.crm}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">info</span>
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                  <span className="text-sm font-medium text-slate-600">E-mail</span>
                </div>
                <span className="text-xs font-medium text-primary truncate max-w-[150px]">{formData.email}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">phone</span>
                  <span className="text-sm font-medium text-slate-600">Telefone</span>
                </div>
                <span className="text-xs font-medium text-primary">{formData.phone || 'Não informado'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">badge</span>
                  <span className="text-sm font-medium text-slate-600">CRM</span>
                </div>
                <span className="text-xs font-medium text-primary">{formData.crm || 'Não informado'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Profile Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">person</span>
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Especialização</Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-slate-100 border-slate-200 rounded-xl cursor-not-allowed opacity-60"
                  />
                  <p className="text-[10px] text-muted-foreground">O e-mail não pode ser alterado por aqui.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="(11) 99999-9999"
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crm">CRM / Registro Profissional</Label>
                  <Input
                    id="crm"
                    value={formData.crm}
                    onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                    disabled={!isEditing}
                    placeholder="CRM-SP 123456"
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Biografia Profissional</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!isEditing}
                  rows={3}
                  placeholder="Descreva sua experiência e especialidades..."
                  className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security & Privacy */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">shield</span>
                Segurança e Privacidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white/50 hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-400">lock</span>
                  </div>
                  <div>
                    <p className="font-semibold text-primary font-headline">Alterar Senha</p>
                    <p className="text-sm text-slate-500">
                      Redefina sua senha de acesso
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl">
                  Alterar
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white/50 hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-400">notifications</span>
                  </div>
                  <div>
                    <p className="font-semibold text-primary font-headline">Notificações</p>
                    <p className="text-sm text-slate-500">
                      Gerenciar preferências de notificação
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl">
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;