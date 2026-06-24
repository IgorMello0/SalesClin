import React, { useEffect } from 'react';
import { ShieldCheck, FileText, Cookie, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SiteNavbar } from '@/components/SiteNavbar';
import { SiteFooter } from '@/components/SiteFooter';

type LegalPageKind = 'terms' | 'privacy' | 'cookies' | 'security';

type LegalSection = {
  title: string;
  body: string[];
};

const updatedAt = '24 de junho de 2026';

const pages: Record<LegalPageKind, {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  sections: LegalSection[];
}> = {
  terms: {
    eyebrow: 'Legal',
    title: 'Termos de Uso',
    description: 'Regras gerais para acesso e uso da plataforma SalesClin.',
    icon: <FileText className="h-5 w-5" />,
    sections: [
      {
        title: '1. Aceite dos termos',
        body: [
          'Ao criar uma conta, acessar ou utilizar o SalesClin, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso.',
          'Se estiver usando a plataforma em nome de uma clínica, empresa ou equipe, você declara ter autorização para aceitar estes termos em nome dessa organização.',
        ],
      },
      {
        title: '2. Uso da plataforma',
        body: [
          'O SalesClin oferece recursos de CRM, funil comercial, agenda, campanhas, tarefas, integrações e gestão operacional para clínicas.',
          'O usuário se compromete a utilizar a plataforma de forma lícita, responsável e compatível com as regras aplicáveis a dados pessoais, comunicação com clientes e relacionamento comercial.',
        ],
      },
      {
        title: '3. Conta, equipe e permissões',
        body: [
          'O administrador da clínica é responsável por gerenciar usuários, cargos, permissões internas e acessos concedidos à sua equipe.',
          'Cada usuário deve manter suas credenciais em sigilo. Atividades realizadas por uma conta autenticada poderão ser registradas para segurança e auditoria.',
        ],
      },
      {
        title: '4. Integrações externas',
        body: [
          'A plataforma pode se integrar a serviços externos, como Google Calendar, WhatsApp, provedores de pagamento e ferramentas de automação.',
          'O funcionamento dessas integrações depende de autorizações, disponibilidade e regras dos respectivos provedores. O SalesClin não controla alterações feitas por terceiros.',
        ],
      },
      {
        title: '5. Planos, teste e cobrança',
        body: [
          'O acesso a módulos, limites e recursos pode variar conforme o plano contratado, período de teste, status de pagamento e permissões internas.',
          'Ao final do período de teste ou em caso de assinatura inativa, módulos operacionais podem ser restringidos até a regularização do plano.',
        ],
      },
      {
        title: '6. Responsabilidades do cliente',
        body: [
          'A clínica é responsável pela origem, qualidade, autorização e atualização dos dados inseridos na plataforma.',
          'Também é responsabilidade da clínica observar normas profissionais, regulatórias e de privacidade aplicáveis ao seu ramo de atuação.',
        ],
      },
      {
        title: '7. Alterações e disponibilidade',
        body: [
          'O SalesClin pode evoluir recursos, ajustar interfaces, corrigir falhas, alterar planos e atualizar estes termos conforme necessário.',
          'Nosso objetivo é manter a plataforma disponível e segura, mas podem ocorrer interrupções temporárias por manutenção, instabilidade técnica ou serviços de terceiros.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Privacidade',
    title: 'Política de Privacidade',
    description: 'Como tratamos dados pessoais na operação do SalesClin.',
    icon: <ShieldCheck className="h-5 w-5" />,
    sections: [
      {
        title: '1. Dados que podemos tratar',
        body: [
          'Podemos tratar dados de cadastro, contato, autenticação, uso da plataforma, agenda, funil comercial, clientes, leads, campanhas, mensagens e registros necessários à operação do sistema.',
          'A clínica controla os dados inseridos por sua equipe e deve garantir que possui base legal adequada para coletar e utilizar esses dados.',
        ],
      },
      {
        title: '2. Finalidades de uso',
        body: [
          'Utilizamos dados para autenticar usuários, operar funcionalidades, sincronizar integrações, registrar histórico, enviar comunicações solicitadas, melhorar segurança e prestar suporte.',
          'Também podemos usar dados técnicos para prevenir abuso, investigar falhas, cumprir obrigações legais e manter a estabilidade do serviço.',
        ],
      },
      {
        title: '3. Compartilhamento com terceiros',
        body: [
          'Dados podem ser compartilhados com provedores necessários à operação, como hospedagem, banco de dados, e-mail, pagamento, Google, Meta/WhatsApp e ferramentas de infraestrutura.',
          'Esses compartilhamentos ocorrem na medida necessária para entregar os recursos contratados ou cumprir obrigações legais.',
        ],
      },
      {
        title: '4. Segurança',
        body: [
          'Aplicamos controles técnicos e organizacionais para reduzir riscos de acesso indevido, perda, alteração ou exposição de dados.',
          'Nenhum sistema é absolutamente imune a incidentes. Em caso de evento relevante, adotaremos medidas de contenção e comunicação conforme a legislação aplicável.',
        ],
      },
      {
        title: '5. Retenção e exclusão',
        body: [
          'Os dados são mantidos enquanto forem necessários para operar a conta, cumprir obrigações legais, resolver disputas, prevenir fraudes ou atender solicitações legítimas.',
          'Solicitações de exclusão ou exportação podem depender da autorização da clínica administradora da conta e das exigências legais aplicáveis.',
        ],
      },
      {
        title: '6. Direitos dos titulares',
        body: [
          'Titulares podem solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade e informações sobre compartilhamento, conforme a LGPD.',
          'Quando o SalesClin atuar como operador de dados da clínica, algumas solicitações poderão ser direcionadas à própria clínica controladora.',
        ],
      },
      {
        title: '7. Contato',
        body: [
          'Para assuntos de privacidade, segurança ou dados pessoais, entre em contato pelos canais oficiais informados no site ou suporte da plataforma.',
        ],
      },
    ],
  },
  cookies: {
    eyebrow: 'Preferências',
    title: 'Política de Cookies',
    description: 'Como usamos cookies e tecnologias semelhantes.',
    icon: <Cookie className="h-5 w-5" />,
    sections: [
      {
        title: '1. O que são cookies',
        body: [
          'Cookies são pequenos arquivos ou identificadores armazenados no navegador para lembrar preferências, manter sessões e entender o uso do serviço.',
        ],
      },
      {
        title: '2. Cookies necessários',
        body: [
          'Usamos cookies e armazenamento local essenciais para autenticação, segurança, sessão, preferências de interface e funcionamento básico da plataforma.',
          'Sem esses recursos, algumas partes do SalesClin podem não funcionar corretamente.',
        ],
      },
      {
        title: '3. Medição e melhoria',
        body: [
          'Podemos usar tecnologias de medição para entender navegação, desempenho e uso de recursos, sempre buscando melhorar a experiência e estabilidade do produto.',
        ],
      },
      {
        title: '4. Terceiros',
        body: [
          'Integrações externas, como Google, Meta, pagamentos e ferramentas de suporte, podem utilizar seus próprios cookies ou mecanismos de identificação conforme suas políticas.',
        ],
      },
      {
        title: '5. Gerenciamento',
        body: [
          'Você pode bloquear ou apagar cookies nas configurações do navegador. Algumas funcionalidades podem ser afetadas se cookies necessários forem desativados.',
        ],
      },
    ],
  },
  security: {
    eyebrow: 'Confiança',
    title: 'Segurança e LGPD',
    description: 'Práticas de proteção, acesso e responsabilidade sobre dados.',
    icon: <Lock className="h-5 w-5" />,
    sections: [
      {
        title: '1. Proteção de acesso',
        body: [
          'O SalesClin utiliza autenticação, controle de permissões por equipe e restrição de módulos conforme plano e papel do usuário.',
          'Administradores devem conceder apenas os acessos necessários para cada membro da equipe.',
        ],
      },
      {
        title: '2. Segregação por clínica',
        body: [
          'Os dados operacionais são associados à clínica correspondente. Usuários só devem acessar as clínicas às quais foram vinculados.',
          'Ambientes multi-clínica dependem da correta configuração de administradores, cargos e permissões.',
        ],
      },
      {
        title: '3. Integrações autorizadas',
        body: [
          'Integrações como Google Calendar e WhatsApp exigem autorização da conta responsável. O SalesClin usa essas autorizações para operar os recursos conectados.',
          'Credenciais sensíveis devem ser mantidas apenas no backend e em ambientes seguros.',
        ],
      },
      {
        title: '4. Boas práticas da clínica',
        body: [
          'Recomendamos senhas fortes, revisão periódica de acessos, remoção de usuários desligados, cuidado com planilhas importadas e uso responsável de campanhas.',
          'A clínica deve orientar sua equipe sobre confidencialidade, privacidade e regras internas de atendimento.',
        ],
      },
      {
        title: '5. Incidentes e suporte',
        body: [
          'Suspeitas de acesso indevido, vazamento ou comportamento incomum devem ser comunicadas imediatamente ao suporte para análise e contenção.',
        ],
      },
    ],
  },
};

export default function LegalPage({ kind }: { kind: LegalPageKind }) {
  const page = pages[kind];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [kind]);

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-body selection:bg-[#F97316]/20 flex flex-col">
      <SiteNavbar />

      <main className="flex-1">
        <section className="pt-32 pb-12 md:pt-40 md:pb-16 border-b border-slate-100 bg-white">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-[#F97316] transition-colors mb-8">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-[#F97316] mb-6">
              {page.icon}
              <span className="text-[10px] font-black uppercase tracking-[0.25em]">{page.eyebrow}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-black tracking-tighter leading-[1.05] mb-6">
              {page.title}
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
              {page.description}
            </p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-8">
              Última atualização: {updatedAt}
            </p>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            <div className="rounded-[2rem] border border-slate-100 bg-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.25)] p-6 sm:p-10 md:p-12">
              <div className="space-y-10">
                {page.sections.map((section) => (
                  <section key={section.title} className="space-y-4">
                    <h2 className="text-xl sm:text-2xl font-headline font-black tracking-tight text-[#0F172A]">
                      {section.title}
                    </h2>
                    <div className="space-y-3">
                      {section.body.map((paragraph) => (
                        <p key={paragraph} className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-12 rounded-2xl bg-slate-50 border border-slate-100 p-5 text-sm text-slate-500 font-medium leading-relaxed">
                Este documento é uma base informativa da operação do SalesClin e pode ser atualizado. Recomenda-se revisão jurídica para adequações específicas da empresa e contratos comerciais.
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
