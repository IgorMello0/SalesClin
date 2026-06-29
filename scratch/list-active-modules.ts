import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const activeModules = await prisma.module.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' }
  })

  console.log('📋 Módulos Ativos no Banco de Dados:')
  activeModules.forEach(m => {
    console.log(`  - ${m.name} (${m.code})`)
  })

  const inactiveModules = await prisma.module.findMany({
    where: { isActive: false },
    orderBy: { id: 'asc' }
  })

  console.log('\n❌ Módulos Inativos/Bloqueados no Banco de Dados:')
  inactiveModules.forEach(m => {
    console.log(`  - ${m.name} (${m.code})`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
