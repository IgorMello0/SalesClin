import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando atribuição de SDRs...");

  // 1. Encontrar as empresas
  const seteLagoas = await prisma.empresa.findFirst({ where: { name: { contains: "Sete Lagoas" } } });
  const paraopeba = await prisma.empresa.findFirst({ where: { name: { contains: "Paraopeba" } } });

  if (!seteLagoas || !paraopeba) {
    console.error("Empresas não encontradas!");
    return;
  }
  console.log(`Sete Lagoas ID: ${seteLagoas.id}, Paraopeba ID: ${paraopeba.id}`);

  // 2. Encontrar Flavia Melo e Bruna
  const flavia = await prisma.usuario.findFirst({ where: { email: 'prevendasbucco30@gmail.com' } });
  const bruna = await prisma.usuario.findFirst({ where: { email: 'brunamkt88@gmail.com' } });

  if (!flavia || !bruna) {
    console.error("Usuárias (Flavia ou Bruna) não encontradas pelo email!");
    return;
  }
  console.log(`Flavia ID: ${flavia.id}, Bruna ID: ${bruna.id}`);

  // 3. Atualizar Sete Lagoas
  const updatedSeteLagoas = await prisma.lead.updateMany({
    where: {
      companyId: seteLagoas.id,
      sdrId: null
    },
    data: {
      sdrId: flavia.id
    }
  });
  console.log(`-> Bucco Sete Lagoas: ${updatedSeteLagoas.count} leads soltos foram atribuídos para a SDR Flávia Melo.`);

  // 4. Atualizar Paraopeba
  const updatedParaopeba = await prisma.lead.updateMany({
    where: {
      companyId: paraopeba.id,
      sdrId: null
    },
    data: {
      sdrId: bruna.id
    }
  });
  console.log(`-> Bucco Paraopeba: ${updatedParaopeba.count} leads soltos foram atribuídos para a SDR Bruna Helen.`);

  console.log("Finalizado com sucesso!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
