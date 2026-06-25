import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
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
  MessageCircle,
  LayoutDashboard,
  KanbanSquare,
  Calendar,
  LineChart,
  Users,
  Activity,
  Star
} from 'lucide-react';
import { SiteNavbar } from '@/components/SiteNavbar';
import { SiteFooter } from '@/components/SiteFooter';
import { InteractiveAppBrowser } from '@/components/landing/InteractiveAppBrowser';


const Index = () => {
  const [activeModule, setActiveModule] = useState(0);

  const [revenue, setRevenue] = useState(150000);
  const [ticket, setTicket] = useState(5000);

  useEffect(() => {
    const root = window.document.documentElement;
    const savedTheme = localStorage.getItem('theme');

    root.classList.remove('dark');
    root.classList.add('light');

    return () => {
      root.classList.remove('light', 'dark');
      root.classList.add(savedTheme === 'dark' ? 'dark' : 'light');
    };
  }, []);

  const totalSales = Math.round(revenue / ticket);
  const neededLeads = Math.round(totalSales / (0.60 * 0.45));

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-body selection:bg-[#F97316]/20 overflow-x-hidden w-full max-w-[100vw] relative">
      {/* Global Editorial Axis Line */}
      <div className="absolute left-8 lg:left-[calc(50%-640px+32px)] top-0 w-[1px] h-full bg-slate-100 z-0 hidden md:block" />

      {/* SHARED SITE NAVBAR */}
      <SiteNavbar />

      {/* 2. HERO — ANCHORED BLUEPRINT */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-28 pb-16 lg:pt-24 lg:pb-20">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.86fr)_minmax(540px,1.14fr)] gap-12 lg:gap-14 items-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.2 }
                }
              }}
              className="z-10 py-0 max-w-2xl"
            >
              <motion.h1 
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="text-4xl md:text-5xl xl:text-[58px] font-headline font-black text-[#0F172A] leading-[1.08] tracking-tighter mb-5 max-w-2xl"
              >
                CRM feito para clínicas que querem vender mais com <span className="shimmer-text">inteligência comercial.</span>
              </motion.h1>
              <motion.p 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="text-lg text-[#64748B] font-medium leading-relaxed mb-6 max-w-md"
              >
                A infraestrutura comercial que sua clínica precisa, sem a complexidade que você não quer. Gestão inteligente e sem atritos.
              </motion.p>
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="flex flex-wrap items-center gap-5 sm:gap-8 mb-10"
              >
                <Link to="/signup" className="bg-[#F97316] text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-orange-200 hover:scale-105 transition-all flex items-center gap-3">
                  Começar agora <ArrowRight size={16}/>
                </Link>
                <a href="#funcionalidades" className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B] hover:text-[#0F172A] transition-all">
                  Por que usar?
                </a>
              </motion.div>
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="flex items-center gap-10 sm:gap-12 border-l-2 border-slate-100 pl-8"
              >
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
              </motion.div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 100, rotateY: -15 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-0 min-w-0 w-full lg:translate-x-4 xl:translate-x-8"
            >
               <div className="relative w-full">
                  <div className="absolute -inset-10 bg-gradient-to-tr from-[#F97316]/10 to-blue-500/5 blur-[100px] opacity-40" />
                  <div className="relative bg-white p-2.5 sm:p-3 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-[0_40px_90px_-30px_rgba(15,23,42,0.22)] transition-transform duration-700 hover:scale-[1.01] overflow-hidden">
                    <img src="/dashboard%20tela.png" alt="SellClin Dashboard" className="block w-full h-auto rounded-[1.5rem] lg:rounded-[2rem]" />
                  </div>
               </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. PRODUCT SHOWCASE — INTERACTIVE APP BROWSER */}
      <InteractiveAppBrowser />

      {/* 4. SOCIAL PROOF — DUAL ROW MARQUEE */}
      <section className="py-32 bg-slate-50/30 overflow-hidden relative">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3, margin: "-100px" }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-6xl mx-auto px-8 mb-16 text-center"
        >
          <span className="text-[#F97316] font-black text-[10px] uppercase tracking-[0.4em] mb-6 block">Resultados Reais</span>
          <h2 className="text-4xl md:text-6xl font-headline font-black text-[#0F172A] mb-6 tracking-tighter">Quem usa, <span className="text-[#F97316]">vende mais.</span></h2>
        </motion.div>

        {/* Row 1 — Moving Left */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3, margin: "-100px" }}
          transition={{ duration: 1.6, delay: 0.2 }}
          className="flex mask-fade-edges mb-8"
        >
          <div className="flex gap-6 animate-marquee-left pause-marquee py-4">
            {[...Array(2)].map((_, idx) => (
              <React.Fragment key={idx}>
                {[
                  { name: "Dr. Ricardo Santos", clinic: "Clínica OrthoDesign", text: "O SellClin mudou o jogo aqui. Aumentamos nossa conversão de implantes em 45% no primeiro trimestre.", img: "https://i.pravatar.cc/150?u=dr1" },
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
        </motion.div>

        {/* Row 2 — Moving Right */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3, margin: "-100px" }}
          transition={{ duration: 1.6, delay: 0.3 }}
          className="flex mask-fade-edges"
        >
          <div className="flex gap-6 animate-marquee-right pause-marquee py-4">
            {[...Array(2)].map((_, idx) => (
              <React.Fragment key={idx}>
                {[
                  { name: "Dr. Felipe Neves", clinic: "Neves Odontologia", text: "O sistema de funis é o que faltava para organizar meu comercial. Hoje sei exatamente onde focar.", img: "https://i.pravatar.cc/150?u=dr5" },
                  { name: "Dra. Sarah Lima", clinic: "Lima Cardiovascular", text: "Interface limpa e resultados expressivos. A SellClin entende o dia a dia de uma clínica.", img: "https://i.pravatar.cc/150?u=dr6" },
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
        </motion.div>
      </section>

      {/* 5. METAS — PRECISION CONSOLE */}
      <section id="metas" className="py-40 bg-[#0F172A] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5" />
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            
            {/* Left: Copy and Value Proposition */}
            <motion.div 
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3, margin: "-100px" }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-[#F97316] font-black text-[10px] uppercase tracking-[0.4em] mb-6 block">Inteligência Preditiva</span>
              <h2 className="text-3xl sm:text-5xl md:text-7xl font-headline font-black text-white mb-10 leading-[1] tracking-tighter">
                Engenharia de <br/> <span className="text-[#F97316]">Metas Reais.</span>
              </h2>
              <p className="text-lg text-slate-400 font-medium leading-relaxed mb-12 max-w-lg">
                Pare de "achar" quanto vai faturar. Use nossa engenharia para calcular exatamente o volume de leads e conversão necessários para bater seu próximo recorde.
              </p>
              
              <div className="space-y-6 mb-12">
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
              <Link to="/funcionalidades/metas" className="inline-flex items-center gap-2 text-sm font-black text-[#F97316] hover:gap-4 transition-all group">
                Explorar Engenharia de Metas <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Right: The Pristine White Console (Compact Version) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 60 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3, margin: "-100px" }}
              transition={{ duration: 1.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-[#F97316]/40 shadow-[0_0_30px_rgba(249,115,22,0.08)] relative overflow-hidden group hover:border-[#F97316] transition-all duration-500">
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. PRICING */}
      <section id="planos" className="py-40 bg-slate-50/50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3, margin: "-100px" }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-24"
          >
            <span className="text-[#F97316] font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Planos</span>
            <h2 className="text-4xl md:text-6xl font-headline font-black text-[#0F172A] mb-6 tracking-tighter">A estrutura certa para <br/> <span className="text-[#F97316]">cada etapa.</span></h2>
          </motion.div>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.25 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch"
          >
            {[
              { name: "Start", price: "197", plan: "start", features: ["Até 5 Usuários", "Gestão de Leads", "Funil de Vendas", "Suporte Individual"], featured: false },
              { name: "Pro", price: "297", plan: "pro", features: ["Até 10 usuários por clínica", "Integração WhatsApp", "Inteligência de Metas", "Relatórios Custom"], featured: true },
              { name: "Enterprise", price: "Custom", plan: "enterprise", features: ["Multiclínicas", "API Dedicada", "Treinamento Time", "Gestor de Contas"], featured: false }
            ].map((p, i) => (
              <motion.div 
                key={i} 
                variants={{
                  hidden: { opacity: 0, y: 60 },
                  visible: { opacity: 1, y: 0, transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="flex flex-col group"
              >
                <div className={`flex-grow bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border transition-all duration-500 flex flex-col ${p.featured ? 'border-[#F97316] shadow-[0_0_40px_rgba(249,115,22,0.15)] md:scale-105 z-10' : 'border-[#F97316]/20 shadow-[0_0_15px_rgba(249,115,22,0.02)] hover:border-[#F97316] hover:shadow-[0_0_25px_rgba(249,115,22,0.1)] hover:-translate-y-1'}`}>
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
                  
                  <Link to={p.price === "Custom" ? "/signup" : `/signup?plan=${p.plan}`} className={`block text-center w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${p.featured ? 'bg-[#F97316] text-white shadow-lg shadow-orange-200 hover:scale-105' : 'bg-[#0F172A] text-white hover:bg-slate-800'}`}>
                    {p.price === "Custom" ? "Falar com Time" : "Escolher Plano"}
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 7. ABOUT US — FOUNDER HIGHLIGHT */}
      <section id="sobre" className="py-20 sm:py-48 bg-white relative overflow-hidden border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 50 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3, margin: "-100px" }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#F97316]/5 rounded-full blur-[100px]" />
              <div className="relative z-10 rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-slate-100 shadow-2xl">
                <img src="/Captura de tela 2026-05-15 183100.png" alt="Luiz Bucco" className="w-full h-[320px] sm:h-[600px] object-cover transition-all duration-1000" />
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/20 shadow-xl">
                  <div className="text-xl sm:text-2xl font-black text-[#0F172A] mb-1">Luiz Bucco</div>
                  <div className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em]">CEO & Co-Founder</div>
                </div>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3, margin: "-100px" }}
              transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-10"
            >
              <span className="text-[#F97316] font-black text-[10px] uppercase tracking-[0.5em] block">Autoridade & Legado</span>
              <h2 className="text-3xl sm:text-5xl md:text-7xl font-headline font-black text-[#0F172A] leading-[1] tracking-tighter">O CRM criado por <br/> quem <span className="text-[#F97316]">vive a clínica.</span></h2>
              <p className="text-xl text-slate-500 font-medium leading-relaxed italic border-l-4 border-[#F97316]/20 pl-8">
                "Não criamos um software de laboratório. Criamos a solução que eu mesmo precisava para gerenciar minhas 3 clínicas de 7 dígitos."
              </p>
              <p className="text-slate-500 text-lg leading-relaxed">
                A SellClin nasceu da necessidade real de um dono de clínica. Combinamos a experiência prática do Luiz Bucco com tecnologia de ponta para entregar a primeira infraestrutura comercial especializada em alto ticket do Brasil.
              </p>
              <div className="pt-8">
                <Link to="/sobre" className="group flex items-center gap-4 text-sm font-black uppercase tracking-[0.3em] text-[#0F172A] hover:text-[#F97316] transition-colors">
                  Conheça nossa história 
                  <div className="w-12 h-[1px] bg-[#0F172A] group-hover:bg-[#F97316] transition-all group-hover:w-16" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FINAL CTA — HUMAN STARTUP AUTHORITY */}
      <section className="py-20 sm:py-32 px-6 sm:px-8 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="bg-[#F97316] rounded-[3rem] p-8 sm:p-16 lg:p-20 text-white relative overflow-hidden group shadow-[0_50px_100px_-20px_rgba(249,115,22,0.4)]">
            {/* Subtle dot grid pattern */}
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'radial-gradient(white 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center relative z-10">
              
              {/* Left: Conversational Call to Action */}
              <div className="md:col-span-7 space-y-6 max-w-xl">
                <span className="text-white/90 font-black text-[10px] uppercase tracking-[0.6em] block">Fim da Página</span>
                <h2 className="text-3xl sm:text-5xl font-headline font-black text-white leading-tight tracking-tight">
                  Você chegou no fim da página.
                </h2>
                <p className="text-base sm:text-lg text-white/90 font-medium leading-relaxed">
                  Se você leu toda a nossa proposta até aqui, é porque o comercial da sua clínica precisa de um motor inteligente e profissional. Dê o próximo passo.
                </p>
                <div className="pt-4">
                  <Link 
                    to="/signup" 
                    className="inline-flex items-center gap-3 px-8 py-4.5 bg-[#0B1225] hover:bg-white hover:text-[#0B1225] text-white rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#0B1225]/20"
                  >
                    Vai, clica nesse botão <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              {/* Right: Premium Hand-drawn UI Sketch */}
              <div className="md:col-span-5 relative w-full aspect-square md:aspect-4/3 flex items-center justify-center select-none">
                <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-xs sm:max-w-sm">
                  
                  {/* Background Aura / Blob */}
                  <motion.path 
                    d="M 120 70 C 250 30, 360 120, 330 240 C 280 300, 100 280, 80 160 Z" 
                    fill="white" 
                    fillOpacity="0.1" 
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5 }}
                  />
                  
                  {/* Decorative dashed circle */}
                  <circle cx="200" cy="160" r="120" stroke="white" strokeOpacity="0.15" strokeWidth="1.5" strokeDasharray="6 6" />

                  {/* MAIN DASHBOARD CARD (Center) */}
                  <motion.g 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Solid White Fill */}
                    <rect x="70" y="80" width="220" height="150" fill="white" rx="16" />
                    {/* Shadow Offset Fill */}
                    <rect x="78" y="88" width="220" height="150" fill="#0B1225" fillOpacity="0.08" rx="16" />
                    
                    {/* Hand-drawn Outline (Architectural overshoot) */}
                    <g stroke="#0B1225" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <motion.path d="M 60 80 L 300 80" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }} />
                      <motion.path d="M 290 70 L 290 240" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4 }} />
                      <motion.path d="M 300 230 L 60 230" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.6 }} />
                      <motion.path d="M 70 240 L 70 70" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.8 }} />
                    </g>
                    
                    {/* Inner UI Elements (Skeletons) */}
                    {/* Header */}
                    <motion.path d="M 95 105 L 140 105" stroke="#0B1225" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.2" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 1.0 }} />
                    <motion.path d="M 95 115 L 120 115" stroke="#0B1225" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.1" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 1.1 }} />
                    
                    {/* Badge */}
                    <rect x="235" y="98" width="40" height="16" rx="6" fill="#10B981" fillOpacity="0.15" />
                    <motion.path d="M 245 106 L 265 106" stroke="#10B981" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 1.2 }} />

                    {/* Content Boxes */}
                    <g stroke="#0B1225" strokeWidth="1.5" strokeOpacity="0.15" fill="none" strokeLinecap="round">
                      <rect x="90" y="135" width="180" height="24" rx="6" />
                      <rect x="90" y="170" width="180" height="24" rx="6" />
                      <rect x="90" y="205" width="180" height="24" rx="6" />
                    </g>

                    {/* Progress Bars inside boxes */}
                    <motion.path d="M 100 147 L 240 147" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 1.3 }} />
                    <motion.path d="M 100 182 L 200 182" stroke="#F97316" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 1.4 }} />
                    <motion.path d="M 100 217 L 160 217" stroke="#8B5CF6" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 1.5 }} />
                  </motion.g>

                  {/* FRONT CHART CARD (Bottom Left) */}
                  <motion.g 
                    initial={{ opacity: 0, x: -30, y: 20 }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.0, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <g transform="translate(30, 160)">
                      {/* Dark Fill */}
                      <rect x="0" y="0" width="160" height="110" fill="#0B1225" rx="12" />
                      
                      {/* Outline */}
                      <g stroke="#0B1225" strokeWidth="2.5" strokeLinecap="round" fill="none">
                        <path d="M -10 0 L 170 0" />
                        <path d="M 160 -10 L 160 120" />
                        <path d="M 170 110 L -10 110" />
                        <path d="M 0 120 L 0 -10" />
                      </g>

                      {/* Card Content */}
                      <path d="M 20 25 L 70 25" stroke="white" strokeWidth="3" strokeOpacity="0.4" strokeLinecap="round" />
                      <path d="M 20 40 L 100 40" stroke="white" strokeWidth="6" strokeLinecap="round" />
                      
                      {/* Growth Line Chart */}
                      <motion.path 
                        d="M 20 85 C 40 85, 60 55, 90 65 C 110 70, 120 45, 140 40" 
                        fill="none" 
                        stroke="#F97316" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, delay: 1.0, ease: "easeOut" }}
                      />
                      <motion.circle 
                        cx="140" cy="40" r="5" fill="#0B1225" stroke="#F97316" strokeWidth="2.5"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 2.5, type: "spring" }}
                      />
                    </g>
                  </motion.g>

                  {/* NOTIFICATION PILL (Top Right) */}
                  <motion.g 
                    initial={{ opacity: 0, x: 20, y: -20 }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <g transform="translate(200, 50)">
                      <rect x="0" y="0" width="140" height="40" fill="white" rx="20" />
                      <rect x="4" y="4" width="140" height="40" fill="#0B1225" fillOpacity="0.08" rx="20" />
                      
                      <g stroke="#0B1225" strokeWidth="2.5" strokeLinecap="round" fill="none">
                        <path d="M -5 20 C -5 5, 5 -5, 20 -5 L 120 -5 C 135 -5, 145 5, 145 20 C 145 35, 135 45, 120 45 L 20 45 C 5 45, -5 35, -5 20 Z" />
                      </g>

                      {/* Icon */}
                      <circle cx="25" cy="20" r="7" fill="#F97316" />
                      {/* Text lines */}
                      <motion.path d="M 45 20 L 115 20" stroke="#0B1225" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 1.4 }} />
                    </g>
                  </motion.g>

                  {/* TARGET/GOAL BADGE (Bottom Right) */}
                  <motion.g 
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.8, type: "spring" }}
                  >
                    <g transform="translate(290, 210)">
                      <rect x="0" y="0" width="60" height="60" fill="#10B981" rx="16" transform="rotate(10 30 30)" />
                      <g stroke="#0B1225" strokeWidth="2.5" strokeLinecap="round" fill="none" transform="rotate(10 30 30)">
                        <path d="M -5 30 C -5 10, 10 -5, 30 -5 L 30 -5 C 50 -5, 65 10, 65 30 L 65 30 C 65 50, 50 65, 30 65 L 30 65 C 10 65, -5 50, -5 30 Z" />
                        {/* Checkmark inside */}
                        <motion.path d="M 20 30 L 27 37 L 40 23" stroke="white" strokeWidth="3.5" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 1.6 }} />
                      </g>
                    </g>
                  </motion.g>

                  {/* Sketchy connecting lines / arrows */}
                  <motion.path 
                    d="M 120 160 C 120 120, 160 100, 200 70" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeDasharray="4 4" 
                    strokeOpacity="0.4"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.0, delay: 1.2 }}
                  />

                  
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — COMPREHENSIVE EDITORIAL */}
      <SiteFooter />
    </div>
  );
};

export default Index;
