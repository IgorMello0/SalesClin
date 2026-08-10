import { PrismaClient } from '@prisma/client'; 
const p = new PrismaClient(); 

async function check() {
  const now = new Date();
  
  // 1. Leads com datas no futuro
  const futureLeads = await p.lead.findMany({
    where: { OR: [ { createdAt: { gt: now } }, { attendedAt: { gt: now } }, { proposalAt: { gt: now } }, { closedAt: { gt: now } } ] }
  });
  console.log('Leads com datas no futuro:', futureLeads.length);
  
  // 2. Leads com status avançado sem a data de etapa preenchida
  // Prospect_attended or beyond
  const funnels = await p.funnelConfig.findMany({ include: { stages: { orderBy: { order: 'asc' } } } });
  const commercialStages = funnels.find(f => f.code === 'commercial')?.stages.map(s => s.code) || ['comercial_proposal', 'comercial_follow', 'comercial_closed'];
  const attendedStages = ['prospect_attended', ...commercialStages];
  const closedStages = ['comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'];
  
  const missingAttended = await p.lead.count({ where: { status: { in: attendedStages }, attendedAt: null } });
  const missingProposal = await p.lead.count({ where: { status: { in: commercialStages }, proposalAt: null } });
  const missingClosed = await p.lead.count({ where: { status: { in: closedStages }, closedAt: null } });
  
  console.log('Leads avançados SEM data de comparecimento:', missingAttended);
  console.log('Leads comerciais SEM data de proposta:', missingProposal);
  console.log('Leads fechados SEM data de fechamento:', missingClosed);

  // 3. Pagamentos com datas bizarras
  const weirdPayments = await p.payment.count({
    where: { OR: [ { date: { gt: now } }, { date: { lt: new Date('2023-01-01') } } ] }
  });
  console.log('Pagamentos com datas no futuro ou muito antigas:', weirdPayments);

  // 4. Agendamentos no futuro muito distante
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 2);
  const weirdAppointments = await p.appointment.count({
    where: { date: { gt: nextYear } }
  });
  console.log('Agendamentos bizarros (2 anos no futuro):', weirdAppointments);
}

check().then(() => p.$disconnect());
