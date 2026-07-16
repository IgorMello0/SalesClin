
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const payments = await prisma.payment.findMany({
    where: { method: 'cartao' }
  })
  let obj = {}
  for (const p of payments) {
     if (!obj[p.status]) obj[p.status] = 0;
     obj[p.status] += parseFloat(p.amount);
  }
  console.log(obj)
}
main().finally(() => prisma['']())
