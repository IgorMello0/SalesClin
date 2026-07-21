import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ensureCompanyDefaults } from '../bootstrap/defaults.js'
import { assertCanAddUserToCompany, BillingLimitError } from '../services/billing.js'
import { sendTeamInviteEmail } from '../services/email-verification.js'

export const router = Router()

async function getOwnedCompanyIds(professionalId: number) {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    include: { ownedCompanies: true },
  })

  if (!professional || !professional.companyId) {
    return null
  }

  const ownedCompanyIds = professional.ownedCompanies.map((company) => company.id)
  if (professional.companyId && !ownedCompanyIds.includes(professional.companyId)) {
    ownedCompanyIds.push(professional.companyId)
  }

  return { professional, ownedCompanyIds }
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }
  const emailAddress = String(email || '').trim().toLowerCase()
  if (!emailAddress || !password) {
    return res.status(400).json(createErrorResponse('Email e senha sao obrigatorios', 400))
  }
  const user = await prisma.usuario.findUnique({ 
    where: { email: emailAddress },
    include: {
      company: { select: { id: true, name: true } },
      role: true,
      companyAccess: {
        include: {
          company: { select: { id: true, name: true } },
          role: true,
        },
      },
    }
  })
  if (!user) return res.status(401).json(createErrorResponse('Credenciais inválidas', 401))
  if (!user.isActive || !user.emailVerified) {
    return res.status(403).json(createErrorResponse('Aceite o convite enviado para seu e-mail antes de acessar.', 403))
  }

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json(createErrorResponse('Credenciais inválidas', 401))
  
  const availableCompanies = user.companyAccess.length > 0
    ? user.companyAccess.map(ca => ({ id: ca.company.id, name: ca.company.name, role: ca.role?.name }))
    : (user.company ? [{ id: user.company.id, name: user.company.name, role: user.role?.name }] : [])

  const allowedCompanies = availableCompanies.map(c => c.id)

  const token = jwt.sign({ 
    id: user.id, 
    role: user.role?.value || user.role?.name, 
    companyId: user.companyId, 
    type: 'usuario',
    allowedCompanies 
  }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' })

  // Retornar dados do usuário no mesmo formato que profissional
  res.json(createSuccessResponse({ 
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      role: user.role?.name, // Nome do cargo para o frontend
      phone: '',
      onboardingCompleted: user.onboardingCompleted,
      companyId: user.companyId,
      companyName: user.company?.name,
      companies: availableCompanies
    }
  }))
})

// Completar o Onboarding para Usuário
router.post('/onboarding/complete', auth(), async (req, res) => {
  try {
    await prisma.usuario.update({
      where: { id: req.user!.id },
      data: { onboardingCompleted: true }
    });
    res.json(createSuccessResponse({ success: true }));
  } catch (error) {
    console.error('[Onboarding Usuario] Erro ao concluir:', error);
    res.status(500).json(createErrorResponse('Erro ao concluir onboarding', 500));
  }
})

router.get('/', auth(), async (req, res) => {
  try {
    // Lista a equipe da clinica ativa para seletores e telas de gestao.
    let ownedCompanyIds: number[] = []

    if (req.user?.type !== 'profissional' && req.user?.type !== 'usuario') {
      return res.status(403).json(createErrorResponse('Tipo de usuario sem acesso a equipe', 403))
    }

    if (req.user?.type === 'usuario') {
      if (!req.user.companyId) {
        return res.status(400).json(createErrorResponse('Clinica nao definida', 400))
      }

      ownedCompanyIds = [req.user.companyId]
    } else {
      // Buscar profissional com as empresas que ele controla ou que estao no token.
      const professional = await prisma.professional.findUnique({
        where: { id: req.user.id },
        include: { ownedCompanies: true }
      })

      if (!professional || !professional.companyId) {
        return res.status(400).json(createErrorResponse('Profissional nao possui empresa associada', 400))
      }

      ownedCompanyIds = Array.from(new Set([
        ...(req.user.companyId ? [req.user.companyId] : []),
        ...(req.user.allowedCompanies || []),
        professional.companyId,
        ...professional.ownedCompanies.map(c => c.id),
      ].filter(Boolean) as number[]))
    }

    if (ownedCompanyIds.length === 0) {
      return res.status(400).json(createErrorResponse('Empresa não encontrada', 400))
    }

    const { skip, take, page, pageSize } = parsePagination(req.query)
    
    // Buscar usuários que pertencem diretamente OU que têm acesso via tabela ponte
    const where = {
      OR: [
        { companyId: { in: ownedCompanyIds } },
        { companyAccess: { some: { companyId: { in: ownedCompanyIds } } } }
      ]
    }
    
    const [items, total] = await Promise.all([
      prisma.usuario.findMany({ 
        where,
        skip, 
        take, 
        orderBy: { id: 'desc' }, 
        include: {
          company: { select: { id: true, name: true } },
          role: true,
          companyAccess: {
            include: {
              company: { select: { id: true, name: true } },
              role: true,
            },
          },
        }
      }),
      prisma.usuario.count({ where })
    ])
    
    res.json(createSuccessResponse(items, { page, pageSize, total }))
  } catch (error: any) {
    console.error('[Usuarios] Erro ao buscar usuários:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar usuários', 500))
  }
})

