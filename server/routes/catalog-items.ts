import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(false), requireModule('catalogos'), async (req, res) => {
  try {
    const { skip, take, page, pageSize } = parsePagination(req.query)
    let profId: number | undefined;

    if (req.user?.type === 'profissional') {
      profId = req.user.id;
    } else if (req.user?.type === 'usuario') {
      // Buscar o dono da empresa do usuário
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

    const where: any = { professionalId: profId };

    const [items, total] = await Promise.all([
      prisma.catalogItem.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: { professional: true, category: true, appointments: true }
      }),
      prisma.catalogItem.count({ where })
    ])
    res.json(createSuccessResponse(items, { page, pageSize, total }))
  } catch (error: any) {
    console.error('[Catalog] Erro ao buscar itens:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar itens', 500))
  }
})

router.get('/:id', auth(false), requireModule('catalogos'), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.catalogItem.findUnique({
    where: { id },
    include: { professional: true, category: true, appointments: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Item de catálogo não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('catalogos'), async (req, res) => {
  try {
    const { categoryId, name, description, price, imageUrl, status, durationMinutes } = req.body
    
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

    const categoryIdNum = categoryId ? Number(categoryId) : null
    
    const created = await prisma.catalogItem.create({
      data: { 
        professionalId, 
        categoryId: categoryIdNum, 
        name, 
        description, 
        price: Number(price), 
        imageUrl, 
        status, 
        durationMinutes: Number(durationMinutes) || 30
      }
    })
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    res.status(400).json(createErrorResponse(error.message || 'Erro ao criar item de catálogo', 400))
  }
})

router.put('/:id', auth(), requireModule('catalogos'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { categoryId, name, description, price, imageUrl, status, durationMinutes } = req.body
    
    const current = await prisma.catalogItem.findUnique({ where: { id } });
    if (!current) return res.status(404).json(createErrorResponse('Item não encontrado', 404));

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

    const categoryIdNum = categoryId ? Number(categoryId) : null
    
    const updated = await prisma.catalogItem.update({
      where: { id },
      data: { 
        categoryId: categoryIdNum, 
        name, 
        description, 
        price: price !== undefined ? Number(price) : undefined, 
        imageUrl, 
        status, 
        durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined
      }
    })
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    res.status(400).json(createErrorResponse(error.message || 'Erro ao atualizar item de catálogo', 400))
  }
})

router.delete('/:id', auth(), requireModule('catalogos'), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.catalogItem.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


