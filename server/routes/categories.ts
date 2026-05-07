import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(false), async (req, res) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query)
    
    let profId: number | undefined;

    if (req.user?.type === 'profissional') {
      profId = req.user.id;
    } else if (req.user?.type === 'usuario') {
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.user.companyId! },
        select: { ownerId: true }
      });
      profId = empresa?.ownerId || undefined;
    } else if (req.query.professionalId) {
      profId = Number(req.query.professionalId);
    }

    if (!profId) {
      return res.json(createSuccessResponse([], { page, pageSize, total: 0 }));
    }

    const where = { professionalId: profId };

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: { professional: true, catalogItems: true }
      }),
      prisma.category.count({ where })
    ])
    res.json(createSuccessResponse(items, { page, pageSize, total }))
  } catch (error: any) {
    console.error('[Categories] Erro ao buscar categorias:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar categorias', 500))
  }
})

router.get('/:id', auth(false), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.category.findUnique({
    where: { id },
    include: { professional: true, catalogItems: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Categoria não encontrada', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), async (req, res) => {
  try {
    const { name, description, status } = req.body
    
    let professionalId: number;

    if (req.user?.type === 'profissional') {
      professionalId = req.user.id;
    } else if (req.user?.type === 'usuario') {
      const empresa = await prisma.empresa.findUnique({
        where: { id: req.user.companyId! },
        select: { ownerId: true }
      });
      if (!empresa || !empresa.ownerId) {
        return res.status(400).json(createErrorResponse('Empresa ou Profissional responsável não encontrado', 400));
      }
      professionalId = empresa.ownerId;
    } else {
      return res.status(403).json(createErrorResponse('Acesso negado', 403));
    }

    const created = await prisma.category.create({ 
      data: { professionalId, name, description, status } 
    })
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    res.status(400).json(createErrorResponse(error.message || 'Erro ao criar categoria', 400))
  }
})

router.put('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { name, description, status } = req.body
    
    const current = await prisma.category.findUnique({ where: { id } });
    if (!current) return res.status(404).json(createErrorResponse('Categoria não encontrada', 404));

    let canEdit = false;
    if (req.user?.type === 'profissional' && current.professionalId === req.user.id) {
      canEdit = true;
    } else if (req.user?.type === 'usuario') {
      const empresa = await prisma.empresa.findUnique({ where: { id: req.user.companyId! } });
      if (empresa?.ownerId === current.professionalId) {
        canEdit = true;
      }
    }

    if (!canEdit) return res.status(403).json(createErrorResponse('Acesso negado', 403));

    const updated = await prisma.category.update({ 
      where: { id }, 
      data: { name, description, status } 
    })
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    res.status(400).json(createErrorResponse(error.message || 'Erro ao atualizar categoria', 400))
  }
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.category.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


