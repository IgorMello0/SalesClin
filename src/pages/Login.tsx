import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, ArrowRight, Sun, Moon, Sunset, Check, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle, isLoading } = useAuth();
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

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-slate-50 font-body p-4 sm:p-6 md:p-8">
      
      {/* 1. Subtle Dotted Grid Pattern for background depth */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4]" 
        style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />
      
      {/* 2. Soft, rich ambient glows (brand orange and soft blue-violet) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#F97316]/10 blur-[130px] pointer-events-none animate-pulse duration-5000" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-indigo-500/8 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[35vw] h-[35vw] rounded-full bg-[#F97316]/5 blur-[120px] pointer-events-none" />
      
      {/* CENTRAL CONTAINER */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl bg-white rounded-[2.5rem] shadow-[0_30px_80px_-15px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.02)] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[640px]"
      >
        
        {/* LEFT COLUMN: BRANDING & WELCOME AURA */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0B0F19] via-[#0F172A] to-[#1E293B] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden text-white border-r border-white/5">
          
          {/* Glowing brand accents */}
          <div className="absolute top-[-20%] right-[-20%] w-80 h-80 bg-[#F97316]/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-indigo-500/10 rounded-full blur-[70px] pointer-events-none" />
          
          {/* Subtle line mesh */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03]" 
            style={{ backgroundImage: 'radial-gradient(#FFFFFF 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
          />

          <div className="relative z-10 space-y-12">
            {/* Brand Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <img 
                src="/logo-site.png" 
                alt="SalesClin Logo" 
                className="h-9 w-auto brightness-0 invert" 
              />
            </motion.div>
            
            {/* Dynamic Greeting */}
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 text-orange-400 font-bold shadow-sm"
              >
                {GreetingIcon && <GreetingIcon size={14} className="text-orange-400 animate-pulse" />}
                <span className="text-[10px] uppercase tracking-wider">{greeting}!</span>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-3xl sm:text-4xl font-headline font-black text-white tracking-tight leading-tight"
              >
                Que bom ver você <br/> de volta.
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-slate-300 text-sm leading-relaxed font-medium max-w-[280px]"
              >
                Preparamos seu espaço para que o dia de hoje seja produtivo, leve e cheio de resultados.
              </motion.p>
            </div>
          </div>
          
          {/* Glassmorphic indicators card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white/[0.03] backdrop-blur-lg p-6 rounded-2xl border border-white/[0.08] space-y-4 mt-8 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.25)] hover:border-white/[0.15] transition-all duration-300 group"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[9px] font-black text-orange-400 uppercase tracking-[0.2em]">{getFormattedDate()}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-200 font-medium">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Check size={11} className="text-[#F97316] stroke-[3.5]" />
                </div>
                <span>Sua agenda está sincronizada</span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-slate-200 font-medium">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Check size={11} className="text-[#F97316] stroke-[3.5]" />
                </div>
                <span>Funil de vendas ativo</span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-slate-200 font-medium">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <Check size={11} className="text-[#F97316] stroke-[3.5]" />
                </div>
                <span>Faturamento do dia pronto</span>
              </div>
            </div>
          </motion.div>
          
        </div>

        {/* RIGHT COLUMN: CLEAN FORM */}
        <div className="md:col-span-7 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-gradient-to-br from-white via-white to-slate-50/50">
          <div className="max-w-md w-full mx-auto space-y-8">
            
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              {/* Logo for mobile only */}
              <div className="md:hidden mb-6">
                <img 
                  src="/logo-site.png" 
                  alt="SalesClin Logo" 
                  className="h-8 w-auto" 
                />
              </div>
              <h1 className="text-3xl font-headline font-black text-slate-900 tracking-tight mb-2">Faça o seu acesso</h1>
              <p className="text-slate-400 text-sm font-medium">Insira suas credenciais para entrar no painel da clínica.</p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-4">
                {/* Email */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="space-y-2"
                >
                  <label htmlFor="email" className="block text-[13px] font-bold text-slate-700 ml-1">E-mail corporativo</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F97316] transition-colors duration-300">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input 
                      id="email"
                      type="email" 
                      placeholder="nome@clinica.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-[54px] pl-11 pr-5 border border-slate-200 rounded-2xl text-[14px] font-medium text-slate-700 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#F97316]/8 focus:border-[#F97316] transition-all duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                    />
                  </div>
                </motion.div>
                
                {/* Password */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between items-center ml-1">
                    <label htmlFor="password" className="block text-[13px] font-bold text-slate-700">Senha de acesso</label>
                    <a href="#" className="text-[12px] text-slate-400 hover:text-[#F97316] font-bold transition-colors duration-300">Esqueceu a senha?</a>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F97316] transition-colors duration-300">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input 
                      id="password"
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-[54px] pl-11 pr-12 border border-slate-200 rounded-2xl text-[14px] font-medium text-slate-700 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#F97316]/8 focus:border-[#F97316] transition-all duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#F97316] transition-colors duration-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full h-[54px] bg-gradient-to-r from-orange-500 to-[#F97316] hover:from-orange-600 hover:to-orange-500 text-white rounded-2xl text-[14px] font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-85 disabled:cursor-not-allowed shadow-[0_8px_20px_-6px_rgba(249,115,22,0.3)] hover:shadow-[0_12px_24px_-6px_rgba(249,115,22,0.5)] transition-all duration-300"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {isLoading ? 'Conectando...' : 'Acessar painel'}
                </motion.button>
              </motion.div>

              {/* Divider */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="relative py-2"
              >
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center"><span className="px-4 text-[10px] font-black text-slate-400 bg-white uppercase tracking-[0.15em]">ou acesse com</span></div>
              </motion.div>

              {/* Google Button */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="flex justify-center w-full"
              >
                <div className="relative shadow-sm hover:shadow transition-shadow duration-300 rounded-full overflow-hidden border border-slate-100">
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      if (!credentialResponse.credential) {
                        toast({ 
                          title: 'Erro no login com Google', 
                          description: 'Não foi possível obter credencial.', 
                          variant: 'destructive' 
                        });
                        return;
                      }
                      const result = await loginWithGoogle(credentialResponse.credential);
                      if (result.success) {
                        toast({ 
                          title: 'Login com Google realizado!', 
                          description: 'Que bom ter você de volta!' 
                        });
                        navigate('/dashboard');
                      } else {
                        toast({ 
                          title: 'Erro no login com Google', 
                          description: result.error || 'Tente novamente.', 
                          variant: 'destructive' 
                        });
                      }
                    }}
                    onError={() => {
                      toast({ 
                        title: 'Erro no Google', 
                        description: 'Não foi possível conectar com o Google.', 
                        variant: 'destructive' 
                      });
                    }}
                    theme="outline"
                    size="large"
                    width="360"
                    text="continue_with"
                    shape="pill"
                    logo_alignment="left"
                  />
                </div>
              </motion.div>

              {/* Back to site */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="text-center pt-2"
              >
                <Link 
                  to="/" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#F97316] hover:-translate-x-1 transition-all duration-300"
                >
                  <span>← Voltar para a página inicial</span>
                </Link>
              </motion.div>

            </form>

          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;