router.post('/', auth(), async (req, res) => {
  try {
    console.log('[Usuarios] Iniciando criação de usuário')
    console.log('[Usuarios] User autenticado:', req.user)
    
    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Somente o profissional pode criar membros da equipe', 403))
    }

    const professional = await prisma.professional.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, companyId: true }
    })

    if (!professional || !professional.companyId) {
      return res.status(400).json(createErrorResponse('Profissional não possui empresa associada', 400))
    }
    
    const companyId = professional.companyId;

    const { name, email, role, isActive, companyIds } = req.body
    const emailAddress = String(email || '').toLowerCase().trim()
    
    console.log('[Usuarios] Dados recebidos:', { name, email, role, isActive, companyIds })
    
    // Validações
    if (!name || !emailAddress) {
      return res.status(400).json(createErrorResponse('Nome e email sao obrigatorios', 400))
    }

    const ownership = await getOwnedCompanyIds(req.user.id)
    if (!ownership) {
      return res.status(400).json(createErrorResponse('Profissional nao possui empresa associada', 400))
    }

    // Verificar se email já existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email: emailAddress },
      include: {
        company: true,
        role: true,
        companyAccess: { include: { company: true, role: true } },
      },
    })
    if (existingUser) {
      const existingCompanyIds = Array.from(new Set([
        ...(existingUser.companyId ? [existingUser.companyId] : []),
        ...existingUser.companyAccess.map((access) => access.companyId),
      ]))
      const hasSharedCompany = existingCompanyIds.some((existingCompanyId) => ownership.ownedCompanyIds.includes(existingCompanyId))

      if (hasSharedCompany && (!existingUser.isActive || !existingUser.emailVerified)) {
        const inviteCompanyName = existingUser.company?.name || existingUser.companyAccess[0]?.company?.name
        await sendTeamInviteEmail({
          email: existingUser.email,
          name: existingUser.name,
          companyName: inviteCompanyName,
          userId: existingUser.id,
        })
        return res.json(createSuccessResponse({ ...existingUser, inviteResent: true }))
      }

      if (hasSharedCompany) {
        return res.status(400).json(createErrorResponse('Este e-mail ja pertence a um funcionario ativo da equipe', 400))
      }

      return res.status(400).json(createErrorResponse('Email ja cadastrado', 400))
    }

    console.log('[Usuarios] Tentando criar usuário para empresa ID:', companyId)
    
    // Definir clinica principal
    let primaryCompanyId = companyId;
    if (Array.isArray(companyIds) && companyIds.length > 0) {
      primaryCompanyId = companyIds[0];
    }

    // Usar o companyId do usuário criador
    const targetCompanyIds = Array.isArray(companyIds) && companyIds.length > 0
      ? Array.from(new Set(companyIds.map((id: any) => Number(id)).filter(Boolean)))
      : [companyId]

    for (const targetCompanyId of targetCompanyIds) {
      try {
        await assertCanAddUserToCompany(professional.id, targetCompanyId)
      } catch (error: any) {
        if (error instanceof BillingLimitError) {
          return res.status(error.status).json(createErrorResponse(error.message, error.status, {
            limitType: error.limitType,
            addonCode: error.addonCode,
            used: error.used,
            limit: error.limit,
            targetCompanyId,
          }))
        }
        throw error
      }
    }

    await ensureCompanyDefaults(prisma, companyId, professional.id)
    const defaultRole = await prisma.role.findUnique({
      where: {
        companyId_value: {
          companyId: primaryCompanyId,
          value: 'comercial',
        },
      },
    })
    const roleId = req.body.roleId || defaultRole?.id || null

      const created = await prisma.usuario.create({ 
      data: { 
        companyId: primaryCompanyId,
        name, 
        email: emailAddress,
        passwordHash: '',
        roleId, 
        isActive: false,
        emailVerified: false,
        emailVerifiedAt: null,
        leadRoutingWeight: req.body.leadRoutingWeight !== undefined ? Number(req.body.leadRoutingWeight) : 1
      },
      include: { company: true, role: true }
    })
    
    // Criar o acesso inicial garantido na tabela ponte
    if (Array.isArray(companyIds) && companyIds.length > 0) {
      for (const cId of companyIds) {
        await prisma.userCompanyAccess.create({
          data: {
            userId: created.id,
            companyId: cId,
            roleId: created.roleId,
            isActive: true
          }
        });
      }
    } else {
      // Se não vier array, cria pelo menos para a clinica ativa
      await prisma.userCompanyAccess.create({
        data: {
          userId: created.id,
          companyId: companyId,
          roleId: created.roleId,
          isActive: true
        }
      });
    }
    
    try {
      await sendTeamInviteEmail({
        email: created.email,
        name: created.name,
        companyName: created.company?.name,
        userId: created.id,
      })
    } catch (emailError) {
      await prisma.usuario.delete({ where: { id: created.id } }).catch((cleanupError) => {
        console.error('[Usuarios] Falha ao limpar usuario apos erro de convite:', cleanupError)
      })
      throw emailError
    }

    console.log('[Usuarios] Usuário criado com sucesso:', created.id)
    const createdWithAccess = await prisma.usuario.findUnique({
      where: { id: created.id },
      include: { company: true, role: true, companyAccess: { include: { company: true, role: true } } },
    })
    res.status(201).json(createSuccessResponse(createdWithAccess || created))
  } catch (error: any) {
    console.error('[Usuarios] Erro ao criar usuário:', error)
    console.error('[Usuarios] Stack:', error.stack)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar usuário', 500))
  }
})

