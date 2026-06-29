import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- PROFISSIONAIS ---')
  const professionals = await prisma.professional.findMany({
    select: { email: true, name: true }
  })
  professionals.forEach(p => console.log(`- ${p.name}: ${p.email}`))

  console.log('\n--- USUARIOS ---')
  const usuarios = await prisma.usuario.findMany({
    select: { email: true, name: true }
  })
  usuarios.forEach(u => console.log(`- ${u.name}: ${u.email}`))

  console.log('\n--- CLIENTES ---')
  const clients = await prisma.client.findMany({
    select: { email: true, name: true }
  })
  clients.forEach(c => console.log(`- ${c.name}: ${c.email || 'Sem email'}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
