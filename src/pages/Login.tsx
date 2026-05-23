import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Mail, Lock, ArrowRight, Check, Eye, EyeOff, 
  Calendar, Filter, TrendingUp, DollarSign, MessageSquare, 
  Sparkles, Database, Code, Zap, Server, Bot 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';

const leftBadges = [
  { id: 1, text: 'Agenda Inteligente', icon: Calendar, top: '15%', left: '8%', path: 'M 33 40 C 22 40, 20 15, 8 15' },
  { id: 2, text: 'Funil de Vendas', icon: Filter, top: '30%', left: '5%', path: 'M 33 45 C 22 45, 18 30, 5 30' },
  { id: 3, text: 'Gestão Comercial', icon: TrendingUp, top: '45%', left: '8%', path: 'M 33 50 C 22 50, 18 45, 8 45' },
  { id: 4, text: 'Faturamento do Dia', icon: DollarSign, top: '60%', left: '4%', path: 'M 33 55 C 22 55, 16 60, 4 60' },
  { id: 5, text: 'Avisos WhatsApp', icon: MessageSquare, top: '75%', left: '9%', path: 'M 33 60 C 22 60, 18 75, 9 75' }
];

const rightBadges = [
  { id: 1, text: 'WhatsApp Cloud', icon: MessageSquare, top: '10%', right: '9%', path: 'M 67 35 C 78 35, 80 10, 91 10' },
  { id: 2, text: 'Agentes de IA', icon: Bot, top: '22%', right: '5%', path: 'M 67 40 C 78 40, 82 22, 95 22' },
  { id: 3, text: 'Prisma Client', icon: Database, top: '34%', right: '10%', path: 'M 67 45 C 78 45, 80 34, 90 34' },
  { id: 4, text: 'React & TS', icon: Code, top: '46%', right: '4%', path: 'M 67 50 C 78 50, 82 46, 96 46' },
  { id: 5, text: 'Vite Bundler', icon: Zap, top: '58%', right: '11%', path: 'M 67 55 C 78 55, 80 58, 89 58' },
  { id: 6, text: 'PostgreSQL', icon: Server, top: '70%', right: '6%', path: 'M 67 60 C 78 60, 82 70, 94 70' },
  { id: 7, text: 'Google Calendar', icon: Calendar, top: '82%', right: '10%', path: 'M 67 65 C 78 65, 80 82, 90 82' }
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    <div className="min-h-screen relative overflow-hidden bg-[#FAF9F6] font-body flex items-center justify-center">
      
      {/* 1. Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.25]" 
        style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
      />
      
      {/* 2. Vibrant Orange Gradient Area at the bottom of the screen (Abacatepay style) */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-[#F97316]/75 via-[#F97316]/30 to-transparent pointer-events-none" />

      {/* 3. Central responsive container containing both layout sides and the login card */}
      <div className="w-full max-w-7xl min-h-screen mx-auto relative flex items-center justify-center px-4 sm:px-6 lg:px-8">
        
        {/* SVG CONNECTIONS (Mindmap paths) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="leftLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="rightLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <style>{`
            @keyframes dashflow {
              to {
                stroke-dashoffset: -40;
              }
            }
            .animated-path {
              stroke-dasharray: 6, 6;
              animation: dashflow 5s linear infinite;
            }
          `}</style>
          
          {/* Left lines */}
          {leftBadges.map((badge) => (
            <path 
              key={`line-left-${badge.id}`} 
              d={badge.path} 
              fill="none" 
              stroke="url(#leftLineGradient)" 
              strokeWidth="1.2"
              className="animated-path"
            />
          ))}

          {/* Right lines */}
          {rightBadges.map((badge) => (
            <path 
              key={`line-right-${badge.id}`} 
              d={badge.path} 
              fill="none" 
              stroke="url(#rightLineGradient)" 
              strokeWidth="1.2"
              className="animated-path"
            />
          ))}
        </svg>

        {/* LEFT FLOATING BADGES */}
        <div className="absolute inset-y-0 left-0 w-full pointer-events-none hidden lg:block">
          {leftBadges.map((badge) => {
            const IconComponent = badge.icon;
            return (
              <motion.div
                key={`badge-left-${badge.id}`}
                style={{ top: badge.top, left: badge.left }}
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 4 + badge.id,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute px-4 py-2.5 bg-white rounded-full border border-slate-100/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] flex items-center gap-2.5 hover:shadow-md hover:border-orange-100 hover:scale-105 transition-all duration-300 pointer-events-auto cursor-default group"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-50 text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-colors duration-300">
                  <IconComponent size={11} className="stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 tracking-tight">{badge.text}</span>
              </motion.div>
            );
          })}
        </div>

        {/* RIGHT FLOATING BADGES */}
        <div className="absolute inset-y-0 right-0 w-full pointer-events-none hidden lg:block">
          {rightBadges.map((badge) => {
            const IconComponent = badge.icon;
            return (
              <motion.div
                key={`badge-right-${badge.id}`}
                style={{ top: badge.top, right: badge.right }}
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 4 + badge.id,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute px-4 py-2.5 bg-white rounded-full border border-slate-100/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] flex items-center gap-2.5 hover:shadow-md hover:border-orange-100 hover:scale-105 transition-all duration-300 pointer-events-auto cursor-default group"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-50 text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-colors duration-300">
                  <IconComponent size={11} className="stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 tracking-tight">{badge.text}</span>
              </motion.div>
            );
          })}
        </div>

        {/* CENTRAL LOGIN CARD */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[440px] bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-[0_30px_70px_-20px_rgba(120,40,0,0.08),0_0_0_1px_rgba(15,23,42,0.03)] border border-slate-100/60 p-8 sm:p-10 flex flex-col justify-center gap-6"
        >
          {/* Logo */}
          <div className="flex justify-center mb-1">
            <img 
              src="/logo-site.png" 
              alt="SalesClin Logo" 
              className="h-9 w-auto" 
            />
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-headline font-black text-slate-800 tracking-tight">
              Boas vindas ao <span className="text-[#F97316]">SalesClin.</span>
            </h1>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed px-4">
              Preparamos seu espaço para que o dia de hoje seja produtivo, leve e cheio de resultados.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Google Sign-In Button */}
            <div className="flex justify-center w-full">
              <div className="relative w-full shadow-sm hover:shadow transition-shadow duration-300 rounded-full overflow-hidden border border-slate-200/80 bg-white">
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
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
              <div className="relative flex justify-center">
                <span className="px-4 text-[10px] font-black text-slate-400 bg-white uppercase tracking-[0.15em]">
                  ou acesse com e-mail
                </span>
              </div>
            </div>

            {/* Inputs Group */}
            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[12px] font-bold text-slate-600 ml-1">E-mail de acesso</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F97316] transition-colors duration-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input 
                    id="email"
                    type="email" 
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-[50px] pl-11 pr-5 border border-slate-200 rounded-2xl text-[13px] font-medium text-slate-700 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#F97316]/5 focus:border-[#F97316] transition-all duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label htmlFor="password" className="block text-[12px] font-bold text-slate-600">Senha de acesso</label>
                  <a href="#" className="text-[11px] text-slate-400 hover:text-[#F97316] font-bold transition-colors duration-300">Esqueceu a senha?</a>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#F97316] transition-colors duration-300">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input 
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-[50px] pl-11 pr-12 border border-slate-200 rounded-2xl text-[13px] font-medium text-slate-700 bg-white placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#F97316]/5 focus:border-[#F97316] transition-all duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.01)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#F97316] transition-colors duration-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full h-[50px] bg-[#F97316] hover:bg-orange-600 text-white rounded-2xl text-[14px] font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-85 disabled:cursor-not-allowed shadow-[0_8px_20px_-6px_rgba(249,115,22,0.3)] hover:shadow-[0_12px_24px_-6px_rgba(249,115,22,0.5)] transition-all duration-300 mt-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {isLoading ? 'Acessando...' : 'Acessar painel'}
            </motion.button>

            {/* Terms Consent and Back Link */}
            <div className="space-y-4 pt-2">
              <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium px-2">
                Ao fazer login, você concorda com nossos{' '}
                <a href="#" className="underline text-slate-500 hover:text-[#F97316] transition-colors">
                  termos e condições
                </a>
                .
              </p>
              
              <div className="text-center">
                <Link 
                  to="/" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#F97316] hover:-translate-x-1 transition-all duration-300"
                >
                  <span>← Voltar para a página inicial</span>
                </Link>
              </div>
            </div>

          </form>
        </motion.div>

      </div>
    </div>
  );
};

export default Login;