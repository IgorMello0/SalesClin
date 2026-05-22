import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Zap, Star, ShieldCheck } from 'lucide-react';
import { SiteNavbar } from '@/components/SiteNavbar';
import { SiteFooter } from '@/components/SiteFooter';
import { Link } from 'react-router-dom';

const PrecosPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const plans = [
    {
      name: "Start",
      price: "497",
      desc: "Ideal para consultórios individuais e clínicas em início de escala.",
      features: [
        "Até 3 Usuários",
        "Gestão de Leads",
        "Funil de Vendas Kanban",
        "Agenda Inteligente",
        "Suporte Individual",
        "Relatórios Básicos"
      ],
      featured: false,
      cta: "Escolher Start"
    },
    {
      name: "Pro",
      price: "897",
      desc: "O plano definitivo para clínicas que buscam crescimento agressivo.",
      features: [
        "Usuários Ilimitados",
        "Engenharia de Metas",
        "Integração WhatsApp",
        "Múltiplos Funis",
        "Dashboard de Performance",
        "Treinamento de Equipe",
        "Relatórios Customizados"
      ],
      featured: true,
      cta: "Escolher Pro"
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "Soluções personalizadas para redes de clínicas e multiclínicas.",
      features: [
        "Multiclínicas",
        "API Dedicada",
        "Gestor de Contas Exclusivo",
        "SLA de Suporte",
        "Backup em Tempo Real",
        "White-label Parcial"
      ],
      featured: false,
      cta: "Falar com Time"
    }
  ];

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-body selection:bg-[#F97316]/20 flex flex-col relative overflow-x-hidden">
      <SiteNavbar />

      {/* HERO */}
      <section className="relative pt-48 pb-32 bg-white overflow-hidden">
        {/* Architectural Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-[#F97316]/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-100 bg-slate-50/50 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Planos & Preços</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-headline font-black text-[#0F172A] mb-8 tracking-tighter leading-[0.9]">
              Escala sem <br className="hidden md:block" /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-orange-400">complexidade.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
              Engenharia comercial para clínicas de alto nível. Escolha a estrutura perfeita para o seu estágio atual de crescimento.
            </p>
          </motion.div>
        </div>
      </section>

      {/* PRICING GRID */}
      <section className="pb-32 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col"
              >
                <div className={`h-full bg-white p-8 sm:p-12 rounded-[2.5rem] border transition-all duration-700 flex flex-col relative overflow-hidden group ${p.featured ? 'border-[#F97316]/30 shadow-[0_40px_100px_-20px_rgba(249,115,22,0.15)] lg:-translate-y-4 z-10' : 'border-slate-200/60 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:shadow-xl'}`}>
                  {p.featured && (
                    <>
                      {/* Glow Behind */}
                      <div className="absolute inset-0 bg-gradient-to-b from-[#F97316]/5 to-transparent pointer-events-none" />
                      {/* SVG Architectural Wireframe Badge */}
                      <div className="absolute -top-16 -right-16 w-56 h-56 text-[#F97316] opacity-10 pointer-events-none group-hover:scale-110 group-hover:opacity-[0.15] group-hover:rotate-6 transition-all duration-1000 ease-out">
                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="0.5" />
                          <path d="M 50 5 L 50 95 M 5 50 L 95 50" stroke="currentColor" strokeWidth="0.5" />
                          <path d="M 20 20 L 80 80 M 20 80 L 80 20" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.5" />
                        </svg>
                      </div>
                      
                      <div className="absolute top-8 right-8 bg-[#F97316]/10 text-[#F97316] text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-[#F97316]/20">
                        Recomendado
                      </div>
                    </>
                  )}
                  
                  <div className="mb-10 relative z-10">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#0F172A] mb-6">{p.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      {p.price !== "Custom" && <span className="text-2xl font-bold text-slate-300 mr-1">R$</span>}
                      <span className="text-6xl font-black text-[#0F172A] tabular-nums tracking-tighter">
                        {p.price}
                      </span>
                      {p.price !== "Custom" && <span className="text-sm font-bold text-slate-400 ml-1">/mês</span>}
                    </div>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[90%]">{p.desc}</p>
                  </div>

                  <div className="space-y-4 mb-12 flex-grow relative z-10">
                    {p.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${p.featured ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-slate-50 border border-slate-100 text-slate-400'}`}>
                          <Check size={10} strokeWidth={4} />
                        </div>
                        <span className="text-sm text-[#0F172A]/80 font-medium">{f}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/login"
                    className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-500 flex items-center justify-center gap-2 relative z-10 overflow-hidden group/btn ${p.featured ? 'bg-[#F97316] text-white hover:shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:-translate-y-1' : 'bg-slate-50 border border-slate-200 text-[#0F172A] hover:bg-slate-100 hover:border-slate-300'}`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {p.cta} <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON MATRIX */}
      <section className="py-24 bg-white relative">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-headline font-black tracking-tighter text-[#0F172A] mb-4">Comparativo Detalhado</h2>
            <p className="text-slate-500 font-medium">Entenda exatamente o que está incluso em cada estrutura.</p>
          </div>
          
          <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-[0_10px_40px_-15px_rgba(15,23,42,0.03)] bg-white">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-6 pl-8 font-bold text-slate-500 w-1/3 text-sm">Recursos Essenciais</th>
                  <th className="p-6 font-black text-[#0F172A] text-center w-[22%] text-sm uppercase tracking-widest">Start</th>
                  <th className="p-6 font-black text-[#F97316] text-center w-[22%] text-sm uppercase tracking-widest">Pro</th>
                  <th className="p-6 font-black text-[#0F172A] text-center w-[22%] text-sm uppercase tracking-widest">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { feature: "Usuários Simultâneos", start: "3", pro: "Ilimitado", ent: "Ilimitado" },
                  { feature: "Gestão de Leads (Kanban)", start: true, pro: true, ent: true },
                  { feature: "Agenda Inteligente Integrada", start: true, pro: true, ent: true },
                  { feature: "Cálculo de Previsibilidade (Metas)", start: false, pro: true, ent: true },
                  { feature: "Dashboard de Performance Avançado", start: false, pro: true, ent: true },
                  { feature: "Integração WhatsApp Nativo", start: false, pro: true, ent: true },
                  { feature: "Multiclínicas (Gestão de Redes)", start: false, pro: false, ent: true },
                  { feature: "Nível de Suporte", start: "Horário Comercial", pro: "Prioritário 24/7", ent: "Gerente Dedicado" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 pl-8 text-sm font-medium text-slate-700">{row.feature}</td>
                    <td className="p-6 text-center">
                      {typeof row.start === 'boolean' ? (
                        row.start ? <Check size={16} strokeWidth={3} className="text-[#0F172A] mx-auto opacity-40" /> : <span className="text-slate-300">-</span>
                      ) : (
                        <span className="text-xs font-bold text-[#0F172A]/70 uppercase tracking-wider">{row.start}</span>
                      )}
                    </td>
                    <td className="p-6 text-center bg-[#F97316]/[0.02]">
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? <Check size={18} strokeWidth={4} className="text-[#F97316] mx-auto" /> : <span className="text-slate-300">-</span>
                      ) : (
                        <span className="text-xs font-black text-[#F97316] uppercase tracking-wider">{row.pro}</span>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      {typeof row.ent === 'boolean' ? (
                        row.ent ? <Check size={16} strokeWidth={3} className="text-[#0F172A] mx-auto opacity-40" /> : <span className="text-slate-300">-</span>
                      ) : (
                        <span className="text-xs font-bold text-[#0F172A]/70 uppercase tracking-wider">{row.ent}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ MINI */}
      <section className="py-32 bg-slate-50">
        <div className="max-w-4xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-headline font-black tracking-tighter">Perguntas Frequentes sobre Planos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { q: "Posso mudar de plano depois?", a: "Sim, você pode fazer upgrade ou downgrade a qualquer momento direto pelo painel de configurações." },
              { q: "Existe fidelidade?", a: "Não. Nossos planos são mensais. Você pode cancelar quando quiser, sem multas ou burocracia." },
              { q: "Como funciona o suporte?", a: "Oferecemos suporte humano via chat e e-mail. No plano Pro e Enterprise, você tem acesso a suporte prioritário." },
              { q: "O pagamento é seguro?", a: "Totalmente. Usamos infraestrutura de pagamentos criptografada e certificada para garantir sua segurança." },
            ].map((faq, i) => (
              <div key={i} className="space-y-2">
                <h4 className="font-bold text-[#0F172A]">{faq.q}</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <Link to="/faq" className="text-sm font-black text-[#F97316] hover:gap-3 transition-all flex items-center justify-center gap-2">
              Ver FAQ completo <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="bg-[#0F172A] rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="relative z-10 max-w-xl text-center md:text-left">
              <h2 className="text-4xl md:text-5xl font-headline font-black mb-6 tracking-tighter">Ainda tem dúvidas sobre qual plano escolher?</h2>
              <p className="text-lg text-slate-400 font-medium">Nossos especialistas estão prontos para analisar sua operação e recomendar a melhor estrutura.</p>
            </div>
            <a href="#" className="relative z-10 bg-[#F97316] text-white px-12 py-6 rounded-full font-black text-xs uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl shadow-orange-900/20 whitespace-nowrap">
              Falar com Consultor
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default PrecosPage;
