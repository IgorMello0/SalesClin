import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Fix typo: igormelho -> igormello
  const result = await prisma.usuario.update({
    where: { id: 1 },
    data: { email: 'igormello403@gmail.com' }
  })
  console.log('Email corrigido:', result.email)
  
  await prisma.$disconnect()
}

main().catch(async e => { 
  console.error(e)
  // Se o email já existe (profissional), verificar
  if (e.code === 'P2002') {
    console.log('\n⚠️ Email igormello403@gmail.com já existe como profissional.')
    console.log('O usuario precisa ter um email diferente do profissional.')
    console.log('Listando usuarios e profissionais com emails semelhantes...')
    
    const p = new PrismaClient()
    const usuario = await p.usuario.findUnique({ where: { id: 1 } })
    console.log('Usuario ID 1:', usuario?.email)
    await p.$disconnect()
  }
  process.exit(1) 
})
