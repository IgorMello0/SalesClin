const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log("Iniciando limpeza do banco de dados...");
  
  // Apagar logs
  await prisma.appointmentLog.deleteMany();
  await prisma.chatLog.deleteMany();
  
  // Apagar pagamentos e faturamentos
  await prisma.payment.deleteMany();
  
  // Apagar mensagens e conversas
  await prisma.mensagem.deleteMany();
  await prisma.conversa.deleteMany();
  
  // Apagar agendamentos
  await prisma.appointment.deleteMany();
  
  // Apagar leads
  const deletedLeads = await prisma.lead.deleteMany();
  console.log(`- ${deletedLeads.count} leads deletados.`);
  
  // Apagar clientes
  const deletedClients = await prisma.client.deleteMany();
  console.log(`- ${deletedClients.count} clientes deletados.`);
  
  console.log("Limpeza concluída com sucesso! Banco está zerado.");
}

cleanup()
  .catch(e => {
    console.error("Erro na limpeza:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
