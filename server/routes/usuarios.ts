import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }
  const user = await prisma.usuario.findUnique({ 
    where: { email },
    include: { company: true, role: true }
  })
  if (!user) return res.status(401).json(createErrorResponse('Credenciais inválidas', 401))
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json(createErrorResponse('Credenciais inválidas', 401))
  const token = jwt.sign({ id: user.id, role: user.role?.name, companyId: user.companyId, type: 'usuario' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' })
  
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
      companyName: user.company?.name
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
    // Somente o profissional pode listar/gerenciar a equipe completa neste contexto
    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Acesso exclusivo ao profissional', 403))
    }

    // Se for profissional, buscar empresa
    const professional = await prisma.professional.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    })

    if (!professional || !professional.companyId) {
      return res.status(400).json(createErrorResponse('Profissional não possui empresa associada', 400))
    }
    const companyId = professional.companyId;

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Empresa não encontrada', 400))
    }

    const { skip, take, page, pageSize } = parsePagination(req.query)
    
    // Filtrar usuários pela empresa
    const where = { companyId }
    
    const [items, total] = await Promise.all([
      prisma.usuario.findMany({ 
        where,
        skip, 
        take, 
        orderBy: { id: 'desc' }, 
        include: { company: true, role: true } 
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

    const { name, email, password, role, isActive } = req.body
    
    console.log('[Usuarios] Dados recebidos:', { name, email, role, isActive })
    
    // Validações
    if (!name || !email || !password) {
      return res.status(400).json(createErrorResponse('Nome, email e senha são obrigatórios', 400))
    }

    if (password.length < 6) {
      return res.status(400).json(createErrorResponse('A senha deve ter pelo menos 6 caracteres', 400))
    }

    // Verificar se email já existe
    const existingUser = await prisma.usuario.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json(createErrorResponse('Email já cadastrado', 400))
    }

    const passwordHash = await bcrypt.hash(password, 10)
    
    console.log('[Usuarios] Tentando criar usuário para empresa ID:', companyId)
    
    // Usar o companyId do usuário criador
    const created = await prisma.usuario.create({ 
      data: { 
        companyId,
        name, 
        email, 
        passwordHash, 
        roleId: req.body.roleId || null, 
        isActive: isActive !== undefined ? isActive : true 
      },
      include: { company: true, role: true }
    })
    
    console.log('[Usuarios] Usuário criado com sucesso:', created.id)
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Usuarios] Erro ao criar usuário:', error)
    console.error('[Usuarios] Stack:', error.stack)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar usuário', 500))
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
      return res.status(403).json(createErrorResponse('Você não pode editar usuários de outra empresa', 403))
    }

    const { name, email, password, role, isActive } = req.body
    
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
    if (password) data.passwordHash = await bcrypt.hash(password, 10)
    
    const updated = await prisma.usuario.update({ 
      where: { id }, 
      data,
      include: { company: true, role: true }
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


