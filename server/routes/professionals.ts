import { Router } from 'express'
import { prisma } from '../prisma'
import { auth } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const router = Router()

// Login de profissional
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string }
    
    if (!email || !password) {
      return res.status(400).json(createErrorResponse('Email e senha são obrigatórios', 400))
    }
    
    console.log('[Login] Tentativa de login:', email)
    
    const professional = await prisma.professional.findUnique({ 
      where: { email },
      include: { company: true }
    })
    if (!professional) {
      console.log('[Login] Profissional não encontrado:', email)
      return res.status(401).json(createErrorResponse('Credenciais inválidas', 401))
    }
    
    const ok = await bcrypt.compare(password, professional.passwordHash)
    if (!ok) {
      console.log('[Login] Senha incorreta para:', email)
      return res.status(401).json(createErrorResponse('Credenciais inválidas', 401))
    }
    
    const token = jwt.sign({ id: professional.id, type: 'profissional' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' })
    console.log('[Login] Login bem-sucedido:', email)
    
    res.json(createSuccessResponse({ 
      token, 
      professional: { 
        id: professional.id.toString(), 
        name: professional.name, 
        email: professional.email, 
        phone: professional.phone || '', 
        specialization: professional.specialization || '',
        company: professional.company ? {
          id: professional.company.id,
          name: professional.company.name
        } : null
      } 
    }))
  } catch (error) {
    console.error('[Login] Erro:', error)
    res.status(500).json(createErrorResponse('Erro interno do servidor', 500))
  }
})
// Obter perfil do profissional logado
router.get('/me', auth(), async (req, res) => {
  try {
    const professional = await prisma.professional.findUnique({
      where: { id: req.user!.id },
      include: { company: true }
    })
    if (!professional) {
      return res.status(404).json(createErrorResponse('Profissional não encontrado', 404))
    }
    res.json(createSuccessResponse(professional))
  } catch (error) {
    console.error('[Profile] Erro:', error)
    res.status(500).json(createErrorResponse('Erro interno do servidor', 500))
  }
})

// Atualizar perfil do profissional logado
router.put('/me', auth(), async (req, res) => {
  try {
    const { name, phone, specialization, photoUrl, bio, crm } = req.body

    const updated = await prisma.professional.update({
      where: { id: req.user!.id },
      data: { 
        name, 
        phone, 
        specialization, 
        photoUrl,
        bio,
        crm
      },
      include: { company: true }
    })

    res.json(createSuccessResponse(updated))
  } catch (error) {
    console.error('[Profile] Erro ao atualizar:', error)
    res.status(500).json(createErrorResponse('Erro interno do servidor', 500))
  }
})

// Listar profissionais
router.get('/', auth(false), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  
  const where: any = {}
  if (req.user?.type === 'profissional') {
    const currentProf = await prisma.professional.findUnique({ where: { id: req.user.id } })
    if (currentProf?.companyId) {
      where.companyId = currentProf.companyId
    }
  }

  const [items, total] = await Promise.all([
    prisma.professional.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        specialization: true,
        phone: true,
        companyId: true
      }
    }),
    prisma.professional.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

// Obter por id
router.get('/:id', auth(false), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.professional.findUnique({
    where: { id },
    include: {
      categories: true,
      catalogItems: true,
      appointments: true,
      payments: true,
      fichaTemplates: true,
      fichas: true,
      chatHistories: true,
      settingsProfile: true,
      auditLogs: true,
      contracts: true,
      conversas: true
    }
  })
  if (!item) return res.status(404).json(createErrorResponse('Profissional não encontrado', 404))
  res.json(createSuccessResponse(item))
})

