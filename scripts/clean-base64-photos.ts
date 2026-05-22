import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando limpeza de fotos base64 do banco de dados...');

  try {
    const professionals = await prisma.professional.findMany({
      where: {
        photoUrl: {
          startsWith: 'data:'
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    console.log(`🔍 Encontrados ${professionals.length} profissionais com foto base64.`);

    for (const prof of professionals) {
      await prisma.professional.update({
        where: { id: prof.id },
        data: { photoUrl: null }
      });
      console.log(`✅ Foto base64 limpa para o profissional: ${prof.name} (ID: ${prof.id})`);
    }

    console.log('✨ Limpeza de banco de dados concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
