import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Menu, 
  X, 
  BarChart3, 
  Target, 
  Wallet, 
  ClipboardCheck, 
  FileEdit, 
  Zap, 
  Moon, 
  Users, 
  PhoneCall, 
  BrainCircuit,
  ArrowRight,
  ShieldCheck,
  ZapOff,
  LayoutDashboard,
  Brain,
  ChevronLeft,
  ChevronRight,
  Repeat
} from 'lucide-react';

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const colors = {
    primary: 'hsl(219, 74%, 15%)',
    secondary: 'hsl(25, 95%, 53%)',
    accent: 'hsl(217, 91%, 60%)',
    background: 'hsl(210, 40%, 98%)',
    darkBg: 'hsl(222, 47%, 11%)',
  };

  const navLinks = [
    { name: 'O Sistema', href: '#sistema' },
    { name: 'Funcionalidades', href: '#funcionalidades' },
    { name: 'IA Integrada', href: '#ia' },
    { name: 'Diferencial', href: '#diferencial' },
  ];

  const features = [
    { 
      icon: <Target />, 
      title: "Funis Especializados", 
      desc: "Prospecção, vendas e reengajamento configurados com as etapas e critérios corretos para procedimentos de alto ticket.",
      ui: (
        <div className="mt-6 space-y-2 opacity-60">
          <div className="h-8 bg-blue-500/10 rounded-lg border border-blue-500/20 flex items-center px-3 text-[10px] font-bold text-blue-600">PROSPECÇÃO (42)</div>
          <div className="h-8 bg-orange-500/20 rounded-lg border border-orange-500/30 flex items-center px-3 text-[10px] font-bold text-orange-600 shadow-sm ml-4">AGENDAMENTO (12)</div>
          <div className="h-8 bg-slate-100 rounded-lg border border-slate-200 flex items-center px-3 text-[10px] font-bold text-slate-400 ml-8">FECHAMENTO (05)</div>
        </div>
      )
    },
    { 
      icon: <LayoutDashboard />, 
      title: "Indicadores Estratégicos", 
      desc: "Volume de leads, taxa de agendamento, comparecimento e conversão por etapa — visíveis em tempo real.",
      ui: (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
             <div className="text-[10px] text-slate-400 font-bold">CONVERSÃO</div>
             <div className="text-sm font-bold text-emerald-500">28.4% ↑</div>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
             <div className="text-[10px] text-slate-400 font-bold">LEADS</div>
             <div className="text-sm font-bold text-[var(--primary)]">1,240</div>
          </div>
        </div>
      )
    },
    { 
      icon: <Wallet />, 
      title: "Gestão Financeira Comercial", 
      desc: "Ticket médio, receita por canal e evolução de vendas integrados ao funil. Dados para decisão estratégica.",
      ui: (
        <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] text-emerald-700 font-bold uppercase">Ticket Médio</div>
              <div className="text-lg font-bold text-emerald-900 leading-none">R$ 12.450</div>
            </div>
            <BarChart3 className="text-emerald-500 w-5 h-5" />
          </div>
        </div>
      )
    },
    { 
      icon: <ClipboardCheck />, 
      title: "Cadência de Contatos", 
      desc: "Tarefas e tentativas de contato organizadas automaticamente. Nenhum lead fica sem resposta.",
      ui: (
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span className="text-[10px] font-medium">Ligar p/ Maria Silva (Follow-up)</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-medium">Enviar contrato Dr. Arthur</span>
          </div>
        </div>
      )
    },
    { 
      icon: <FileEdit />, 
      title: "Controle de Propostas", 
      desc: "Múltiplas propostas por paciente com registro de justificativas. Aprovações configuráveis por hierarquia.",
      ui: (
        <div className="mt-6 bg-slate-900 rounded-xl p-3 border border-white/10">
          <div className="flex justify-between mb-2">
            <span className="text-[8px] text-slate-400 font-bold">PROPOSTA #A12</span>
            <span className="text-[8px] text-orange-400 font-bold uppercase tracking-tighter">Aguardando Aprovação</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 w-3/4" />
          </div>
        </div>
      )
    },
    { 
      icon: <Zap />, 
      title: "Adoção Real pela Equipe", 
      desc: "Interface projetada para uso diário. Sem complexidade desnecessária que leve ao abandono da ferramenta.",
      ui: (
        <div className="mt-6 flex justify-center">
          <div className="px-4 py-2 bg-white rounded-full shadow-lg border border-slate-100 flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-white w-2.5 h-2.5" />
            </div>
            <span className="text-[10px] font-bold text-slate-600">Interface Intuitiva</span>
          </div>
        </div>
      )
    },
  ];

  const nextFeature = () => setActiveIndex((prev) => (prev + 1) % features.length);
  const prevFeature = () => setActiveIndex((prev) => (prev - 1 + features.length) % features.length);

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#F8FAFC] relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Manrope:wght@600;700;800&display=swap');
        
        :root {
          --primary: ${colors.primary};
          --secondary: ${colors.secondary};
          --accent: ${colors.accent};
        }

        .font-headline { font-family: 'Manrope', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }

        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .btn-primary {
          background: var(--secondary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.4);
        }

        .text-gradient {
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* 3D Carousel Effects */
        .carousel-container {
          perspective: 1200px;
          overflow: visible;
        }

        .carousel-card {
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }

        /* BACKGROUND ELEMENTS */
        .bg-grid {
          background-size: 50px 50px;
          background-image: linear-gradient(to right, rgba(15, 23, 42, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(15, 23, 42, 0.03) 1px, transparent 1px);
        }

        .noise-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background-image: url("https://www.transparenttextures.com/patterns/natural-paper.png");
          opacity: 0.2;
          pointer-events: none;
          z-index: 1;
        }

        .aurora-blob {
          position: absolute;
          filter: blur(120px);
          border-radius: 100%;
          z-index: 0;
          opacity: 0.15;
          mix-blend-mode: multiply;
          animation: float 20s infinite alternate;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 50px) scale(1.1); }
        }

        html { scroll-behavior: smooth; }
      `}</style>

      {/* Global Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid" />
        <div className="noise-overlay" />
        {/* Blobs de Cor para Profundidade */}
        <div className="aurora-blob bg-blue-400 w-[500px] h-[500px] -top-24 -left-24" />
        <div className="aurora-blob bg-orange-300 w-[600px] h-[600px] top-1/2 -right-24" style={{ animationDelay: '-5s' }} />
        <div className="aurora-blob bg-blue-300 w-[400px] h-[400px] bottom-0 left-1/4" style={{ animationDelay: '-10s' }} />
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-6'}`}>
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
            <div className={`glass-card rounded-2xl px-6 py-3 flex items-center justify-between border-slate-200/50 shadow-sm`}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                  <Target className="text-white w-5 h-5" />
                </div>
                <span className="font-headline font-extrabold text-2xl tracking-tight text-[var(--primary)]">SalesClin</span>
              </div>

              <div className="hidden lg:flex items-center gap-8">
                {navLinks.map((link) => (
                  <a key={link.name} href={link.href} className="font-body font-semibold text-slate-600 hover:text-[var(--primary)] transition-colors cursor-pointer text-sm">
                    {link.name}
                  </a>
                ))}
              </div>

              <div className="hidden md:flex items-center gap-4">
                <Link to="/login" className="text-slate-600 font-headline font-bold text-sm hover:text-[var(--primary)] transition-colors px-4">
                  Acessar Conta
                </Link>
                <button className="btn-primary text-white px-6 py-3 rounded-xl font-headline font-bold text-sm cursor-pointer shadow-lg shadow-orange-500/10">
                  Agendar Demo
                </button>
              </div>

              <div className="lg:hidden flex items-center gap-2">
                <Link to="/login" className="text-xs font-bold text-slate-700 px-3">Entrar</Link>
                <button className="text-slate-900 p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  {isMenuOpen ? <X /> : <Menu />}
                </button>
              </div>
            </div>
            
            {/* Mobile Menu */}
            {isMenuOpen && (
              <div className="mt-2 glass-card rounded-xl p-4 flex flex-col gap-4 lg:hidden shadow-lg border border-slate-200/50 absolute w-[calc(100%-2rem)]">
                {navLinks.map((link) => (
                  <a key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)} className="font-body font-medium text-slate-700 hover:text-[var(--primary)] py-2 border-b border-slate-100 last:border-0">
                    {link.name}
                  </a>
                ))}
                <button className="btn-primary text-white px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-lg w-full mt-2">
                  Agendar Demo
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-44 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 text-center">
            <div className="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full border border-slate-200 shadow-sm mb-8">
              <span className="w-2 h-2 bg-[var(--secondary)] rounded-full animate-pulse" />
              <span className="text-xs font-headline font-bold text-slate-700 uppercase tracking-widest">Metodologia para Alto Ticket</span>
            </div>

            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-[var(--primary)] mb-8 leading-[1.1] max-w-5xl mx-auto tracking-tight">
              O sistema de gestão comercial que transforma <span className="text-gradient">leads em pacientes</span>
            </h1>

            <p className="font-body text-lg md:text-xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              SalesClin é o único CRM construído com metodologia validada para clínicas que operam com procedimentos de alto valor. Funis especializados, IA integrada e indicadores em tempo real.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-24">
              <button className="btn-primary w-full sm:w-auto text-white px-10 py-5 rounded-2xl font-headline font-bold text-lg flex items-center justify-center gap-2 shadow-2xl shadow-orange-500/20 cursor-pointer">
                Solicitar demonstração
              </button>
              <button className="w-full sm:w-auto glass-card text-slate-700 px-10 py-5 rounded-2xl font-headline font-bold text-lg flex items-center justify-center gap-2 hover:bg-white transition-all cursor-pointer border-slate-200">
                Como funciona <ArrowRight className="w-5 h-5 text-[var(--secondary)]" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                { label: 'Aumento médio na conversão', value: '3×' },
                { label: 'IA operando no funil', value: '24/7' },
                { label: 'Leads sem acompanhamento', value: '0' },
              ].map((metric, idx) => (
                <div key={idx} className="glass-card p-10 rounded-[2.5rem] flex flex-col items-center border-slate-200/50 hover:shadow-xl transition-all">
                  <span className="text-5xl font-headline font-extrabold text-[var(--primary)] mb-3">{metric.value}</span>
                  <p className="text-sm font-body font-bold text-slate-500 uppercase tracking-widest leading-snug">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section id="sistema" className="py-32 bg-[var(--primary)] relative overflow-hidden rounded-[4rem] mx-6 md:mx-12 lg:mx-16">
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')]" />
          
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 relative">
            <div className="max-w-4xl mb-20">
              <span className="text-[var(--secondary)] font-headline font-bold text-sm uppercase tracking-[0.2em] mb-6 block">O problema real</span>
              <h2 className="text-white font-headline text-4xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">O gargalo não está na captação. Está no processo comercial.</h2>
              <p className="text-slate-300 font-body text-xl leading-relaxed">Clínicas que investem consistentemente em mídia paga continuam perdendo receita por ausência de processo. Leads somem no WhatsApp. Oportunidades não são registradas. A equipe opera sem cadência.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { icon: <ZapOff />, title: "Ausência de follow-up estruturado", desc: "Sem cadência definida, o lead esfria entre o primeiro contato e o agendamento. O investimento em mídia é desperdiçado por falta de processo." },
                { icon: <BarChart3 />, title: "Decisões baseadas em percepção", desc: "Sem indicadores de conversão por etapa, é impossível identificar onde o funil quebra. Ajustes se tornam tentativas cegas." },
                { icon: <ShieldCheck />, title: "Desconto sem governança", desc: "Concessões feitas sem critério corroem o ticket médio de forma silenciosa. Sem registro e sem aprovação, o dono perde o controle." },
                { icon: <Users />, title: "Processo que depende de pessoas", desc: "Quando o processo existe apenas na cabeça do vendedor, a saída de um colaborador compromete toda a sua operação comercial." },
              ].map((card, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] backdrop-blur-md group hover:bg-white/10 transition-all duration-500">
                  <div className="w-14 h-14 bg-[var(--secondary)]/20 rounded-2xl flex items-center justify-center text-[var(--secondary)] mb-8 group-hover:scale-110 transition-transform shadow-inner">
                    {card.icon}
                  </div>
                  <h3 className="text-white font-headline font-bold text-2xl mb-4 leading-tight">{card.title}</h3>
                  <p className="text-slate-400 font-body text-base leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section - CURVED 3D CAROUSEL */}
        <section id="funcionalidades" className="py-32 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 relative z-10">
            <div className="text-center mb-24">
              <span className="text-[var(--accent)] font-headline font-bold text-sm uppercase tracking-[0.2em] mb-6 block">O que você controla</span>
              <h2 className="text-[var(--primary)] font-headline text-4xl md:text-6xl font-bold mb-8 tracking-tight max-w-5xl mx-auto leading-tight">Gestão comercial completa, estruturada para o ciclo de vendas de clínicas.</h2>
              <p className="text-slate-500 font-body text-xl max-w-4xl mx-auto leading-relaxed italic font-medium">Use as setas para explorar o método SalesClin.</p>
            </div>

            {/* Curved Carousel Wrapper */}
            <div className="carousel-container relative h-[550px] flex items-center justify-center">
              
              {/* Features Array */}
              <div className="relative w-full h-full flex items-center justify-center">
                {features.map((feature, idx) => {
                  const offset = idx - activeIndex;
                  let normalizedOffset = offset;
                  if (offset > features.length / 2) normalizedOffset -= features.length;
                  if (offset < -features.length / 2) normalizedOffset += features.length;
                  
                  const isActive = idx === activeIndex;
                  const zIndex = 100 - Math.abs(normalizedOffset) * 10;
                  const opacity = Math.max(0, 1 - Math.abs(normalizedOffset) * 0.45);
                  const scale = 1 - Math.abs(normalizedOffset) * 0.15;
                  const translateX = normalizedOffset * 340;
                  const rotateY = normalizedOffset * -25;
                  const translateZ = Math.abs(normalizedOffset) * -250;

                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`absolute w-[340px] md:w-[420px] carousel-card cursor-pointer p-8 md:p-12 rounded-[3.5rem] glass-card border-slate-200 shadow-2xl overflow-hidden ${isActive ? 'ring-2 ring-[var(--secondary)]/20 shadow-[var(--primary)]/5' : 'pointer-events-none md:pointer-events-auto opacity-40'}`}
                      style={{
                        transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                        zIndex: zIndex,
                        opacity: opacity,
                        visibility: Math.abs(normalizedOffset) > 2 ? 'hidden' : 'visible'
                      }}
                    >
                      <div className="relative z-10">
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-inner transition-colors duration-500 ${isActive ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {feature.icon}
                        </div>
                        <h3 className="text-[var(--primary)] font-headline font-bold text-2xl mb-4 leading-tight">{feature.title}</h3>
                        <p className="text-slate-500 font-body text-base leading-relaxed mb-6 font-medium">{feature.desc}</p>
                        
                        {/* UI Context Preview */}
                        <div className={`transition-all duration-700 delay-150 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                          {feature.ui}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="absolute -bottom-10 flex items-center gap-6">
                <button 
                  onClick={prevFeature}
                  className="w-14 h-14 rounded-full glass-card border-slate-200 flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all shadow-lg cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                <div className="flex gap-2">
                  {features.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-8 bg-[var(--secondary)]' : 'w-2 bg-slate-300'}`}
                    />
                  ))}
                </div>

                <button 
                  onClick={nextFeature}
                  className="w-14 h-14 rounded-full glass-card border-slate-200 flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all shadow-lg cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* IA Section */}
        <section id="ia" className="py-32 bg-slate-900 relative overflow-hidden rounded-[4rem] mx-6 md:mx-12 lg:mx-16 mb-20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-30" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] -mr-48 -mb-48" />
          
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 relative">
            <div className="max-w-3xl mb-24">
              <span className="text-[var(--accent)] font-headline font-bold text-sm uppercase tracking-[0.2em] mb-6 block">Inteligência Artificial Integrada</span>
              <h2 className="text-white font-headline text-4xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">A IA trabalha enquanto sua equipe descansa.</h2>
              <p className="text-slate-400 font-body text-xl leading-relaxed font-medium">Não se trata de um chatbot genérico. É uma IA treinada nas especificidades do ciclo de vendas de clínicas de alta performance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {[
                { icon: <Moon />, title: "Atendimento 24/7", desc: "A IA qualifica leads fora do horário comercial, mantém o interesse ativo e realiza o agendamento sem intervenção humana." },
                { icon: <Repeat />, title: "Reengajamento Automático", desc: "Leads inativos entram automaticamente em régua de follow-up conduzida pela IA, com abordagem calibrada." },
                { icon: <PhoneCall />, title: "Análise de Conversas", desc: "A IA avalia a qualidade das interações dos consultores, identifica quedas na conversão e sinaliza falhas no processo." },
                { icon: <Brain />, title: "Metodologia Embutida", desc: "O sistema já vem configurado com roteiros e fluxos validados. Sem necessidade de construir processos do zero." },
              ].map((ai, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-8 p-10 rounded-[3rem] bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all group">
                  <div className="flex-shrink-0 w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                    {ai.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-headline font-bold text-2xl mb-4 leading-tight">{ai.title}</h3>
                    <p className="text-slate-400 font-body text-base leading-relaxed font-medium">{ai.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Differential Section */}
        <section id="diferencial" className="py-32">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1">
               <span className="text-[var(--secondary)] font-headline font-bold text-sm uppercase tracking-[0.2em] mb-6 block">Diferencial</span>
              <h2 className="text-[var(--primary)] font-headline text-4xl md:text-6xl font-bold mb-8 leading-[1.1] tracking-tight">Um CRM vazio não resolve problema de processo.</h2>
              <p className="text-slate-600 font-body text-xl mb-12 leading-relaxed font-medium">A maioria das ferramentas entrega infraestrutura. SalesClin entrega metodologia. O sistema já chega configurado com o processo comercial validado em clínicas de alto faturamento.</p>
              
              <div className="space-y-8">
                {[
                  { title: "Processo pré-configurado", text: "Específico para implantodontia e estética avançada." },
                  { title: "Foco comercial exclusivo", text: "Focado na jornada de venda, não apenas no prontuário." },
                  { title: "Governança e Controle", text: "Controle real sobre concessões, aprovações e margem." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="text-[var(--secondary)] w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-headline font-bold text-xl text-[var(--primary)]">{item.title}</h4>
                      <p className="text-slate-500 font-body font-medium">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-1 w-full">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary)] to-[var(--accent)] rounded-[3rem] rotate-3 blur-sm transition-transform group-hover:rotate-6 duration-500" />
                <div className="relative bg-slate-950 p-1 rounded-[3rem] shadow-2xl overflow-hidden">
                  <div className="bg-slate-900 rounded-[2.8rem] p-12 aspect-[4/5] flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-white/10 rounded-3xl backdrop-blur-xl flex items-center justify-center mb-8 border border-white/10">
                      <BrainCircuit className="w-12 h-12 text-[var(--secondary)]" />
                    </div>
                    <h4 className="font-headline font-bold text-3xl text-white mb-4">Método SalesClin</h4>
                    <p className="text-slate-400 font-body text-lg font-medium leading-relaxed">Pare de tentar descobrir o que funciona. Aplique o que já foi validado pelo mercado.</p>
                    <div className="mt-12 grid grid-cols-2 gap-4 w-full">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-[var(--secondary)] font-headline font-bold text-2xl mb-1">+40%</div>
                        <div className="text-slate-500 text-xs uppercase font-bold tracking-tighter">Conversão</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-[var(--accent)] font-headline font-bold text-2xl mb-1">-65%</div>
                        <div className="text-slate-500 text-xs uppercase font-bold tracking-tighter">Lead Lost</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-32 px-6 md:px-12 lg:px-16">
          <div className="max-w-6xl mx-auto bg-[var(--primary)] rounded-[5rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--secondary)]/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--accent)]/15 rounded-full blur-[120px]" />
            
            <div className="relative z-10">
              <h2 className="text-white font-headline text-4xl md:text-6xl font-bold mb-8 max-w-4xl mx-auto leading-tight">Sua clínica precisa de processo. Não de mais leads.</h2>
              <p className="text-slate-300 font-body text-xl mb-12 max-w-3xl mx-auto leading-relaxed font-medium">Agende uma demonstração personalizada e veja o SalesClin operando na realidade da sua clínica.</p>
              
              <button className="btn-primary text-white px-12 py-6 rounded-3xl font-headline font-extrabold text-2xl shadow-2xl cursor-pointer">
                Solicitar demonstração
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-20 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                  <Target className="text-white w-6 h-6" />
                </div>
                <span className="font-headline font-bold text-2xl text-[var(--primary)]">SalesClin</span>
              </div>
              
              <div className="flex gap-10">
                {navLinks.map(link => (
                  <a key={link.name} href={link.href} className="font-body font-bold text-slate-500 hover:text-[var(--primary)] transition-colors text-sm uppercase tracking-widest">
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
            
            <hr className="border-slate-200 mb-12" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <p className="font-body text-slate-500 text-sm font-semibold tracking-wide">
                SalesClin — CRM especializado em clínicas de alto ticket · Todos os direitos reservados
              </p>
              
              <div className="flex items-center gap-6">
                 <button className="text-slate-400 hover:text-[var(--primary)] transition-colors" aria-label="LinkedIn"><Users size={22}/></button>
                 <button className="text-slate-400 hover:text-[var(--primary)] transition-colors" aria-label="Website"><Target size={22}/></button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