// Criar (signup público - cria nova empresa)
router.post('/', async (req, res) => {
  try {
    const { name, email, password, phone, specialization, companyName, logoUrl, contractType } = req.body
    
    if (!name || !email || !password) {
      return res.status(400).json(createErrorResponse('Nome, email e senha são obrigatórios', 400))
    }
    
    if (password.length < 6) {
      return res.status(400).json(createErrorResponse('A senha deve ter pelo menos 6 caracteres', 400))
    }
    
    console.log('[Signup] Tentativa de cadastro:', email)
    
    const existing = await prisma.professional.findUnique({ where: { email } })
    if (existing) {
      console.log('[Signup] Email já cadastrado:', email)
      return res.status(400).json(createErrorResponse('Email já cadastrado', 400))
    }
    
    const passwordHash = await bcrypt.hash(password, 10)
    
    // Criar empresa primeiro
    const empresaNome = companyName || `Empresa de ${name}`
    console.log('[Signup] Criando empresa:', empresaNome)
    
    const empresa = await prisma.empresa.create({
      data: {
        name: empresaNome,
        isActive: true
      }
    })
    
    console.log('[Signup] Empresa criada com ID:', empresa.id)
    
    // Criar profissional associado à empresa
    const created = await prisma.professional.create({
      data: { 
        name, 
        email, 
        passwordHash, 
        phone, 
        specialization, 
        companyId: empresa.id,
        companyName, 
        logoUrl, 
        contractType 
      },
      include: {
        company: true
      }
    })

    // Set the professional as the owner of the company
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { ownerId: created.id }
    })
    
    const token = jwt.sign({ id: created.id, type: 'profissional' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' })
    console.log('[Signup] Cadastro bem-sucedido:', email)
    
    res.status(201).json(createSuccessResponse({ 
      token, 
      professional: { 
        id: created.id.toString(), 
        name: created.name, 
        email: created.email, 
        phone: created.phone || '', 
        specialization: created.specialization || '',
        company: created.company ? {
          id: created.company.id,
          name: created.company.name
        } : null
      } 
    }))
  } catch (error) {
    console.error('[Signup] Erro:', error)
    res.status(500).json(createErrorResponse('Erro interno do servidor', 500))
  }
})

// Adicionar profissional à mesma equipe (logado)
router.post('/equipe', auth(), async (req, res) => {
  try {
    const { name, email, password, phone, specialization, role } = req.body
    
    if (!name || !email || !password) {
      return res.status(400).json(createErrorResponse('Nome, email e senha são obrigatórios', 400))
    }
    
    if (password.length < 6) {
      return res.status(400).json(createErrorResponse('A senha deve ter pelo menos 6 caracteres', 400))
    }
    
    const existing = await prisma.professional.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json(createErrorResponse('Email já cadastrado', 400))
    }

    const currentProf = await prisma.professional.findUnique({ where: { id: req.user!.id } })
    if (!currentProf || !currentProf.companyId) {
      return res.status(400).json(createErrorResponse('Empresa não encontrada', 400))
    }
    
    const passwordHash = await bcrypt.hash(password, 10)
    
    const created = await prisma.professional.create({
      data: { 
        name, 
        email, 
        passwordHash, 
        phone, 
        specialization: specialization || role, 
        companyId: currentProf.companyId,
        companyName: currentProf.companyName, 
      }
    })
    
    res.status(201).json(createSuccessResponse({ 
      id: created.id.toString(), 
      name: created.name, 
      email: created.email, 
      phone: created.phone || '', 
      specialization: created.specialization || ''
    }))
  } catch (error) {
    console.error('[AddEquipe] Erro:', error)
    res.status(500).json(createErrorResponse('Erro interno do servidor', 500))
  }
})

// Atualizar
router.put('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const { name, email, passwordHash, phone, specialization, companyName, logoUrl, contractType } = req.body
  const updated = await prisma.professional.update({
    where: { id },
    data: { name, email, passwordHash, phone, specialization, companyName, logoUrl, contractType }
  })
  res.json(createSuccessResponse(updated))
})

// Deletar
router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.professional.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})

// Listar clientes de um profissional
router.get('/:id/clientes', auth(false), async (req, res) => {
  const professionalId = Number(req.params.id)
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where: { professionalId },
      skip,
      take,
      include: { appointments: true, payments: true, fichas: true, chatHistories: true, conversas: true },
      orderBy: { id: 'desc' }
    }),
    prisma.client.count({ where: { professionalId } })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})


