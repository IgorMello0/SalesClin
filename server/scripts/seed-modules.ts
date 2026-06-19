import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { bootstrapSystemDefaults } from '../bootstrap/defaults.js'

const prisma = new PrismaClient()

async function main() {
  console.log('[seed] Inicializando modulos, cargos e permissoes padrao...')

  await bootstrapSystemDefaults(prisma)

  const [modulesCount, rolesCount, rolePermissionsCount, professionalPermissionsCount] = await Promise.all([
    prisma.module.count(),
    prisma.role.count(),
    prisma.rolePermission.count(),
    prisma.professionalPermission.count(),
  ])

  console.log('[seed] Concluido.')
  console.log(`[seed] modules: ${modulesCount}`)
  console.log(`[seed] roles: ${rolesCount}`)
  console.log(`[seed] role_permissions: ${rolePermissionsCount}`)
  console.log(`[seed] professional_permissions: ${professionalPermissionsCount}`)
}

main()
  .catch((error) => {
    console.error('[seed] Erro ao executar seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
