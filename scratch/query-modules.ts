import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const modules = await prisma.module.findMany()
  console.log('MODULES:', JSON.stringify(modules, null, 2))
  await prisma.$disconnect()
}

main().catch(console.error)