router.post('/:id/resend-invite', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Somente o profissional pode reenviar convites da equipe', 403))
    }

    const ownership = await getOwnedCompanyIds(req.user.id)
    if (!ownership) {
      return res.status(400).json(createErrorResponse('Profissional nao possui empresa associada', 400))
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        company: true,
        companyAccess: { include: { company: true } },
      },
    })

    if (!usuario) {
      return res.status(404).json(createErrorResponse('Usuario nao encontrado', 404))
    }

    const userCompanyIds = Array.from(new Set([
      ...(usuario.companyId ? [usuario.companyId] : []),
      ...usuario.companyAccess.map((access) => access.companyId),
    ]))
    const hasSharedCompany = userCompanyIds.some((companyId) => ownership.ownedCompanyIds.includes(companyId))
    if (!hasSharedCompany) {
      return res.status(403).json(createErrorResponse('Voce nao tem permissao para reenviar convite deste usuario', 403))
    }

    if (usuario.isActive && usuario.emailVerified) {
      return res.status(400).json(createErrorResponse('Este usuario ja aceitou o convite', 400))
    }

    const inviteCompanyName = usuario.company?.name || usuario.companyAccess[0]?.company?.name
    await sendTeamInviteEmail({
      email: usuario.email,
      name: usuario.name,
      companyName: inviteCompanyName,
      userId: usuario.id,
    })

    res.json(createSuccessResponse({ sent: true }))
  } catch (error: any) {
    console.error('[Usuarios] Erro ao reenviar convite:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao reenviar convite', 500))
  }
})

