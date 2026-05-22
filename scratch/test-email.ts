import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const p = await prisma.professional.findUnique({
    where: { email: 'samuesotero664@gmail.com' }
  })
  console.log('--- PROFESSIONAL FOUND ---')
  console.log(p)
  console.log('--------------------------')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
