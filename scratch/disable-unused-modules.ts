import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const unusedModules = ['contratos', 'pagamentos', 'relatorios', 'test', 'catalogos']
  const activeModules = ['dashboard', 'agendamentos', 'clientes', 'funnel', 'tarefas', 'conversas', 'metas', 'campanhas']

  console.log('🔄 Atualizando status dos módulos no banco de dados...')

  // Desativar módulos não utilizados
  for (const code of unusedModules) {
    await prisma.module.update({
      where: { code },
      data: { isActive: false }
    })
    console.log(`❌ Módulo "${code}" desativado (isActive: false).`)
  }

  // Garantir que os módulos ativos estão habilitados
  for (const code of activeModules) {
    await prisma.module.update({
      where: { code },
      data: { isActive: true }
    })
    console.log(`✅ Módulo "${code}" ativado (isActive: true).`)
  }

  console.log('\n🎉 Atualização de módulos concluída com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
