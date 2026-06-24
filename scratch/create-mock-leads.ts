import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const companyId = 1
  const professionalId = 5

  const mockLeads = [
    {
      name: 'Ana Souza',
      value: 1500.0,
      origin: 'Instagram Ad',
      status: 'prospect_lead',
      phone: '(11) 98888-8888',
      email: 'ana@gmail.com',
      notes: 'Interessada no tratamento facial.',
      responsible: 'Administrador',
      tags: ['Estética'],
      companyId,
      professionalId
    },
    {
      name: 'Carlos Silva',
      value: 3200.0,
      origin: 'Google Ads',
      status: 'prospect_qualified',
      phone: '(11) 97777-7777',
      email: 'carlos@gmail.com',
      notes: 'Qualificado. Procura implante dentário.',
      responsible: 'Administrador',
      tags: ['Implantodontia'],
      companyId,
      professionalId
    },
    {
      name: 'Lucas Santos',
      value: 5000.0,
      origin: 'Indicação',
      status: 'comercial_proposal',
      phone: '(11) 95555-5555',
      email: 'lucas@gmail.com',
      notes: 'Aguardando aprovação da proposta de ortodontia.',
      responsible: 'Administrador',
      tags: ['Ortodontia'],
      companyId,
      professionalId
    },
    {
      name: 'Maria Oliveira',
      value: 1800.0,
      origin: 'WhatsApp',
      status: 'comercial_consult',
      phone: '(11) 94444-4444',
      email: 'maria@gmail.com',
      notes: 'Realizou a consulta inicial.',
      responsible: 'Administrador',
      tags: ['Estética'],
      companyId,
      professionalId
    }
  ]

  console.log('Inserting mock leads...')
  for (const lead of mockLeads) {
    await prisma.lead.upsert({
      where: {
        phone_companyId: {
          phone: lead.phone,
          companyId: lead.companyId
        }
      },
      update: lead,
      create: lead
    })
  }
  console.log('Mock leads inserted successfully!')
}

main().catch(console.error)
