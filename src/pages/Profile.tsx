import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Clock, 
  Save,
  Edit2,
  Shield,
  Bell,
  Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { professional } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: professional?.name || 'Dr. João Silva',
    email: professional?.email || 'joao.silva@clinica.com',
    phone: '(11) 99999-9999',
    specialization: professional?.specialization || 'Cardiologista',
    crm: 'CRM-SP 123456',
    clinicName: 'Clínica Saúde & Vida',
    clinicAddress: 'Rua das Flores, 123 - Centro, São Paulo - SP',
    clinicPhone: '(11) 3333-4444',
    bio: 'Especialista em cardiologia com mais de 15 anos de experiência. Formado pela USP, com pós-graduação em cardiologia intervencionista.',
    workingHours: '08:00 - 18:00',
    consultationDuration: '30',
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'image/png') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignatureImage(e.target?.result as string);
        toast({
          title: "Assinatura carregada",
          description: "Imagem da assinatura digital atualizada com sucesso!",
        });
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Erro no upload",
        description: "Por favor, selecione apenas arquivos PNG.",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    // Here you would typically save to your backend/database
    setIsEditing(false);
    toast({
      title: "Perfil atualizado",
      description: "Suas informações foram salvas com sucesso.",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
              <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl font-headline border-slate-200">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90 text-primary font-bold rounded-xl font-headline shadow-lg shadow-secondary/20">
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl font-headline shadow-lg shadow-primary/20">
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
                  <AvatarFallback className="text-2xl bg-primary text-white font-headline">
                    {getInitials(formData.name)}
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
                <Badge className="bg-secondary/10 text-secondary border-secondary/20 font-bold px-3 py-1 rounded-full mb-2">
                  {formData.specialization}
                </Badge>
                <p className="text-sm font-medium text-slate-500 bg-slate-50 py-1 rounded-lg">
                  {formData.crm}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Plan */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">workspace_premium</span>
                Plano Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center pt-2">
                <Badge className="mb-2 bg-primary text-white font-bold px-4 py-1.5 rounded-xl shadow-md">
                  Plano Premium
                </Badge>
                <p className="text-xs text-slate-400">Ativo desde Jan 2024</p>
              </div>
              
              <div className="h-px bg-slate-100 w-full my-4" />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Próxima cobrança</span>
                  <span className="text-sm font-bold text-primary">15 Fev 2024</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Valor mensal</span>
                  <span className="text-sm font-bold text-primary">R$ 149,90</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Pacientes</span>
                  <span className="text-sm font-bold text-emerald-600">Ilimitados</span>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="w-full mt-4 rounded-xl font-headline border-slate-200 text-slate-600 hover:bg-slate-50">
                Gerenciar Plano
              </Button>
            </CardContent>
          </Card>

          {/* Digital Signature Configuration */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">draw</span>
                Assinatura Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                {signatureImage ? (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-2xl p-6 inline-block border border-dashed border-slate-200">
                      <img 
                        src={signatureImage} 
                        alt="Assinatura digital" 
                        className="max-h-16 max-w-32 object-contain"
                      />
                    </div>
                    <p className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Assinatura configurada
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200">
                      <Edit2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-400">Nenhuma assinatura configurada</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="h-px bg-slate-100 w-full my-4" />
              
              <div className="space-y-3">
                <Label htmlFor="signature-upload" className="text-sm font-bold text-primary font-headline">
                  Upload da Assinatura (PNG transparente)
                </Label>
                <div className="flex flex-col gap-2">
                  <input
                    id="signature-upload"
                    type="file"
                    accept=".png"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('signature-upload')?.click()}
                    className="w-full rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-headline"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {signatureImage ? 'Alterar Assinatura' : 'Carregar Assinatura'}
                  </Button>
                  <p className="text-[10px] text-slate-400 text-center leading-tight">
                    Recomendado: PNG com fundo transparente, até 2MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">monitoring</span>
                Estatísticas Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">groups</span>
                  <span className="text-sm font-medium text-slate-600">Pacientes</span>
                </div>
                <span className="font-bold text-primary font-headline">248</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">calendar_month</span>
                  <span className="text-sm font-medium text-slate-600">Consultas</span>
                </div>
                <span className="font-bold text-primary font-headline">1,205</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[20px]">star</span>
                  <span className="text-sm font-medium text-slate-600">Avaliação</span>
                </div>
                <span className="font-bold text-primary font-headline flex items-center gap-1">
                  4.9
                </span>
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
                  <Label htmlFor="name">Nome Completo</Label>
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
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crm">CRM</Label>
                  <Input
                    id="crm"
                    value={formData.crm}
                    onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                    disabled={!isEditing}
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

          {/* Clinic Information */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">domain</span>
                Informações da Clínica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Nome da Clínica</Label>
                  <Input
                    id="clinicName"
                    value={formData.clinicName}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicPhone">Telefone da Clínica</Label>
                  <Input
                    id="clinicPhone"
                    value={formData.clinicPhone}
                    onChange={(e) => setFormData({ ...formData, clinicPhone: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clinicAddress">Endereço</Label>
                <Input
                  id="clinicAddress"
                  value={formData.clinicAddress}
                  onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                  disabled={!isEditing}
                  className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Working Hours & Preferences */}
          <Card className="bg-white/80 backdrop-blur-md border border-slate-100/50 shadow-sm rounded-3xl overflow-hidden hover-card">
            <CardHeader className="border-b border-slate-100/50 pb-4 bg-white/40">
              <CardTitle className="flex items-center gap-2 text-primary font-headline text-lg">
                <span className="material-symbols-outlined text-secondary text-[22px]">schedule</span>
                Horários e Preferências
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workingHours">Horário de Funcionamento</Label>
                  <Input
                    id="workingHours"
                    value={formData.workingHours}
                    onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                    disabled={!isEditing}
                    placeholder="08:00 - 18:00"
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultationDuration">Duração da Consulta (min)</Label>
                  <Input
                    id="consultationDuration"
                    type="number"
                    value={formData.consultationDuration}
                    onChange={(e) => setFormData({ ...formData, consultationDuration: e.target.value })}
                    disabled={!isEditing}
                    className="bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-secondary/20 focus-visible:border-secondary"
                  />
                </div>
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
                      Última alteração há 3 meses
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