import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth, requireModule } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'

export const router = Router()

router.get('/', auth(false), requireModule('pagamentos'), async (req, res) => {
  const { skip, take, page, pageSize } = parsePagination(req.query)
  const { professionalId, clientId, status } = req.query as any
  
  let profId: number | undefined;

  if (req.user?.type === 'profissional') {
    profId = req.user.id;
  } else if (req.user?.type === 'usuario') {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.user.companyId! },
      select: { ownerId: true }
    });
    profId = empresa?.ownerId || undefined;
  } else if (professionalId) {
    profId = Number(professionalId);
  }

  if (!profId) {
    return res.json(createSuccessResponse([], { page, pageSize, total: 0 }));
  }

  const where: any = { professionalId: profId };
  if (clientId) where.clientId = Number(clientId)
  if (status) where.status = status

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      include: { professional: true, client: true, appointment: true }
    }),
    prisma.payment.count({ where })
  ])
  res.json(createSuccessResponse(items, { page, pageSize, total }))
})

router.get('/:id', auth(false), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const item = await prisma.payment.findUnique({
    where: { id },
    include: { professional: true, client: true, appointment: true }
  })
  if (!item) return res.status(404).json(createErrorResponse('Pagamento não encontrado', 404))
  res.json(createSuccessResponse(item))
})

router.post('/', auth(), requireModule('pagamentos'), async (req, res) => {
  try {
    const { appointmentId, clientId, amount, method, status, referencePeriod, date } = req.body
    
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

    const created = await prisma.payment.create({
      data: { 
        appointmentId: appointmentId ? Number(appointmentId) : null, 
        clientId: clientId ? Number(clientId) : null, 
        professionalId, 
        amount: Number(amount), 
        method, 
        status, 
        referencePeriod, 
        date: date ? new Date(date) : new Date() 
      }
    })
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Payments] Erro ao criar pagamento:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar pagamento', 500))
  }
})

router.put('/:id', auth(), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  const { appointmentId, clientId, professionalId, amount, method, status, referencePeriod, date } = req.body
  const updated = await prisma.payment.update({
    where: { id },
    data: { appointmentId, clientId, professionalId, amount, method, status, referencePeriod, date }
  })
  res.json(createSuccessResponse(updated))
})

router.delete('/:id', auth(), requireModule('pagamentos'), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.payment.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})


