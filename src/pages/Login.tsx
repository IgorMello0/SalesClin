import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, ArrowLeft, TrendingUp, Users, Target } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      const userType = localStorage.getItem('userType');
      toast({
        title: 'Login realizado com sucesso!',
        description: `Bem-vindo ao sistema${userType === 'user' ? ' (Usuário)' : ' (Profissional)'}!`,
      });
      navigate('/dashboard');
    } else {
      toast({
        title: 'Erro no login',
        description: result.error || 'Email ou senha incorretos. Verifique suas credenciais e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const stats = [
    { icon: TrendingUp, label: 'Conversão média', value: '+38%' },
    { icon: Users, label: 'Profissionais ativos', value: '2.400+' },
    { icon: Target, label: 'Leads gerenciados', value: '120k+' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-center px-12 py-8"
        style={{
          background: 'linear-gradient(135deg, hsl(219,74%,12%) 0%, hsl(219,74%,20%) 50%, hsl(25,95%,40%) 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, hsl(25,95%,53%) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-40 -right-20 w-[520px] h-[520px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, hsl(217,91%,60%) 0%, transparent 70%)' }}
          />
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* All content — centered block, logo aligned with headline */}
        <div className="relative z-10 space-y-8">

          {/* Logo */}
          <Link to="/">
            <img
              src="/logo-site.png"
              alt="SalesClin Logo"
              className="h-14 w-auto object-contain brightness-0 invert"
            />
          </Link>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold text-white leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Gerencie seus leads<br />
              <span style={{ color: 'hsl(25,95%,63%)' }}>com inteligência.</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              O CRM especializado em clínicas e consultórios que transforma contatos em pacientes fidelizados.
            </p>
          </div>

          {/* Stats + Quote — single glass card */}
          <div
            className="rounded-2xl p-5 space-y-5"
            style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="space-y-1.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-xl font-extrabold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>{value}</p>
                  <p className="text-white/60 text-xs leading-snug">{label}</p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.10)' }} />

            {/* Quote */}
            <div>
              <p className="text-white/80 text-sm italic leading-relaxed">
                "O SalesClin transformou a forma como gerenciamos nossos pacientes. Nossa conversão aumentou 42% em 3 meses."
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: 'hsl(25,95%,53%)' }}>
                  DM
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">Dra. Marina Costa</p>
                  <p className="text-white/50 text-xs">Clínica Estética São Paulo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16 bg-[hsl(210,40%,98%)]">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <Link to="/">
              <img src="/logo-site.png" alt="SalesClin Logo" className="h-12 w-auto object-contain" />
            </Link>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold" style={{ color: 'hsl(219,74%,15%)', fontFamily: 'Manrope, sans-serif' }}>
              Bem-vindo de volta
            </h2>
            <p className="text-[hsl(215,16%,47%)]">
              Acesse sua área como profissional ou usuário
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold" style={{ color: 'hsl(217,33%,17%)' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215,16%,55%)' }} />
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'hsl(210,40%,96%)',
                    border: '1.5px solid hsl(214,32%,88%)',
                    color: 'hsl(217,33%,17%)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(219,74%,15%)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(214,32%,88%)'; e.currentTarget.style.background = 'hsl(210,40%,96%)'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold" style={{ color: 'hsl(217,33%,17%)' }}>
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(215,16%,55%)' }} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    background: 'hsl(210,40%,96%)',
                    border: '1.5px solid hsl(214,32%,88%)',
                    color: 'hsl(217,33%,17%)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(219,74%,15%)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(214,32%,88%)'; e.currentTarget.style.background = 'hsl(210,40%,96%)'; }}
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: isLoading
                  ? 'hsl(219,74%,20%)'
                  : 'linear-gradient(135deg, hsl(219,74%,15%) 0%, hsl(219,74%,22%) 100%)',
                color: '#fff',
                fontFamily: 'Manrope, sans-serif',
                boxShadow: '0 4px 20px rgba(10,31,68,0.3)',
              }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isLoading ? 'Entrando...' : 'Entrar no sistema'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ height: '1px', background: 'hsl(214,32%,91%)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs" style={{ background: 'hsl(210,40%,98%)', color: 'hsl(215,16%,55%)' }}>
                Novo por aqui?
              </span>
            </div>
          </div>

          {/* Sign up link */}
          <Link
            to="/signup"
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            style={{
              border: '1.5px solid hsl(214,32%,88%)',
              color: 'hsl(219,74%,15%)',
              background: 'transparent',
              fontFamily: 'Manrope, sans-serif',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(219,74%,30%)'; e.currentTarget.style.background = 'hsl(219,74%,97%)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(214,32%,88%)'; e.currentTarget.style.background = 'transparent'; }}
          >
            Criar minha conta grátis
          </Link>

          {/* Back */}
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs transition-colors group"
              style={{ color: 'hsl(215,16%,55%)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(219,74%,15%)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(215,16%,55%)'; }}
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;