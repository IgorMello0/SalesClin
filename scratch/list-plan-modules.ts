import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const planModules = await (prisma as any).planModule.findMany({
    include: {
      module: true
    },
    orderBy: [
      { planCode: 'asc' },
      { moduleId: 'asc' }
    ]
  })

  console.log('📋 Mapeamento de Planos e Módulos (PlanModule):')
  const grouped: Record<string, string[]> = {}
  for (const pm of planModules) {
    if (!grouped[pm.planCode]) {
      grouped[pm.planCode] = []
    }
    grouped[pm.planCode].push(`${pm.module.name} (${pm.module.code})`)
  }

  for (const [planCode, modules] of Object.entries(grouped)) {
    console.log(`\nPlano: ${planCode}`)
    modules.forEach(m => console.log(`  - ${m}`))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
