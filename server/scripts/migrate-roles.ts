import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando migração de cargos...')

  // 1. Buscar todos os módulos disponíveis
  const allModules = await prisma.module.findMany()
  console.log(`📦 Encontrados ${allModules.length} módulos no sistema.`)

  // 2. Buscar usuários que ainda não têm roleId
  const usersToMigrate = await prisma.usuario.findMany({
    where: { roleId: null },
    include: {
      company: true
    }
  })

  console.log(`👥 Encontrados ${usersToMigrate.length} usuários para migrar.`)

  // Agrupar usuários por empresa para criar um cargo "Comercial" por empresa
  const companyGroups = new Map<number, any>()
  for (const user of usersToMigrate) {
    if (!user.companyId) continue
    if (!companyGroups.has(user.companyId)) {
      companyGroups.set(user.companyId, {
        company: user.company,
        users: []
      })
    }
    companyGroups.get(user.companyId).users.push(user)
  }

  for (const [companyId, group] of companyGroups.entries()) {
    console.log(`🏢 Processando empresa: ${group.company.name} (ID: ${companyId})`)

    // Criar ou buscar o cargo "Comercial" para esta empresa
    let role = await prisma.role.findFirst({
      where: {
        companyId: companyId,
        value: 'comercial'
      }
    })

    if (!role) {
      console.log(`   ➕ Criando cargo "Comercial" para a empresa...`)
      role = await prisma.role.create({
        data: {
          companyId: companyId,
          professionalId: group.company.ownerId, // Dono da empresa
          name: 'Comercial',
          value: 'comercial'
        }
      })

      // Criar permissões totais para este cargo
      console.log(`   🔐 Liberando todos os módulos para o cargo "Comercial"...`)
      for (const module of allModules) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            moduleId: module.id,
            hasAccess: true
          }
        })
      }
    }

    // Atualizar usuários para este cargo
    console.log(`   🔗 Vinculando ${group.users.length} usuários ao cargo "Comercial"...`)
    for (const user of group.users) {
      await prisma.usuario.update({
        where: { id: user.id },
        data: { roleId: role.id }
      })
    }
  }

  console.log('✅ Migração concluída com sucesso!')
}

main()
  .catch(e => {
    console.error('❌ Erro na migração:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