router.put('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    
    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Somente o profissional pode editar membros da equipe', 403))
    }

    const professional = await prisma.professional.findUnique({
      where: { id: req.user.id },
      include: { ownedCompanies: true }
    })

    if (!professional) {
      return res.status(400).json(createErrorResponse('Profissional não encontrado', 400))
    }
    
    const ownedCompanyIds = professional.ownedCompanies.map(c => c.id);
    if (professional.companyId && !ownedCompanyIds.includes(professional.companyId)) {
      ownedCompanyIds.push(professional.companyId);
    }

    // Verificar se o usuário existe
    const usuario = await prisma.usuario.findUnique({ where: { id }, include: { companyAccess: true } })
    if (!usuario) {
      return res.status(404).json(createErrorResponse('Usuário não encontrado', 404))
    }

    // Só permite editar se o usuário tiver acesso a alguma clínica que o profissional seja dono
    const userCompanyIds = usuario.companyAccess.map(ca => ca.companyId);
    userCompanyIds.push(usuario.companyId!); // Garante que o legado é checado
    
    const hasSharedCompany = userCompanyIds.some(cId => ownedCompanyIds.includes(cId));
    if (!hasSharedCompany) {
      return res.status(403).json(createErrorResponse('Você não tem permissão para editar este usuário', 403))
    }

    const { name, email, password, role, isActive, companyIds, leadRoutingWeight } = req.body
    
    // Validações
    if (!name || !email) {
      return res.status(400).json(createErrorResponse('Nome e email são obrigatórios', 400))
    }

    if (password && password.length < 6) {
      return res.status(400).json(createErrorResponse('A senha deve ter pelo menos 6 caracteres', 400))
    }

    // Verificar se email já existe (exceto para o próprio usuário)
    if (email !== usuario.email) {
      const existingUser = await prisma.usuario.findUnique({ where: { email } })
      if (existingUser) {
        return res.status(400).json(createErrorResponse('Email já cadastrado', 400))
      }
    }

    const data: any = { name, email, roleId: req.body.roleId, isActive }
    if (leadRoutingWeight !== undefined) data.leadRoutingWeight = Number(leadRoutingWeight)
    if (password) data.passwordHash = await bcrypt.hash(password, 10)
    
    // Atualizar Múltiplas Clínicas
    if (Array.isArray(companyIds)) {
      // Filtra apenas as clínicas que o dono realmente controla (evita injeção)
      const validCompanyIds = companyIds.filter(id => ownedCompanyIds.includes(id));
      
      if (validCompanyIds.length > 0) {
        const existingCompanyIds = Array.from(new Set([
          ...(usuario.companyId ? [usuario.companyId] : []),
          ...usuario.companyAccess.filter((access) => access.isActive).map((access) => access.companyId),
        ]))

        for (const cId of validCompanyIds) {
          if (!existingCompanyIds.includes(cId) && isActive !== false) {
            try {
              await assertCanAddUserToCompany(professional.id, cId, id)
            } catch (error: any) {
              if (error instanceof BillingLimitError) {
                return res.status(error.status).json(createErrorResponse(error.message, error.status, {
                  limitType: error.limitType,
                  addonCode: error.addonCode,
                  used: error.used,
                  limit: error.limit,
                  targetCompanyId: cId,
                }))
              }
              throw error
            }
          }
        }
        // Exclui acessos antigos apenas nas clínicas da rede desse dono
        await prisma.userCompanyAccess.deleteMany({
          where: { userId: id, companyId: { in: ownedCompanyIds } }
        });
        
        // Insere os novos
        for (const cId of validCompanyIds) {
          await prisma.userCompanyAccess.create({
            data: { userId: id, companyId: cId, roleId: req.body.roleId, isActive }
          });
        }
        
        // Atualiza a clínica principal se necessário
        if (!validCompanyIds.includes(usuario.companyId!)) {
          data.companyId = validCompanyIds[0];
        }
      }
    }
    
    const updated = await prisma.usuario.update({ 
      where: { id }, 
      data,
      include: { company: true, role: true, companyAccess: true }
    })
    
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Usuarios] Erro ao atualizar usuário:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Usuário não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar usuário', 500))
  }
})

router.delete('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    
    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Somente o profissional pode excluir membros da equipe', 403))
    }

    const professional = await prisma.professional.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    })

    if (!professional || !professional.companyId) {
      return res.status(400).json(createErrorResponse('Profissional não possui empresa associada', 400))
    }
    const companyId = professional.companyId;

    // Verificar se o usuário pertence à mesma empresa
    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario) {
      return res.status(404).json(createErrorResponse('Usuário não encontrado', 404))
    }

    if (usuario.companyId !== companyId) {
      return res.status(403).json(createErrorResponse('Você não pode excluir usuários de outra empresa', 403))
    }

    await prisma.usuario.delete({ where: { id } })
    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Usuarios] Erro ao deletar usuário:', error)
    if (error.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Usuário não encontrado', 404))
    }
    res.status(500).json(createErrorResponse(error.message || 'Erro ao deletar usuário', 500))
  }
})
