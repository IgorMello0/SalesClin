import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.professional.update({
    where: { email: 'admin@admin.com' },
    data: { companyId: 1, companyName: 'MATRIZ' }
  })
  console.log('Admin company updated successfully')
}

main().catch(console.error)
