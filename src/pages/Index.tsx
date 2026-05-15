import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Menu, 
  X, 
  Target, 
  ShieldCheck,
  ArrowRight,
  Plus,
  ArrowUpRight,
  Zap,
  Lock,
  BarChart,
  ChevronLeft,
  ChevronRight,
  Check,
  Instagram,
  MessageCircle
} from 'lucide-react';

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const revealsRef = useRef<(HTMLDivElement | null | HTMLHeadingElement | HTMLParagraphElement)[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const [revenue, setRevenue] = useState(150000);
  const [ticket, setTicket] = useState(5000);

  const totalSales = Math.round(revenue / ticket);
  const neededLeads = Math.round(totalSales / (0.60 * 0.45));

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-body selection:bg-[#F97316]/20 overflow-x-hidden relative">
      {/* Global Editorial Axis Line */}
      <div className="absolute left-8 lg:left-[calc(50%-640px+32px)] top-0 w-[1px] h-full bg-slate-100 z-0 hidden md:block" />

      {/* 1. NAVIGATION */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'py-4 bg-white/80 backdrop-blur-md border-b border-slate-100' : 'py-8 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <Link to="/" className="opacity-90 hover:opacity-100 transition-opacity">
            <img src="/logo-site.png" alt="SalesClin" className="h-10 w-auto object-contain" />
          </Link>

          <div className="flex items-center gap-6 lg:gap-10">
            <div className="hidden md:flex items-center gap-10">
              <a href="#planos" className="text-sm font-semibold text-[#0F172A]/70 hover:text-[#0F172A] transition-colors">Planos</a>
              <a href="#suporte" className="text-sm font-semibold text-[#0F172A]/70 hover:text-[#0F172A] transition-colors">Suporte</a>
              <Link to="/faq" className="text-sm font-semibold text-[#0F172A]/70 hover:text-[#0F172A] transition-colors">FAQ</Link>
              <div className="h-4 w-[1px] bg-slate-200 mx-2" />
              <Link to="/login" className="group relative overflow-hidden bg-[#0F172A] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 hover:scale-105 active:scale-95 shadow-[0_10px_20px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)]">
                <span className="absolute -inset-[1px] bg-[#F97316] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out z-0" />
                <span className="relative flex items-center gap-3 z-10">
                  Acessar Plataforma 
                  <ArrowRight size={14} className="text-[#F97316] group-hover:text-white group-hover:translate-x-1 transition-all duration-500"/>
                </span>
              </Link>
            </div>
            
            <button className="lg:hidden text-[#0F172A]" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HERO — ANCHORED BLUEPRINT */}
      <section className="relative min-h-screen lg:h-screen flex items-center pt-8 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="reveal z-10 py-0" ref={el => revealsRef.current[0] = el}>
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-headline font-black text-[#0F172A] leading-[1] tracking-tighter mb-4 max-w-xl animate-reveal-up">
                CRM feito para clínicas que querem vender mais com <span className="shimmer-text">inteligência comercial.</span>
              </h1>
              <p className="text-lg text-[#64748B] font-medium leading-relaxed mb-6 max-w-md animate-reveal-up" style={{ animationDelay: '200ms' }}>
                A infraestrutura comercial que sua clínica precisa, sem a complexidade que você não quer. Gestão inteligente e sem atritos.
              </p>
              <div className="flex items-center gap-8 mb-10 animate-reveal-up" style={{ animationDelay: '400ms' }}>
                <button className="bg-[#F97316] text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-200 hover:scale-105 transition-all flex items-center gap-3">
                  Começar agora <ArrowRight size={16}/>
                </button>
                <button className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B] hover:text-[#0F172A] transition-all">
                  Por que usar?
                </button>
              </div>
              <div className="flex items-center gap-12 border-l-2 border-slate-100 pl-8 animate-reveal-up" style={{ animationDelay: '600ms' }}>
                {[
                  { icon: <BarChart size={18}/>, t: "Escala", d: "Crescimento real." },
                  { icon: <ShieldCheck size={18}/>, t: "Segurança", d: "Dados blindados." }
                ].map((b, i) => (
                  <div key={i} className="flex flex-col gap-2">
                     <div className="text-[#F97316]">
                       {b.icon}
                     </div>
                     <div>
                       <div className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]">{b.t}</div>
                       <div className="text-[9px] text-slate-400 font-medium">{b.d}</div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative lg:absolute lg:right-[-30%] xl:right-[-20%] lg:w-[70%] h-full flex items-center animate-reveal-left" style={{ animationDelay: '800ms' }}>
               <div className="relative w-full">
                  <div className="absolute -inset-10 bg-gradient-to-tr from-[#F97316]/10 to-blue-500/5 blur-[100px] opacity-40" />
                  <div className="relative bg-white p-3 rounded-[3rem] border border-slate-100 shadow-[0_50px_100px_-20px_rgba(15,23,42,0.15)] transition-transform duration-700">
                    <img src="/dashboard_hero.png" alt="SalesClin Dashboard" className="w-full h-auto rounded-[2.5rem]" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRODUCT SHOWCASE — TECHNICAL DOCK */}
      <section className="py-20 bg-white relative overflow-hidden reveal" ref={el => revealsRef.current[2] = el}>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-slate-100" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-100/30 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-50/50 blur-[100px] rounded-full" />
        <div className="max-w-6xl mx-auto px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-6 animate-reveal-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F97316] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F97316]"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]">Live Product Demo</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-headline font-black text-[#0F172A] mb-4 leading-tight tracking-tighter animate-reveal-up">
            Inteligência comercial completa
          </h2>
          <p className="text-base md:text-lg text-[#64748B] font-medium max-w-xl mx-auto mb-12 animate-reveal-up" style={{ animationDelay: '200ms' }}>
            Cada detalhe pensado para simplificar seus processos e acelerar resultados.
          </p>
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-50 border border-slate-100 mb-16 animate-reveal-up" style={{ animationDelay: '300ms' }}>
            {["Dashboard", "Prospecção", "Funil", "Agenda"].map((name, i) => (
              <button key={i} onClick={() => setActiveModule(i)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModule === i ? 'bg-[#0F172A] text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                {name}
              </button>
            ))}
          </div>
          <div className="relative max-w-5xl mx-auto animate-reveal-up" style={{ animationDelay: '400ms' }}>
            <div className="relative bg-white rounded-[2rem] border border-slate-100 shadow-[0_40px_80px_-15px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="bg-white/70 backdrop-blur-xl border-b border-slate-100 px-6 py-3 flex items-center justify-between relative z-20">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-200" /><div className="w-2.5 h-2.5 rounded-full bg-slate-200" /><div className="w-2.5 h-2.5 rounded-full bg-slate-200" /></div>
                <div className="bg-slate-50 border border-slate-200/50 rounded-lg px-4 py-1 text-[9px] text-slate-400 font-medium w-64 text-center">salesclin.com.br/{['dashboard', 'prospeccao', 'vendas', 'agenda'][activeModule]}</div>
                <div className="w-10 h-6 bg-slate-50 rounded-md border border-slate-100" />
              </div>
              <div className="relative aspect-[16/8.5] bg-slate-50">
                <div className="absolute inset-0 overflow-hidden">
                  {["/dashboard_hero.png", "/prospeccao.png", "/comercial.png", "/agenda.png"].map((img, i) => (
                    <div key={i} className="absolute inset-0 transition-all duration-[1200ms] ease-in-out p-4" style={{ opacity: activeModule === i ? 1 : 0, transform: `scale(${activeModule === i ? 1 : 1.05})`, zIndex: activeModule === i ? 20 : 10, visibility: activeModule === i ? 'visible' : 'hidden' }}>
                      <div className="w-full h-full rounded-2xl overflow-hidden shadow-[0_40px_80px_-15px_rgba(249,115,22,0.15)] border border-orange-100/50 bg-white">
                        <img src={img} className="w-full h-full object-contain object-top" alt={`Module ${i}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveModule(prev => (prev === 0 ? 3 : prev - 1))} className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-[#0F172A] hover:bg-[#F97316] hover:text-white transition-all z-30"><ChevronLeft size={18} /></button>
                <button onClick={() => setActiveModule(prev => (prev === 3 ? 0 : prev + 1))} className="absolute right-8 top-1/2 -translate-y-1/2 w-10 h-10 bg-white shadow-xl rounded-full flex items-center justify-center text-[#0F172A] hover:bg-[#F97316] hover:text-white transition-all z-30"><ChevronRight size={18} /></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SOCIAL PROOF — DUAL ROW MARQUEE */}
      <section className="py-32 bg-slate-50/30 overflow-hidden relative">
        <div className="max-w-6xl mx-auto px-8 mb-16 text-center reveal" ref={el => revealsRef.current[3] = el}>
          <span className="text-[#F97316] font-black text-[10px] uppercase tracking-[0.4em] mb-6 block">Resultados Reais</span>
          <h2 className="text-4xl md:text-6xl font-headline font-black text-[#0F172A] mb-6 tracking-tighter">Quem usa, <span className="text-[#F97316]">vende mais.</span></h2>
        </div>

        {/* Row 1 — Moving Left */}
        <div className="flex mask-fade-edges mb-8">
          <div className="flex gap-6 animate-marquee-left pause-marquee py-4">
            {[...Array(2)].map((_, idx) => (
              <React.Fragment key={idx}>
                {[
                  { name: "Dr. Ricardo Santos", clinic: "Clínica OrthoDesign", text: "O SalesClin mudou o jogo aqui. Aumentamos nossa conversão de implantes em 45% no primeiro trimestre.", img: "https://i.pravatar.cc/150?u=dr1" },
                  { name: "Mariana Costa", clinic: "Aesthetic Center", text: "Finalmente tenho controle total dos meus leads de WhatsApp. Não perdemos mais nenhuma oportunidade.", img: "https://i.pravatar.cc/150?u=dr2" },
                  { name: "Dr. Paulo Vieira", clinic: "Vision Institute", text: "A agenda inteligente é fantástica. Reduzimos o no-show em 30% usando as automações do CRM.", img: "https://i.pravatar.cc/150?u=dr3" },
                  { name: "Dra. Eliana Melo", clinic: "DermaGlow", text: "O melhor investimento que fiz este ano. O suporte é incrível e a plataforma é muito intuitiva.", img: "https://i.pravatar.cc/150?u=dr4" },
                ].map((t, i) => (
                  <div key={i} className="w-[380px] flex-shrink-0 bg-white p-8 rounded-[3rem] border border-[#F97316]/30 shadow-[0_0_20px_rgba(249,115,22,0.05)] hover:border-[#F97316] hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] hover:-translate-y-2 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-6">
                      <img src={t.img} className="w-12 h-12 rounded-full border-2 border-orange-50" alt={t.name} />
                      <div><div className="text-sm font-black text-[#0F172A]">{t.name}</div><div className="text-[10px] font-bold text-[#F97316] uppercase tracking-wider">{t.clinic}</div></div>
                    </div>
                    <p className="text-sm text-[#64748B] font-medium leading-relaxed italic">"{t.text}"</p>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Row 2 — Moving Right */}
        <div className="flex mask-fade-edges">
          <div className="flex gap-6 animate-marquee-right pause-marquee py-4">
            {[...Array(2)].map((_, idx) => (
              <React.Fragment key={idx}>
                {[
                  { name: "Dr. Felipe Neves", clinic: "Neves Odontologia", text: "O sistema de funis é o que faltava para organizar meu comercial. Hoje sei exatamente onde focar.", img: "https://i.pravatar.cc/150?u=dr5" },
                  { name: "Dra. Sarah Lima", clinic: "Lima Cardiovascular", text: "Interface limpa e resultados expressivos. A SalesClin entende o dia a dia de uma clínica.", img: "https://i.pravatar.cc/150?u=dr6" },
                  { name: "Bruno Rocha", clinic: "Rocha & Associados", text: "Gerenciar leads nunca foi tão simples. O dashboard me dá clareza total para tomar decisões.", img: "https://i.pravatar.cc/150?u=dr7" },
                  { name: "Dra. Beatriz Ferraz", clinic: "Ferraz Pediatria", text: "Minha equipe amou a plataforma. Facilitou demais a comunicação com os pais via WhatsApp.", img: "https://i.pravatar.cc/150?u=dr8" },
                ].map((t, i) => (
                  <div key={i} className="w-[380px] flex-shrink-0 bg-white p-8 rounded-[3rem] border border-[#F97316]/30 shadow-[0_0_20px_rgba(249,115,22,0.05)] hover:border-[#F97316] hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] hover:-translate-y-2 transition-all duration-500">
                    <div className="flex items-center gap-4 mb-6">
                      <img src={t.img} className="w-12 h-12 rounded-full border-2 border-orange-50" alt={t.name} />
                      <div><div className="text-sm font-black text-[#0F172A]">{t.name}</div><div className="text-[10px] font-bold text-[#F97316] uppercase tracking-wider">{t.clinic}</div></div>
                    </div>
                    <p className="text-sm text-[#64748B] font-medium leading-relaxed italic">"{t.text}"</p>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 5. METAS — PRECISION CONSOLE */}
      <section id="metas" className="py-40 bg-[#0F172A] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5" />
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            
            {/* Left: Copy and Value Proposition */}
            <div className="reveal" ref={el => revealsRef.current[5] = el}>
              <span className="text-[#F97316] font-black text-[10px] uppercase tracking-[0.4em] mb-6 block">Inteligência Preditiva</span>
              <h2 className="text-5xl md:text-7xl font-headline font-black text-white mb-10 leading-[1] tracking-tighter">
                Engenharia de <br/> <span className="text-[#F97316]">Metas Reais.</span>
              </h2>
              <p className="text-lg text-slate-400 font-medium leading-relaxed mb-12 max-w-lg">
                Pare de "achar" quanto vai faturar. Use nossa engenharia para calcular exatamente o volume de leads e conversão necessários para bater seu próximo recorde.
              </p>
              
              <div className="space-y-6">
                {[
                  { t: "Previsibilidade", d: "Saiba quanto investir para o retorno esperado." },
                  { t: "Otimização de Funil", d: "Identifique gargalos antes que eles virem prejuízo." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#F97316]/20 transition-colors">
                      <Check size={12} className="text-[#F97316]" strokeWidth={4} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white uppercase tracking-wider mb-1">{item.t}</div>
                      <div className="text-xs text-slate-500 font-medium">{item.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: The Pristine White Console (Compact Version) */}
            <div className="reveal" style={{ transitionDelay: '300ms' }} ref={el => revealsRef.current[6] = el}>
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-[#F97316]/40 shadow-[0_0_30px_rgba(249,115,22,0.08)] relative overflow-hidden group hover:border-[#F97316] transition-all duration-500">
                {/* Header Information */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
                    <span className="text-[10px] font-black text-[#0F172A] uppercase tracking-[0.4em]">Metas</span>
                  </div>
                </div>

                <div className="space-y-10 mb-12">
                  {/* Parameter 1: Faturamento */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faturamento Meta</label>
                      <span className="text-3xl font-black text-[#0F172A] tabular-nums tracking-tighter">
                        R$ {revenue.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="relative h-1 w-full bg-slate-100 rounded-full">
                      <div 
                        className="absolute top-0 left-0 h-full bg-[#F97316] rounded-full"
                        style={{ width: `${(revenue / 1000000) * 100}%` }}
                      />
                      <input 
                        type="range" min="10000" max="1000000" step="10000"
                        value={revenue} onChange={(e) => setRevenue(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-[3px] border-[#F97316] shadow-xl pointer-events-none transition-transform duration-300 group-hover:scale-110"
                        style={{ left: `calc(${(revenue / 1000000) * 100}% - 8px)` }}
                      />
                    </div>
                  </div>

                  {/* Parameter 2: Ticket Médio */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</label>
                      <span className="text-3xl font-black text-[#0F172A] tabular-nums tracking-tighter">
                        R$ {ticket.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="relative h-1 w-full bg-slate-100 rounded-full">
                      <div 
                        className="absolute top-0 left-0 h-full bg-[#0F172A] rounded-full"
                        style={{ width: `${(ticket / 20000) * 100}%` }}
                      />
                      <input 
                        type="range" min="500" max="20000" step="500"
                        value={ticket} onChange={(e) => setTicket(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-[3px] border-[#0F172A] shadow-xl pointer-events-none transition-transform duration-300 group-hover:scale-110"
                        style={{ left: `calc(${(ticket / 20000) * 100}% - 8px)` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Scorecards: Compact Style */}
                <div className="grid grid-cols-2 gap-3 mb-10">
                   <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] transition-all hover:bg-white hover:shadow-lg">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Leads Totais</div>
                      <div className="text-4xl font-black text-[#0F172A] tabular-nums tracking-tighter mb-1 text-center">{neededLeads}</div>
                      <div className="text-[8px] font-bold text-[#F97316] uppercase tracking-widest text-center">Volume Estimado</div>
                   </div>
                   <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] transition-all hover:bg-white hover:shadow-lg">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Vendas Reais</div>
                      <div className="text-4xl font-black text-[#0F172A] tabular-nums tracking-tighter mb-1 text-center">{totalSales}</div>
                      <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">Conversão Final</div>
                   </div>
                </div>

                <button className="w-full py-5 rounded-2xl bg-[#0F172A] text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[#F97316] transition-all duration-500 shadow-2xl shadow-slate-300">
                  Gerar Engenharia de Metas
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRICING */}
      <section id="planos" className="py-40 bg-slate-50/50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-8 relative z-10">
          <div className="text-center mb-24 reveal" ref={el => revealsRef.current[7] = el}>
            <span className="text-[#F97316] font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Planos</span>
            <h2 className="text-4xl md:text-6xl font-headline font-black text-[#0F172A] mb-6 tracking-tighter">A estrutura certa para <br/> <span className="text-[#F97316]">cada etapa.</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {[
              { name: "Start", price: "497", features: ["Até 3 Usuários", "Gestão de Leads", "Funil de Vendas", "Suporte Individual"], featured: false },
              { name: "Pro", price: "897", features: ["Usuários Ilimitados", "Integração WhatsApp", "Inteligência de Metas", "Relatórios Custom"], featured: true },
              { name: "Enterprise", price: "Custom", features: ["Multiclínicas", "API Dedicada", "Treinamento Time", "Gestor de Contas"], featured: false }
            ].map((p, i) => (
              <div key={i} className="reveal flex flex-col group" style={{ transitionDelay: `${i * 200}ms` }} ref={el => revealsRef.current[8 + i] = el}>
                <div className={`flex-grow bg-white p-10 rounded-[2.5rem] border transition-all duration-500 flex flex-col ${p.featured ? 'border-[#F97316] shadow-[0_0_40px_rgba(249,115,22,0.15)] scale-105 z-10' : 'border-[#F97316]/20 shadow-[0_0_15px_rgba(249,115,22,0.02)] hover:border-[#F97316] hover:shadow-[0_0_25px_rgba(249,115,22,0.1)] hover:-translate-y-1'}`}>
                  <div className="mb-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">{p.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-[#0F172A] tabular-nums">
                        {p.price === "Custom" ? "Custom" : `R$ ${p.price}`}
                      </span>
                      {p.price !== "Custom" && <span className="text-xs font-bold text-slate-400">/mês</span>}
                    </div>
                  </div>
                  
                  <div className="space-y-5 mb-12 flex-grow">
                    {p.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <Check size={14} className={p.featured ? 'text-[#F97316]' : 'text-slate-300'} strokeWidth={4} />
                        <span className="text-sm text-slate-500 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>
                  
                  <button className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${p.featured ? 'bg-[#F97316] text-white shadow-lg shadow-orange-200 hover:scale-105' : 'bg-[#0F172A] text-white hover:bg-slate-800'}`}>
                    {p.price === "Custom" ? "Falar com Time" : "Escolher Plano"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ABOUT US — EDITORIAL GRID */}
      <section id="sobre" className="py-48 bg-white relative overflow-hidden border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-24 items-start">
            <div className="lg:col-span-7 reveal" ref={el => revealsRef.current[11] = el}>
              <span className="text-[#F97316] font-black text-[9px] uppercase tracking-[0.5em] mb-10 block">Autoridade & Legado</span>
              <h2 className="text-4xl md:text-[80px] font-headline font-black text-[#0F172A] leading-[1] tracking-tighter mb-12">O CRM criado por <br/> quem <span className="text-[#F97316]">domina o <br/> mercado.</span></h2>
              <p className="text-xl text-slate-500 font-medium leading-relaxed italic border-l-4 border-slate-100 pl-8">"O SalesClin foi desenhado para você, dono de clínica, que busca escala através de Inteligência Comercial."</p>
            </div>
            <div className="lg:col-span-5 space-y-16 lg:pt-8">
              <div className="reveal group" ref={el => revealsRef.current[12] = el}>
                 <div className="flex items-center gap-4 mb-8">
                   <div className="h-[1px] w-12 bg-[#F97316]" />
                   <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-[0.2em]">O Método na Prática</h3>
                 </div>
                 <p className="text-slate-500 text-lg leading-relaxed pl-12 border-l-2 border-[#F97316]/10">
                   Empresário com mais de <span className="text-[#0F172A] font-bold text-lg">3 clínicas próprias</span> e faturamento superior a <span className="text-[#0F172A] font-bold text-lg">7 dígitos</span>, Luiz Bucco co-fundou a <span className="text-[#F97316] font-bold">SalesClin</span> com um método validado para clínicas crescerem com inteligência comercial. É também o fundador da <span className="text-[#F97316] font-bold">SalesClin Academy</span>, focada em ensinar outros donos de clínicas a escalarem seus resultados através dos mesmos processos exatos de sucesso.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA — ABACATE PAY STYLE EDITION */}
      <section className="py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#F97316] rounded-[3rem] p-12 md:p-24 text-white relative overflow-hidden reveal group" ref={el => revealsRef.current[16] = el}>
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 blur-[80px] -ml-32 -mb-32 rounded-full" />
            
            <div className="relative z-10 text-center max-w-3xl mx-auto">
              <h2 className="text-5xl md:text-8xl font-headline font-black mb-10 leading-[0.95] tracking-tighter">
                Você chegou <br/> ao fim da página.
              </h2>
              <p className="text-xl md:text-2xl font-medium text-orange-50 mb-14 leading-relaxed">
                Se leu até aqui, é porque sua clínica precisa de escala. Então vamos lá, solicite sua demonstração agora.
              </p>
              <div className="flex justify-center">
                <button className="bg-white text-[#F97316] px-16 py-7 rounded-full font-black text-xs uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-orange-900/30 flex items-center gap-4 group/btn">
                  Quero escalar agora 
                  <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — COMPREHENSIVE EDITORIAL */}
      <footer className="py-8 bg-white border-t border-slate-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-4">
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <img src="/logo-site.png" alt="SalesClin" className="h-8 w-auto opacity-90" />
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xs">
                A infraestrutura comercial definitiva para clínicas de alto ticket. Transformamos leads em faturamento com inteligência e precisão.
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
                {["Funcionalidades", "Simulador de Metas", "Planos e Preços", "Integrações"].map((item, i) => (
                  <li key={i}><a href="#" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            {/* Column 3: Suporte */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-[#0F172A] uppercase tracking-[0.3em]">Suporte</h4>
              <ul className="space-y-2">
                {["Central de Ajuda", "FAQ", "Falar com Consultor", "Comunidade"].map((item, i) => (
                  <li key={i}><a href="#" className="text-sm text-slate-500 font-medium hover:text-[#F97316] transition-colors">{item}</a></li>
                ))}
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

export default Index;
