import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const professionals = await prisma.professional.findMany({
    include: {
      ownedCompanies: true,
      company: true,
    }
  })
  console.log("Professionals:", JSON.stringify(professionals, null, 2))

  const users = await prisma.usuario.findMany({
    include: {
      company: true,
      companyAccess: true
    }
  })
  console.log("Users:", JSON.stringify(users, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
