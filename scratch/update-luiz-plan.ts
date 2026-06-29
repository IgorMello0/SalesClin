import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const companyIds = [3, 16]

  console.log('🔄 Atualizando planos para plano Enterprise (sem limites)...')

  for (const companyId of companyIds) {
    // 1. Atualizar Empresa
    const company = await prisma.empresa.update({
      where: { id: companyId },
      data: {
        plan: 'enterprise',
        isActive: true
      }
    })
    console.log(`✅ Empresa #${companyId} (${company.name}) atualizada para plano 'enterprise'.`)

    // 2. Atualizar ou criar CompanySubscription
    const subscription = await (prisma as any).companySubscription.upsert({
      where: { companyId },
      update: {
        planCode: 'enterprise',
        status: 'active',
        trialEndsAt: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000) // 10 anos
      },
      create: {
        companyId,
        planCode: 'enterprise',
        billingCycle: 'monthly',
        status: 'active',
        trialEndsAt: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000)
      }
    })
    console.log(`✅ Subscription da Empresa #${companyId} atualizada para 'enterprise'/'active'.`)
  }

  console.log('\n🎉 Atualização concluída com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
