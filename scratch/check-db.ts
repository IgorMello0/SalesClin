import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== USUARIOS ===')
  const users = await prisma.usuario.findMany({ 
    include: { company: true, role: true }
  })
  users.forEach(u => {
    console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | CompanyId: ${u.companyId} | Company: ${u.company?.name} | Role: ${u.role?.name}`)
  })

  console.log('\n=== PROFISSIONAIS ===')
  const profs = await prisma.professional.findMany({
    select: { id: true, name: true, email: true, companyId: true }
  })
  profs.forEach(p => {
    console.log(`ID: ${p.id} | Name: ${p.name} | Email: ${p.email} | CompanyId: ${p.companyId}`)
  })

  console.log('\n=== EMPRESAS ===')
  const empresas = await prisma.empresa.findMany({
    select: { id: true, name: true, ownerId: true }
  })
  empresas.forEach(e => {
    console.log(`ID: ${e.id} | Name: ${e.name} | Owner: ${e.ownerId}`)
  })

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
