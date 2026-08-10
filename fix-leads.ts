import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando correção de Leads Fechados...')
  
  const closedStages = ['comercial_closed', 'sales_payment', 'sales_contract', 'sales_post'];

  const updated = await prisma.lead.updateMany({
    where: {
      status: { in: closedStages },
      subStatus: null // ou que não sejam 'won'
    },
    data: {
      subStatus: 'won'
    }
  });

  console.log(`Leads corrigidos (atualizados para "won"): ${updated.count}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
