const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log("Iniciando limpeza do banco de dados...");
  
  // Apagar fichas
  await prisma.ficha.deleteMany();
  
  // Apagar histórico de chat e mensagens
  await prisma.chatHistory.deleteMany();
  await prisma.chatLog.deleteMany();
  await prisma.mensagem.deleteMany();
  await prisma.conversa.deleteMany();
  
  // Apagar logs de sistema e auditoria
  await prisma.appointmentLog.deleteMany();
  await prisma.auditLog.deleteMany();
  
  // Apagar financeiro
  await prisma.payment.deleteMany();
  
  // Apagar agendamentos
  await prisma.appointment.deleteMany();
  
  // Apagar leads e clientes
  const deletedLeads = await prisma.lead.deleteMany();
  console.log(`- ${deletedLeads.count} leads deletados.`);
  
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
