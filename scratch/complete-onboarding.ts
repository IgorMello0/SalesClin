import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.professional.update({
    where: { email: 'admin@admin.com' },
    data: { onboardingCompleted: true }
  })
  console.log('Admin onboarding completed in DB')
}

main().catch(console.error)
