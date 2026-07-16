
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const payments = await prisma.payment.findMany({
    where: { method: 'transferencia' }
  })
  let gerados = 0
  let pagos = 0
  for (const p of payments) {
    if (new Date(p.date) <= new Date('2026-07-10T23:59:59.999Z') && new Date(p.date) >= new Date('2026-06-10T00:00:00.000Z')) {
      gerados += p.amount
      if (p.status === 'pago') pagos += p.amount
    }
  }
  console.log({ gerados, pagos })
}
main().finally(() => prisma['']())
