import { prisma } from '../prisma.js'

export async function getCompanyOwnerProfessionalId(companyId?: number | null) {
  if (!companyId) throw new Error('Clinica ativa nao encontrada.')

  const company = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: { ownerId: true, isActive: true },
  })

  if (!company?.isActive || !company.ownerId) {
    throw new Error('Clinica sem proprietario ativo configurado.')
  }

  return company.ownerId
}

export async function assertClientBelongsToCompany(clientId: number, companyId?: number | null) {
  if (!companyId) throw new Error('Clinica ativa nao encontrada.')

  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    select: { id: true },
  })

  if (!client) throw new Error('Cliente nao encontrado nesta clinica.')
  return client
}

export async function assertLeadBelongsToCompany(leadId: number, companyId?: number | null) {
  if (!companyId) throw new Error('Clinica ativa nao encontrada.')
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, companyId },
    select: { id: true },
  })
  if (!lead) throw new Error('Lead nao encontrado nesta clinica.')
  return lead
}

export async function assertAppointmentBelongsToCompany(appointmentId: number, companyId?: number | null) {
  if (!companyId) throw new Error('Clinica ativa nao encontrada.')
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, companyId },
    select: { id: true, clientId: true },
  })
  if (!appointment) throw new Error('Agendamento nao encontrado nesta clinica.')
  return appointment
}

export async function assertUserBelongsToCompany(userId: number, companyId?: number | null) {
  if (!companyId) throw new Error('Clinica ativa nao encontrada.')
  const user = await prisma.usuario.findFirst({
    where: {
      id: userId,
      isActive: true,
      OR: [
        { companyId },
        { companyAccess: { some: { companyId, isActive: true } } },
      ],
    },
    select: { id: true },
  })
  if (!user) throw new Error('Usuario nao encontrado nesta clinica.')
  return user
}

export async function assertProfessionalBelongsToCompany(professionalId: number, companyId?: number | null) {
  if (!companyId) throw new Error('Clinica ativa nao encontrada.')
  const professional = await prisma.professional.findFirst({
    where: {
      id: professionalId,
      OR: [
        { companyId },
        { ownedCompanies: { some: { id: companyId, isActive: true } } },
      ],
    },
    select: { id: true },
  })
  if (!professional) throw new Error('Profissional nao encontrado nesta clinica.')
  return professional
}
