import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sellclin2024secret';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function run() {
  const companyIds = [3, 16, 17];
  let markdown = `# Relatório Detalhado de Dashboards (Este Mês)\n\n`;
  markdown += `*Gerado automaticamente para auditar as lógicas cruzadas de permissões e atribuições.*\n\n`;

  for (const compId of companyIds) {
    const comp = await prisma.empresa.findUnique({ where: { id: compId } });
    if (!comp) continue;

    markdown += `## 🏢 Clínica: ${comp.name} (ID: ${comp.id})\n\n`;

    // Pegar Usuários (Donos, Gestores, SDRs, Closers)
    const users = await prisma.usuario.findMany({
      where: {
        OR: [
          { companyId: compId },
          { companyAccess: { some: { companyId: compId } } }
        ],
        isActive: true
      },
      include: { role: true }
    });

    // Pegar Profissionais (Especialistas)
    const professionals = await prisma.professional.findMany({
      where: {
        OR: [
          { companyId: compId },
          { ownedCompanies: { some: { id: compId } } }
        ],
      }
    });

    const people = [
      ...users.map(u => ({ id: u.id, name: u.name, type: 'usuario', role: u.role?.name || 'Administrador', email: u.email })),
      ...professionals.map(p => ({ id: p.id, name: p.name, type: 'profissional', role: p.specialization || 'Especialista', email: p.email }))
    ];

    for (const person of people) {
      console.log(`Fetching for ${person.name} (${person.role})...`);
      // Generate token
      const token = jwt.sign(
        { 
          id: person.id, 
          email: person.email, 
          type: person.type,
          companyId: compId,
          allowedCompanies: [compId]
        },
        JWT_SECRET,
        { expiresIn: '1m' }
      );

      try {
        const cmd = `curl -s -H "Authorization: Bearer ${token}" -H "x-company-id: ${compId}" "http://127.0.0.1:4000/api/dashboard/metrics?filter=this_month"`;
        const resStr = require('child_process').execSync(cmd, { encoding: 'utf-8' });
        const body = JSON.parse(resStr);

        if (body.success) {
          const d = body.data;

          markdown += `### 👤 ${person.name} (${person.role})\n`;
          markdown += `- **Leads Totais (Visíveis):** ${d.leads}\n`;
          markdown += `- **Agendamentos Confirmados:** ${d.agendamentos}\n`;
          markdown += `- **Avaliações Comparecidas:** ${d.comparada}\n`;
          markdown += `- **Oportunidades (Propostas Geradas):** ${d.oportunidades}\n`;
          markdown += `- **Contratos Fechados:** ${d.contratos}\n`;
          markdown += `- **Faturamento Orçado (Total Propostas):** ${BRL.format(d.faturamento || 0)}\n`;
          markdown += `- **Faturamento Fechado (Ganhos):** ${BRL.format(d.faturamentoFechado || 0)}\n`;
          markdown += `- **Desconto Concedido:** ${BRL.format(d.totalDiscount || 0)}\n`;
          markdown += `- **Ticket Médio Orçado:** ${BRL.format(d.ticketOrcado || 0)}\n`;
          markdown += `- **Ticket Médio Fechado:** ${BRL.format(d.ticketFechado || 0)}\n`;
          markdown += `- **Conversão de Leads:** ${d.conversao}%\n`;
          markdown += `- **Conversão de Propostas:** ${d.conversaoPropostas}%\n`;
          markdown += `- **Conversão Financeira:** ${d.conversaoFinanceira}%\n`;
          
          markdown += `- **Métodos de Pagamento:**\n`;
          markdown += `  - Cartão de Crédito: ${BRL.format(d.metodos?.cartao_credito || 0)}\n`;
          markdown += `  - Pix: ${BRL.format(d.metodos?.pix || 0)}\n`;
          markdown += `  - Boleto: ${BRL.format(d.metodos?.boleto || 0)}\n`;
          markdown += `  - Dinheiro: ${BRL.format(d.metodos?.dinheiro || 0)}\n`;
          markdown += `  - Financiamento: ${BRL.format(d.metodos?.financiamento || 0)}\n`;
          markdown += `- **Parcelamento Médio (Boleto):** ${d.parcelamentoMedioBoleto?.toFixed(1) || 0}x\n\n`;

        } else {
          markdown += `### 👤 ${person.name} (${person.role})\n`;
          markdown += `*Erro ao carregar dashboard: Status ${res.status}*\n\n`;
        }
        await delay(1000);
      } catch (err: any) {
        markdown += `### 👤 ${person.name} (${person.role})\n`;
        markdown += `*Erro de conexão: ${err.message}*\n\n`;
      }
    }
    
    markdown += `---\n\n`;
  }

  const outputPath = 'C:\\Users\\samue\\.gemini\\antigravity-ide\\brain\\98f82a5c-8353-4226-b02d-159d3845fae1\\relatorio_dashboard.md';
  fs.writeFileSync(outputPath, markdown);
  console.log(`Relatorio salvo em: ${outputPath}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
