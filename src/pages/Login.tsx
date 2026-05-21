import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, ArrowRight, Sun, Moon, Sunset, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [greeting, setGreeting] = useState('Olá');
  const [GreetingIcon, setGreetingIcon] = useState<any>(Sun);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Bom dia');
      setGreetingIcon(Sun);
    } else if (hour < 18) {
      setGreeting('Boa tarde');
      setGreetingIcon(Sunset);
    } else {
      setGreeting('Boa noite');
      setGreetingIcon(Moon);
    }
  }, []);

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = new Date().toLocaleDateString('pt-BR', options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ 
        title: 'Campos vazios', 
        description: 'Por favor, preencha seu e-mail e senha.', 
        variant: 'destructive' 
      });
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      toast({ 
        title: 'Que bom ter você aqui!', 
        description: `Login realizado com sucesso no seu painel.` 
      });
      navigate('/dashboard');
    } else {
      toast({ 
        title: 'Verifique seus dados', 
        description: result.error || 'E-mail ou senha incorretos.', 
        variant: 'destructive' 
      });
    }
  };

  const handleGoogleLogin = () => {
    toast({ 
      title: 'Integração em andamento', 
      description: 'O login do Google estará disponível em breve com a nova API.' 
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#FAF9F6]/80 font-body p-4 sm:p-6">
      
      {/* 1. Subtle Dotted Grid Pattern for texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.25]" 
        style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
      />
      
      {/* 2. Soft, rich ambient glows (brand orange and navy) */}
      <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[#F97316]/8 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#0F172A]/8 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-[#F97316]/4 blur-[110px] pointer-events-none" />
      
      {/* CENTRAL CONTAINER */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl bg-white rounded-[2.5rem] shadow-[0_30px_70px_-15px_rgba(15,23,42,0.08)] border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[600px]"
      >
        
        {/* LEFT COLUMN: BRANDING & WELCOME AURA */}
        <div className="md:col-span-5 bg-[#0F172A] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden text-white">
          
          {/* Cozy Amber Warm Glow inside the dark panel */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#F97316]/15 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 space-y-12">
            {/* Brand Logo */}
            <div>
              <img 
                src="/logo-site.png" 
                alt="SalesClin Logo" 
                className="h-8 w-auto brightness-0 invert" 
              />
            </div>
            
            {/* Dynamic Greeting */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#F97316] border border-white/5">
                {GreetingIcon && <GreetingIcon size={14} className="text-[#F97316] animate-pulse" />}
                <span className="text-[11px] font-bold uppercase tracking-wider">{greeting}!</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-headline font-bold text-white tracking-tight leading-tight">
                Que bom ver você <br/> de volta.
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed font-medium max-w-[280px]">
                Preparamos seu espaço para que o dia de hoje seja produtivo, leve e cheio de resultados.
              </p>
            </div>
          </div>
          
          {/* Warm indicators card */}
          <div className="relative z-10 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-4 mt-8">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#F97316] uppercase tracking-wider">{getFormattedDate()}</span>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 size={14} className="text-[#F97316]" />
                <span>Sua agenda está sincronizada</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 size={14} className="text-[#F97316]" />
                <span>Funil de vendas ativo</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 size={14} className="text-[#F97316]" />
                <span>Faturamento do dia pronto</span>
              </div>
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN: CLEAN FORM */}
        <div className="md:col-span-7 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-gradient-to-br from-white to-slate-50/40">
          <div className="max-w-md w-full mx-auto space-y-8">
            
            {/* Title */}
            <div>
              {/* Logo for mobile only */}
              <div className="md:hidden mb-6">
                <img 
                  src="/logo-site.png" 
                  alt="SalesClin Logo" 
                  className="h-8 w-auto" 
                />
              </div>
              <h1 className="text-2xl font-headline font-bold text-[#0F172A] tracking-tight mb-2">Faça o seu acesso</h1>
              <p className="text-slate-400 text-sm font-medium">Insira suas credenciais para entrar no painel da clínica.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[13px] font-bold text-[#0F172A] ml-1">E-mail corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      id="email"
                      type="email" 
                      placeholder="nome@clinica.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-[54px] pl-11 pr-5 border border-slate-200 rounded-2xl text-[14px] focus:outline-none focus:ring-4 focus:ring-[#F97316]/10 focus:border-[#F97316] transition-all bg-slate-50/50 placeholder:text-slate-300 text-slate-700"
                    />
                  </div>
                </div>
                
                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label htmlFor="password" className="block text-[13px] font-bold text-[#0F172A]">Senha de acesso</label>
                    <a href="#" className="text-[12px] text-slate-400 hover:text-[#F97316] font-medium transition-colors">Esqueceu a senha?</a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      id="password"
                      type="password" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-[54px] pl-11 pr-5 border border-slate-200 rounded-2xl text-[14px] focus:outline-none focus:ring-4 focus:ring-[#F97316]/10 focus:border-[#F97316] transition-all bg-slate-50/50 placeholder:text-slate-300 text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[54px] mt-2 bg-[#F97316] hover:bg-orange-600 text-white rounded-2xl text-[14px] font-headline font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-orange-100 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed shadow-[0_10px_20px_-10px_rgba(249,115,22,0.25)]"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isLoading ? 'Conectando...' : 'Acessar painel'}
              </button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center"><span className="px-4 text-[11px] font-bold text-slate-400 bg-white uppercase tracking-wider">ou acesse com</span></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-[54px] flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-[13px] font-bold text-slate-600 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google Workspace
              </button>

              {/* Back to site */}
              <div className="text-center pt-2">
                <Link to="/" className="text-xs font-bold text-slate-400 hover:text-[#F97316] transition-colors">
                  ← Voltar para a página inicial
                </Link>
              </div>

            </form>

          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;