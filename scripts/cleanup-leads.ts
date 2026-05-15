import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando limpeza de leads para aplicação de restrição...');

  try {
    // 1. Apagar leads sem telefone ou com telefone vazio
    const deletedNoPhone = await prisma.lead.deleteMany({
      where: {
        OR: [
          { phone: null },
          { phone: '' },
          { phone: 'undefined' },
          { phone: 'null' }
        ]
      }
    });
    console.log(`✅ Leads sem telefone removidos: ${deletedNoPhone.count}`);

    // 2. Buscar todos os leads para identificar duplicatas por (telefone + empresa)
    // Ordenamos por updatedAt desc para manter o mais recente
    const allLeads = await prisma.lead.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, phone: true, companyId: true }
    });

    const seen = new Set();
    const toDeleteIds: number[] = [];

    for (const lead of allLeads) {
      if (!lead.phone) continue;
      
      // Chave única por telefone e clínica
      const key = `${lead.phone.replace(/\D/g, '')}-${lead.companyId}`;
      
      if (seen.has(key)) {
        toDeleteIds.push(lead.id);
      } else {
        seen.add(key);
      }
    }

    if (toDeleteIds.length > 0) {
      const deletedDuplicates = await prisma.lead.deleteMany({
        where: { id: { in: toDeleteIds } }
      });
      console.log(`✅ Leads duplicados removidos dentro da mesma clínica: ${deletedDuplicates.count}`);
    } else {
      console.log('ℹ️ Nenhuma duplicata encontrada.');
    }

    console.log('✨ Banco de dados preparado com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
