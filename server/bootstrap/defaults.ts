import { PrismaClient } from '@prisma/client'

type PrismaExecutor = PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

export const DEFAULT_MODULES = [
  {
    code: 'dashboard',
    name: 'Dashboard',
    description: 'Visao geral e metricas do sistema',
    icon: 'LayoutDashboard',
  },
  {
    code: 'agendamentos',
    name: 'Agendamentos',
    description: 'Gerenciamento de agendamentos',
    icon: 'Calendar',
  },
  {
    code: 'clientes',
    name: 'Clientes',
    description: 'Cadastro e gestao de clientes e leads',
    icon: 'Users',
  },
  {
    code: 'relatorios',
    name: 'Relatorios',
    description: 'Visualizacao de relatorios e analises',
    icon: 'BarChart3',
  },
  {
    code: 'pagamentos',
    name: 'Pagamentos',
    description: 'Gestao financeira e pagamentos',
    icon: 'DollarSign',
  },
  {
    code: 'conversas',
    name: 'Conversas',
    description: 'Chat e mensagens com clientes',
    icon: 'MessageCircle',
  },
  {
    code: 'catalogos',
    name: 'Catalogos',
    description: 'Gerenciamento de servicos e produtos',
    icon: 'Package',
  },
  {
    code: 'contratos',
    name: 'Contratos',
    description: 'Contratos e documentos',
    icon: 'FileText',
  },
  {
    code: 'funnel',
    name: 'Funil de Vendas',
    description: 'Gestao de funil de vendas e conversao',
    icon: 'Filter',
  },
  {
    code: 'metas',
    name: 'Metas',
    description: 'Engenharia reversa e simulador de metas',
    icon: 'TrendingUp',
  },
  {
    code: 'tarefas',
    name: 'Tarefas',
    description: 'Gestao de tarefas, prazos e alertas',
    icon: 'CheckSquare',
  },
  {
    code: 'campanhas',
    name: 'Campanhas',
    description: 'Campanhas de mensagens em massa',
    icon: 'Megaphone',
  },
]

const DEFAULT_ROLES = [
  { name: 'Administrador', value: 'admin' },
  { name: 'Comercial', value: 'comercial' },
]

export async function ensureDefaultModules(prisma: PrismaExecutor) {
  for (const module of DEFAULT_MODULES) {
    await prisma.module.upsert({
      where: { code: module.code },
      update: {
        name: module.name,
        description: module.description,
        icon: module.icon,
        isActive: true,
      },
      create: module,
    })
  }
}

export async function ensureCompanyDefaults(
  prisma: PrismaExecutor,
  companyId: number,
  professionalId?: number | null
) {
  await ensureDefaultModules(prisma)

  const ownerId = professionalId ?? await resolveCompanyOwnerId(prisma, companyId)
  if (!ownerId) return

  const modules = await prisma.module.findMany({ where: { isActive: true } })

  for (const roleTemplate of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        companyId_value: {
          companyId,
          value: roleTemplate.value,
        },
      },
      update: {
        name: roleTemplate.name,
        professionalId: ownerId,
      },
      create: {
        companyId,
        professionalId: ownerId,
        name: roleTemplate.name,
        value: roleTemplate.value,
      },
    })

    for (const module of modules) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_moduleId: {
            roleId: role.id,
            moduleId: module.id,
          },
        },
        update: { hasAccess: true },
        create: {
          roleId: role.id,
          moduleId: module.id,
          hasAccess: true,
        },
      })
    }
  }

  await ensureUsersHaveRole(prisma, companyId)
}

export async function bootstrapSystemDefaults(prisma: PrismaClient) {
  await ensureDefaultModules(prisma)

  const companies = await prisma.empresa.findMany({
    select: { id: true, ownerId: true },
  })

  for (const company of companies) {
    await ensureCompanyDefaults(prisma, company.id, company.ownerId)
  }
}

async function resolveCompanyOwnerId(prisma: PrismaExecutor, companyId: number) {
  const company = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: { ownerId: true },
  })

  if (company?.ownerId) return company.ownerId

  const professional = await prisma.professional.findFirst({
    where: { companyId },
    orderBy: { id: 'asc' },
    select: { id: true },
  })

  return professional?.id
}

async function ensureUsersHaveRole(prisma: PrismaExecutor, companyId: number) {
  const defaultRole = await prisma.role.findUnique({
    where: {
      companyId_value: {
        companyId,
        value: 'comercial',
      },
    },
  })

  if (!defaultRole) return

  await prisma.usuario.updateMany({
    where: {
      companyId,
      roleId: null,
    },
    data: {
      roleId: defaultRole.id,
    },
  })

  const accesses = await prisma.userCompanyAccess.findMany({
    where: {
      companyId,
      roleId: null,
    },
    select: {
      userId: true,
      companyId: true,
    },
  })

  for (const access of accesses) {
    await prisma.userCompanyAccess.update({
      where: {
        userId_companyId: {
          userId: access.userId,
          companyId: access.companyId,
        },
      },
      data: {
        roleId: defaultRole.id,
      },
    })
  }
}
