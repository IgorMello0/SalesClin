import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { bootstrapSystemDefaults } from '../server/bootstrap/defaults.js'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting bootstrap test...')
  const start = Date.now()
  await bootstrapSystemDefaults(prisma)
  const duration = ((Date.now() - start) / 1000).toFixed(2)
  console.log(`Bootstrap completed successfully in ${duration}s!`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error('Failed:', e)
  process.exit(1)
})
