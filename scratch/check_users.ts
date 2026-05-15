import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.usuario.findMany({
    include: {
      company: {
        include: {
          owner: true
        }
      }
    }
  })
  
  console.log('--- USUARIOS ENCONTRADOS ---')
  users.forEach(u => {
    console.log(`ID: ${u.id}, Email: ${u.email}, Company: ${u.company?.name}, OwnerID: ${u.company?.ownerId}`)
  })
  console.log('----------------------------')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
