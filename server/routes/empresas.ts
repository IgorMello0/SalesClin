import { Router } from 'express'
import { prisma } from '../prisma'
import { auth } from '../middleware/auth'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response'

export const router = Router()

// Obter empresa do profissional logado
router.get('/my-company', auth(), async (req, res) => {
  try {
    let companyId: number | undefined

    if (req.user?.type === 'profissional') {
      const prof = await prisma.professional.findUnique({
        where: { id: req.user.id },
        select: { companyId: true }
      })
      companyId = prof?.companyId || undefined
    } else if (req.user?.type === 'usuario') {
      companyId = req.user.companyId || undefined
    }

    if (!companyId) {
      return res.status(404).json(createErrorResponse('Empresa não encontrada', 404))
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: companyId }
    })

    if (!empresa) {
      return res.status(404).json(createErrorResponse('Empresa não encontrada', 404))
    }

    res.json(createSuccessResponse(empresa))
  } catch (error: any) {
    console.error('[Empresas] Erro ao buscar minha empresa:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar empresa', 500))
  }
})

router.get('/', auth(), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const [items, total] = await Promise.all([
    prisma.empresa.findMany({
      skip,
      take,
      orderBy: { id: 'desc' },
      include: { usuarios: true, agentesIa: true, conversas: true }
    }),
    prisma.empresa.count()
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.empresa.findUnique({
    where: { id },
    include: { usuarios: true, agentesIa: true, conversas: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Empresa não encontrada', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), async (req, res) => {
  const { name, domain, whatsapp, apiKey, plan, isActive } = req.body
  const created = await prisma.empresa.create({ data: { name, domain, whatsapp, apiKey, plan, isActive } })
  res.status(201).json(createSuccessResponse(created))
})

router.put('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  const { name, domain, whatsapp, apiKey, plan, isActive } = req.body
  const updated = await prisma.empresa.update({ where: { id }, data: { name, domain, whatsapp, apiKey, plan, isActive } })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.empresa.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


