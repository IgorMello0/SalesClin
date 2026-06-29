import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'luizbucco@gmail.com'
  const professional = await prisma.professional.findUnique({
    where: { email },
    include: {
      company: true,
      ownedCompanies: true
    }
  })

  if (!professional) {
    console.log(`❌ Profissional com email ${email} não encontrado!`)
    return
  }

  console.log('👤 Profissional encontrado:')
  console.log(`  ID: ${professional.id}`)
  console.log(`  Nome: ${professional.name}`)
  console.log(`  Company ID (vinculado): ${professional.companyId}`)
  console.log(`  Company Name (vinculado): ${professional.company?.name || 'Nenhuma'}`)
  console.log(`  Plano da Empresa (vinculado): ${professional.company?.plan || 'Nenhum'}`)
  
  if (professional.ownedCompanies.length > 0) {
    console.log('\n🏢 Empresas pertencentes (ownedCompanies):')
    for (const company of professional.ownedCompanies) {
      console.log(`  - ID: ${company.id}, Nome: ${company.name}, Plano: ${company.plan}`)
      
      // Buscar subscription se existir (usando query dinâmica para evitar erros de tipagem)
      try {
        const sub = await (prisma as any).companySubscription.findUnique({
          where: { companyId: company.id }
        })
        console.log(`    Subscription found:`, sub)
      } catch (err: any) {
        console.log(`    Error fetching subscription: ${err.message}`)
      }
    }
  }

  if (professional.companyId) {
    console.log('\n🏢 Detalhes da Empresa Principal:')
    try {
      const sub = await (prisma as any).companySubscription.findUnique({
        where: { companyId: professional.companyId }
      })
      console.log(`  Subscription:`, sub)
    } catch (err: any) {
      console.log(`  Error fetching subscription: ${err.message}`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
