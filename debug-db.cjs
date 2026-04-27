const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const users = await prisma.usuario.findMany();
  console.log("USERS:", users.map(u => ({ id: u.id, name: u.name, companyId: u.companyId })));
  
  const professionals = await prisma.professional.findMany();
  console.log("PROFESSIONALS:", professionals.map(p => ({ id: p.id, name: p.name, companyId: p.companyId })));
  
  const leads = await prisma.lead.findMany();
  console.log("LEADS:", leads.map(l => ({ id: l.id, name: l.name, profId: l.professionalId, status: l.status, createdAt: l.createdAt })));
}

debug().catch(console.error).finally(() => prisma.$disconnect());
