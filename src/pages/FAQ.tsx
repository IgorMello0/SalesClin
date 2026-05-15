import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  ArrowLeft,
  Search,
  MessageCircle,
  BarChart,
  Calendar,
  Users,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQItem = ({ question, answer, isOpen, onClick, category }: { question: string, answer: React.ReactNode, isOpen: boolean, onClick: () => void, category: string }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden transition-all duration-500 rounded-3xl border ${isOpen ? 'bg-white shadow-[0_20px_40px_-15px_rgba(15,23,42,0.05)] border-slate-200' : 'bg-white/60 hover:bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg'}`}
    >
      {/* Hidden Branding / Accent when open */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F97316] to-orange-400 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`} />

      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 sm:p-8 text-left group"
      >
        <div className="flex flex-col gap-2 pr-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#F97316] opacity-80">{category}</span>
          <span className="font-headline font-extrabold text-xl sm:text-2xl text-[#0F172A] group-hover:text-[#F97316] transition-colors leading-tight">
            {question}
          </span>
        </div>
        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${isOpen ? 'bg-[#0F172A] text-[#F97316] rotate-180' : 'bg-white border border-slate-100 text-slate-400 group-hover:text-[#F97316] group-hover:border-[#F97316]/20'}`}>
          <ChevronDown className="w-6 h-6" />
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="px-6 sm:px-8 pb-8">
              <div className="h-px w-full bg-gradient-to-r from-slate-100 via-slate-200 to-transparent mb-6" />
              <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-loose">
                {answer}
              </div>
              
              {/* Premium Footer detail inside answer */}
              <div className="mt-8 flex items-center gap-3 py-4 px-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-[#F97316]/10 flex items-center justify-center text-[#F97316]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-500 font-semibold">Esse artigo foi útil? O SalesClin está sempre evoluindo para você.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  
  // States for Navbar
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Scroll listener for Navbar
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { id: "Geral", icon: <ShieldCheck className="w-6 h-6" />, desc: "Conceitos básicos", count: 2 },
    { id: "Agenda", icon: <Calendar className="w-6 h-6" />, desc: "Gestão de horários", count: 2 },
    { id: "Vendas", icon: <BarChart className="w-6 h-6" />, desc: "Funil e metas", count: 4 },
    { id: "Pacientes", icon: <Users className="w-6 h-6" />, desc: "Prontuários e dados", count: 2 },
    { id: "Suporte", icon: <MessageCircle className="w-6 h-6" />, desc: "Configurações", count: 2 },
  ];

  const faqs = [
    {
      category: "Geral",
      question: "O que torna o SalesClin diferente?",
      answer: "O SalesClin CRM não é apenas uma agenda. É uma plataforma de inteligência comercial desenhada para clínicas. Unimos a organização da recepção (agenda inteligente) com a agressividade do time comercial (funil Kanban e engenharia de metas), criando uma máquina previsível de captação e retenção de pacientes."
    },
    {
      category: "Geral",
      question: "Para qual tipo de operação o CRM foi feito?",
      answer: "Desenhado para clínicas odontológicas, médicas, estéticas e consultórios de alto padrão. Se a sua clínica sofre com 'pacientes que agendam e não comparecem' ou 'leads do Instagram que somem', o SalesClin é a infraestrutura que resolve esse problema de ponta a ponta."
    },
    {
      category: "Agenda",
      question: "Como funciona a Agenda de Alta Performance?",
      answer: "Nossa agenda usa status coloridos e codificados (Agendado, Confirmado, Cancelado, Concluído) que se comunicam com o Funil de Vendas. Quando um paciente é marcado como 'Concluído' na agenda, o sistema entende o avanço dele na jornada de compra, gerando relatórios automáticos sem retrabalho da equipe."
    },
    {
      category: "Agenda",
      question: "A interface da agenda é confusa para a recepção?",
      answer: "Pelo contrário. Adotamos o conceito de 'Quiet Luxury' no design. As visões de Dia, Semana e Mês são minimalistas, focando apenas na informação essencial. O filtro rápido por profissional permite que a recepção marque consultas em segundos, sem fricção."
    },
    {
      category: "Vendas",
      question: "Qual o poder do Funil de Vendas (Kanban)?",
      answer: "O quadro Kanban transforma o invisível em visível. Cada paciente é um 'Card' que você arrasta entre colunas (ex: Lead Novo > Contato Feito > Agendado > Avaliação > Fechado). Isso permite que você saiba exatamente onde está o dinheiro parado na sua clínica e atue em cima disso."
    },
    {
      category: "Vendas",
      question: "Posso adaptar as etapas do funil para minha clínica?",
      answer: "Sim. Acreditamos que cada clínica tem sua essência. Você pode criar Múltiplos Funis (ex: um Funil de Captação e um Funil de Recuperação de Pacientes Antigos) e nomear as etapas de cada um como quiser, criando um processo 100% customizado."
    },
    {
      category: "Vendas",
      question: "O que é a famosa 'Engenharia de Metas'?",
      answer: "É o nosso recurso premium de previsibilidade. Esqueça o 'achismo'. Você insere quanto quer faturar e qual o seu ticket médio. O algoritmo reverso do SalesClin calcula, baseado nas suas taxas de conversão históricas, exatamente quantos contatos o seu marketing precisa gerar e quantas avaliações você precisa realizar."
    },
    {
      category: "Vendas",
      question: "Como o sistema rastreia os leads?",
      answer: "Sempre que um card é movido no funil, o sistema salva um log de tempo. Você saberá quantos dias em média um lead demora para comprar de você, e em qual etapa a maioria das pessoas desiste. Inteligência pura de negócios."
    },
    {
      category: "Pacientes",
      question: "Onde ficam guardados os dados clínicos?",
      answer: "O Perfil do Paciente é o hub central. Lá, você tem acesso ao Prontuário, histórico de anotações clínicas, linha do tempo de interações (quando ele veio, com quem falou) e uma aba inteira dedicada ao financeiro dele com a clínica. Tudo seguro e rastreável."
    },
    {
      category: "Pacientes",
      question: "O sistema aprisiona meus dados?",
      answer: "De forma alguma. O SalesClin garante a soberania dos seus dados. Você possui acesso a ferramentas de exportação robustas em formato CSV/Excel a qualquer momento, seja para clientes, leads ou faturamento."
    },
    {
      category: "Suporte",
      question: "A configuração inicial é complexa?",
      answer: "Reduzimos a complexidade ao máximo. Em 'Configurações', você insere os serviços da clínica, o tempo médio de cada um e o valor. Isso já deixa a agenda e a criação de propostas prontas para uso. O setup leva menos de 10 minutos."
    },
    {
      category: "Suporte",
      question: "Como funciona o controle de acesso (Equipe)?",
      answer: "A gestão de permissões é estrita. Administradores têm visão do fluxo de caixa e relatórios totais. Profissionais e Recepcionistas podem ter visões limitadas apenas às suas agendas e clientes. Segurança e privacidade total no trato dos dados da clínica."
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-[#0F172A] font-body selection:bg-[#F97316]/20 flex flex-col relative">
      
      {/* GLOBAL NAVBAR (Identical to Landing Page with adaptive colors for dark hero) */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? 'py-4 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm' : 'py-8 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <Link to="/" className="opacity-90 hover:opacity-100 transition-opacity">
            <img 
              src="/logo-site.png" 
              alt="SalesClin" 
              className={`h-10 w-auto object-contain transition-all duration-300 ${!scrolled ? 'brightness-0 invert' : ''}`} 
            />
          </Link>

          <div className="flex items-center gap-6 lg:gap-10">
            <div className="hidden md:flex items-center gap-10">
              <Link to="/#planos" className={`text-sm font-semibold transition-colors ${scrolled ? 'text-[#0F172A]/70 hover:text-[#0F172A]' : 'text-white/70 hover:text-white'}`}>Planos</Link>
              <Link to="/#suporte" className={`text-sm font-semibold transition-colors ${scrolled ? 'text-[#0F172A]/70 hover:text-[#0F172A]' : 'text-white/70 hover:text-white'}`}>Suporte</Link>
              <Link to="/faq" className={`text-sm font-semibold transition-colors ${scrolled ? 'text-[#0F172A] font-bold' : 'text-white font-bold'}`}>FAQ</Link>
              <div className={`h-4 w-[1px] mx-2 ${scrolled ? 'bg-slate-200' : 'bg-white/20'}`} />
              <Link to="/login" className="group relative overflow-hidden bg-[#0F172A] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 hover:scale-105 active:scale-95 shadow-[0_10px_20px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)]">
                <span className="absolute -inset-[1px] bg-[#F97316] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out z-0" />
                <span className="relative flex items-center gap-3 z-10">
                  Acessar Plataforma 
                  <ArrowRight size={14} className="text-[#F97316] group-hover:text-white group-hover:translate-x-1 transition-all duration-500"/>
                </span>
              </Link>
            </div>
            
            <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={20} className={scrolled ? 'text-[#0F172A]' : 'text-white'}/> : <Menu size={20} className={scrolled ? 'text-[#0F172A]' : 'text-white'}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* 1. ULTRA PREMIUM DARK HERO */}
      <section className="relative bg-[#0B1525] pt-32 pb-32 overflow-hidden rounded-b-[3rem] sm:rounded-b-[4rem] shadow-2xl z-10">
        
        {/* Intricate Hero Background Elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] z-0 mix-blend-overlay" />
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#F97316]/20 to-transparent blur-[150px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none z-0" />
        
        {/* Subtle glowing grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0" />

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center mt-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
          >
            <Zap className="w-4 h-4 text-[#F97316]" />
            <span className="text-xs font-bold text-white/90 uppercase tracking-widest">Suporte Pro Max</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black font-headline text-white tracking-tight mb-6 leading-[1.1]"
          >
            Como podemos <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-orange-400">acelerar sua clínica?</span>
          </motion.h1>
          
          {/* Immersive Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-2xl mx-auto mt-12 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#F97316] to-orange-400 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative flex items-center bg-white/10 border border-white/20 rounded-3xl backdrop-blur-xl p-2 focus-within:bg-white/15 focus-within:border-white/30 transition-all">
              <div className="pl-6 pr-4">
                <Search className="h-6 w-6 text-[#F97316]" />
              </div>
              <input
                type="text"
                className="w-full h-14 bg-transparent text-xl text-white focus:outline-none placeholder:text-white/40 font-medium"
                placeholder="Ex: Como configurar o funil de vendas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="pr-2 hidden sm:block">
                <div className="px-4 py-2 rounded-xl bg-white/10 text-white/60 text-xs font-bold uppercase tracking-wider">
                  Buscar
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. THE BENTO GRID CATEGORIES */}
      <main className="flex-1 max-w-7xl mx-auto px-6 w-full relative z-20 -mt-16 mb-24">
        
        {/* Show Categories only if no search */}
        <AnimatePresence>
          {searchQuery === "" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-16"
            >
              {/* Reset to "Todos" card */}
              <button
                onClick={() => setActiveCategory("Todos")}
                className={`relative overflow-hidden p-6 rounded-[2rem] text-left transition-all duration-500 flex flex-col justify-between h-48 border ${activeCategory === "Todos" ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-2xl shadow-[#0F172A]/20 scale-105 z-10' : 'bg-white text-slate-800 border-slate-100 hover:border-[#F97316]/30 hover:shadow-xl'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${activeCategory === "Todos" ? 'bg-white/10' : 'bg-slate-50 text-slate-400'}`}>
                  <Sparkles className={`w-6 h-6 ${activeCategory === "Todos" ? 'text-[#F97316]' : ''}`} />
                </div>
                <div>
                  <h3 className="font-headline font-black text-xl mb-1">Explorar Todos</h3>
                  <p className={`text-sm font-medium ${activeCategory === "Todos" ? 'text-white/60' : 'text-slate-400'}`}>Visão geral do sistema</p>
                </div>
              </button>

              {/* Dynamic Categories */}
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`group relative overflow-hidden p-6 rounded-[2rem] text-left transition-all duration-500 flex flex-col justify-between h-48 border ${activeCategory === cat.id ? 'bg-[#F97316] text-white border-[#F97316] shadow-2xl shadow-[#F97316]/30 scale-105 z-10' : 'bg-white text-slate-800 border-slate-100 hover:border-[#F97316]/30 hover:shadow-xl'}`}
                >
                  {/* Hidden brand watermark */}
                  <div className={`absolute -bottom-6 -right-6 transition-transform duration-700 group-hover:scale-150 group-hover:-rotate-12 ${activeCategory === cat.id ? 'opacity-10' : 'opacity-[0.03]'}`}>
                    {React.cloneElement(cat.icon as React.ReactElement, { className: "w-40 h-40" })}
                  </div>

                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${activeCategory === cat.id ? 'bg-white text-[#F97316] shadow-lg' : 'bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-[#F97316]'}`}>
                      {cat.icon}
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="font-headline font-black text-xl mb-1">{cat.id}</h3>
                    <p className={`text-sm font-medium ${activeCategory === cat.id ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-500'}`}>
                      {cat.count} Artigos
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. ARTICLES LIST (THE RICH FAQ CONTENT) */}
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-headline text-[#0F172A] tracking-tight">
              {searchQuery ? (
                <>Resultados para <span className="text-[#F97316]">"{searchQuery}"</span></>
              ) : activeCategory === "Todos" ? (
                "Dúvidas Recentes"
              ) : (
                `Tópico: ${activeCategory}`
              )}
            </h2>
            
            {activeCategory !== "Todos" && !searchQuery && (
              <button 
                onClick={() => setActiveCategory("Todos")}
                className="px-5 py-2 rounded-xl bg-slate-200/50 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Limpar Filtro
              </button>
            )}
          </div>

          {/* Cards List */}
          <div className="space-y-6">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <FAQItem 
                  key={index} 
                  category={faq.category}
                  question={faq.question} 
                  answer={faq.answer} 
                  isOpen={openIndex === index}
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                />
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-xl"
              >
                <div className="w-24 h-24 rounded-full bg-slate-50 mx-auto mb-6 flex items-center justify-center">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold font-headline text-[#0F172A] mb-3">Nenhum registro encontrado</h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto">Parece que não temos um artigo exato para "{searchQuery}". Tente usar palavras-chave mais genéricas.</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* 4. FINAL CTA — ABACATE PAY STYLE EDITION (FAQ VERSION) */}
      </main>

      <section className="py-32 px-8 w-full bg-[#F4F4F5]">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#F97316] rounded-[3rem] p-12 md:p-24 text-white relative overflow-hidden group">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 blur-[80px] -ml-32 -mb-32 rounded-full" />
            
            <div className="relative z-10 text-center max-w-3xl mx-auto">
              <h2 className="text-5xl md:text-8xl font-headline font-black mb-10 leading-[0.95] tracking-tighter">
                Ainda com <br/> dúvidas?
              </h2>
              <p className="text-xl md:text-2xl font-medium text-orange-50 mb-14 leading-relaxed">
                Se você não encontrou o que procurava, nossa equipe de suporte e consultoria de sucesso está de prontidão para destrinchar o seu processo.
              </p>
              <div className="flex justify-center">
                <Link to="/login" className="bg-white text-[#F97316] px-16 py-7 rounded-full font-black text-xs uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-orange-900/30 flex items-center gap-4 group/btn">
                  Falar com o Suporte
                  <ArrowRight size={20} className="group-hover/btn:translate-x-2 transition-transform"/>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — COMPREHENSIVE EDITORIAL */}
      <footer className="py-8 bg-white border-t border-slate-100 relative overflow-hidden w-full">
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

export default FAQ;
