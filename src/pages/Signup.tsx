import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { SiteNavbar } from '@/components/SiteNavbar';
import { 
  Loader2, Mail, Lock, Phone, User, Briefcase, 
  ArrowRight, ShieldCheck, BarChart, ChevronRight,
  Instagram, MessageCircle, Eye, EyeOff
} from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.specialization || !formData.password) {
      toast({
        title: 'Campos Obrigatórios',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        title: 'Senha Fraca',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    
    const result = await signup({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      specialization: formData.specialization,
      password: formData.password
    });
    
    if (result.success) {
      toast({
        title: '🚀 Conta criada com sucesso!',
        description: 'Seja bem-vindo ao cérebro comercial da sua clínica.',
      });
      navigate('/select-plan');
    } else {
      toast({
        title: 'Erro ao criar conta',
        description: result.error || 'Não foi possível criar sua conta. Verifique se o e-mail já está cadastrado.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-body selection:bg-[#F97316]/20 overflow-x-hidden relative flex flex-col justify-between">
      
      {/* Global Editorial Axis Line (Same as landing page) */}
      <div className="absolute left-8 lg:left-[calc(50%-640px+32px)] top-0 w-[1px] h-full bg-slate-100 z-0 hidden md:block" />

      {/* Shared Site Navbar at the top to maintain absolute consistency */}
      <div className="relative z-50">
        <SiteNavbar />
      </div>

      {/* Hero-Style Onboarding Section */}
      <section className="relative flex-grow flex items-center pt-24 lg:pt-28 pb-16 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            
            {/* LEFT COLUMN (Content and Pillars - identical styling to landing page Hero) */}
            <div className="lg:col-span-6 space-y-8 py-4">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F97316] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F97316]"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#F97316]">Onboarding Ativo</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-[56px] font-headline font-black text-[#0F172A] leading-[1] tracking-tighter max-w-xl">
                  Sua clínica no próximo <br />
                  <span className="shimmer-text">nível comercial.</span>
                </h1>
                <p className="text-lg text-[#64748B] font-medium leading-relaxed max-w-md">
                  Preencha os dados e ative sua infraestrutura comercial de alto ticket. Gestão sem atritos e qualificação automatizada de leads.
                </p>
              </div>

              {/* Pillars (Checking identical landing page hero styling) */}
              <div className="flex flex-col sm:flex-row items-start gap-12 border-l-2 border-slate-100 pl-8">
                {[
                  { icon: <BarChart size={18}/>, t: "Performance", d: "Aceleração real de vendas." },
                  { icon: <ShieldCheck size={18}/>, t: "HIPAA Compliant", d: "Segurança de dados clínicos." }
                ].map((b, i) => (
                  <div key={i} className="flex flex-col gap-2">
                     <div className="text-[#F97316]">
                       {b.icon}
                     </div>
                     <div>
                       <div className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]">{b.t}</div>
                       <div className="text-[9px] text-slate-400 font-medium mt-0.5">{b.d}</div>
                     </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Signup Card styled exactly like the Hero Preview Card */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg">
                {/* Glowing mesh background blob */}
                <div className="absolute -inset-10 bg-gradient-to-tr from-[#F97316]/10 to-blue-500/5 blur-[100px] opacity-40 pointer-events-none" />
                
                {/* The Luxury Card */}
                <div className="relative bg-white p-3 rounded-[3rem] border border-slate-100 shadow-[0_50px_100px_-20px_rgba(15,23,42,0.15)] w-full">
                  <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 space-y-6">
                    
                    {/* Card Title */}
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-black font-headline tracking-tight text-[#0F172A]">
                        Criar Minha Conta Grátis
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">
                        Insira as informações comerciais para configurar seu painel comercial.
                      </p>
                    </div>

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      
                      {/* Nome Completo */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nome Completo</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            placeholder="Dr. João Silva"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:bg-white transition-all duration-200 font-medium"
                          />
                        </div>
                      </div>

                      {/* E-mail Corporativo */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">E-mail Corporativo</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="clinica@email.com"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:bg-white transition-all duration-200 font-medium"
                          />
                        </div>
                      </div>

                      {/* WhatsApp e Especialidade lado a lado em telas maiores */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">WhatsApp</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              id="phone"
                              name="phone"
                              type="tel"
                              required
                              placeholder="(11) 99999-9999"
                              value={formData.phone}
                              onChange={handleChange}
                              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:bg-white transition-all duration-200 font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Especialidade</label>
                          <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              id="specialization"
                              name="specialization"
                              type="text"
                              required
                              placeholder="Dermatologia..."
                              value={formData.specialization}
                              onChange={handleChange}
                              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:bg-white transition-all duration-200 font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Senha */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Senha de Acesso</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full pl-11 pr-12 bg-slate-50 border border-slate-200/80 rounded-xl text-sm outline-none text-slate-800 placeholder-slate-400 focus:border-[#F97316] focus:bg-white transition-all duration-200 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* CTA Button matching hero button styling perfectly */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-[#F97316] text-white px-10 py-4.5 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer w-full mt-6"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isLoading ? 'Configurando...' : 'Ativar minha conta'} <ArrowRight size={14}/>
                      </button>

                    </form>

                    {/* Divider & Switch Route Link */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold gap-3 text-slate-400">
                      <div>
                        Já é cliente?{' '}
                        <Link to="/login" className="text-[#F97316] hover:underline font-bold transition-colors">
                          Fazer login
                        </Link>
                      </div>
                      <Link to="/" className="inline-flex items-center gap-1.5 hover:text-slate-700 transition-colors group">
                        Voltar ao site principal <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER — COMPREHENSIVE EDITORIAL */}
      <footer className="py-8 bg-white border-t border-slate-100 relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-4">
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <img src="/logo-site.png" alt="SalesClin" className="h-8 w-auto opacity-90" />
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs">
                A infraestrutura comercial definitiva para a sua clínica. Transformamos leads em faturamento com inteligência e precisão.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#F97316] hover:border-[#F97316] transition-all cursor-pointer">
                  <Instagram size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#F97316] hover:border-[#F97316] transition-all cursor-pointer">
                  <MessageCircle size={14} />
                </a>
              </div>
            </div>

            {/* Column 2: Produto */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-[#0F172A] uppercase tracking-[0.3em]">Produto</h4>
              <ul className="space-y-2">
                <li><Link to="/funcionalidades/funil" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">Funil de Vendas</Link></li>
                <li><Link to="/funcionalidades/agenda" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">Agenda Inteligente</Link></li>
                <li><Link to="/funcionalidades/metas" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">Engenharia de Metas</Link></li>
                <li><Link to="/precos" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">Planos e Preços</Link></li>
              </ul>
            </div>

            {/* Column 3: Institucional */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-[#0F172A] uppercase tracking-[0.3em]">Institucional</h4>
              <ul className="space-y-2">
                <li><Link to="/sobre" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">Sobre a SalesClin</Link></li>
                <li><Link to="/clientes" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">Nossos Clientes</Link></li>
                <li><Link to="/faq" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">FAQ & Ajuda</Link></li>
                <li><a href="#" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">Falar com Consultor</a></li>
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-[#0F172A] uppercase tracking-[0.3em]">Legal</h4>
              <ul className="space-y-2">
                {["Termos de Uso", "Privacidade", "Cookies", "Segurança"].map((item, i) => (
                  <li key={i}><a href="#" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex flex-col md:flex-row items-center justify-center">
            <div className="text-[10px] font-black text-[#64748B] uppercase tracking-[0.3em]">
              © 2026 SalesClin · CRM Especializado em Alto Ticket
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Signup;