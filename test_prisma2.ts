
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const payments = await prisma.payment.findMany({ 
    orderBy: { id: 'desc' }, 
    take: 5 
  })
  console.log(payments)
}
main().catch(console.error).finally(() => prisma.())
