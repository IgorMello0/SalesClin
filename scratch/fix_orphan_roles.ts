import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando cargos sem profissional...')
  const roles = await prisma.role.findMany({
    where: { professionalId: null },
    include: { company: true }
  })

  for (const role of roles) {
    if (role.company?.ownerId) {
      console.log(`   🛠️ Atualizando cargo "${role.name}" (ID: ${role.id}) com ownerId: ${role.company.ownerId}`)
      await prisma.role.update({
        where: { id: role.id },
        data: { professionalId: role.company.ownerId }
      })
    } else {
      console.log(`   ⚠️ Cargo "${role.name}" (ID: ${role.id}) não tem empresa ou dono definido.`)
    }
  }
  console.log('✅ Finalizado!')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
