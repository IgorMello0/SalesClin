import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Desativando o módulo de conversas no banco de dados...')

  await prisma.module.update({
    where: { code: 'conversas' },
    data: { isActive: false }
  })

  console.log('❌ Módulo "conversas" desativado com sucesso (isActive: false).')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
