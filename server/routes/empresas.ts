import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createErrorResponse, createSuccessResponse, parsePagination } from '../utils/response.js'
import { ensureCompanyDefaults } from '../bootstrap/defaults.js'
import { getBillingUsage } from '../services/billing.js'

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

// Obter status do WhatsApp e QR Code da Evolution API
router.get('/my-company/whatsapp/status', auth(), async (req, res) => {
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
      where: { id: companyId },
      select: { evolutionApiUrl: true, apiKey: true, evolutionInstance: true, whatsappProvider: true }
    })

    if (!empresa) {
      return res.status(404).json(createErrorResponse('Empresa não encontrada', 404))
    }

    if (empresa.whatsappProvider !== 'evolution' || !empresa.evolutionApiUrl || !empresa.apiKey || !empresa.evolutionInstance) {
      return res.json(createSuccessResponse({ status: 'NOT_CONFIGURED' }))
    }

    const baseUrl = empresa.evolutionApiUrl.replace(/\/+$/, '')
    const instance = empresa.evolutionInstance
    const apiKey = empresa.apiKey

    // 1. Checar o estado da conexão da instância
    let connectionState: any
    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
        method: 'GET',
        headers: { 'apikey': apiKey }
      })
      if (stateRes.status === 200) {
        connectionState = await stateRes.json()
      }
    } catch (e: any) {
      console.error('[WhatsApp Status] Erro ao consultar connectionState:', e.message)
    }

    // Se estiver conectado
    if (connectionState?.instance?.state === 'open') {
      return res.json(createSuccessResponse({ status: 'CONNECTED' }))
    }

    // 2. Se não estiver conectado, solicitar QR Code / Conexão
    try {
      const connectRes = await fetch(`${baseUrl}/instance/connect/${instance}`, {
        method: 'GET',
        headers: { 'apikey': apiKey }
      })

      if (connectRes.status === 200) {
        const connectData: any = await connectRes.json()
        
        // Se no meio do caminho abriu a conexão
        if (connectData?.instance?.state === 'open') {
          return res.json(createSuccessResponse({ status: 'CONNECTED' }))
        }

        // Extrair o QR Code base64
        const qrcode = connectData?.base64 || connectData?.qrcode?.base64 || connectData?.code || null
        const pairingCode = connectData?.pairingCode || null

        return res.json(createSuccessResponse({
          status: 'DISCONNECTED',
          qrcode,
          pairingCode
        }))
      }
    } catch (e: any) {
      console.error('[WhatsApp Status] Erro ao gerar QR Code:', e.message)
    }

    return res.json(createSuccessResponse({ status: 'DISCONNECTED', qrcode: null }))

  } catch (error: any) {
    console.error('[WhatsApp Status] Erro geral:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar status do WhatsApp', 500))
  }
})

// Desconectar/Logout do WhatsApp na Evolution API
router.post('/my-company/whatsapp/disconnect', auth(), async (req, res) => {
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
      where: { id: companyId },
      select: { evolutionApiUrl: true, apiKey: true, evolutionInstance: true }
    })

    if (!empresa || !empresa.evolutionApiUrl || !empresa.apiKey || !empresa.evolutionInstance) {
      return res.status(400).json(createErrorResponse('Integração não configurada', 400))
    }

    const baseUrl = empresa.evolutionApiUrl.replace(/\/+$/, '')
    const instance = empresa.evolutionInstance
    const apiKey = empresa.apiKey

    const logoutRes = await fetch(`${baseUrl}/instance/logout/${instance}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey }
    })

    const data = await logoutRes.json().catch(() => ({}))

    res.json(createSuccessResponse({ success: true, data }))
  } catch (error: any) {
    console.error('[WhatsApp Disconnect] Erro:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao desconectar WhatsApp', 500))
  }
})

// Reiniciar Instância do WhatsApp na Evolution API
router.post('/my-company/whatsapp/restart', auth(), async (req, res) => {
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
      where: { id: companyId },
      select: { evolutionApiUrl: true, apiKey: true, evolutionInstance: true }
    })

    if (!empresa || !empresa.evolutionApiUrl || !empresa.apiKey || !empresa.evolutionInstance) {
      return res.status(400).json(createErrorResponse('Integração não configurada', 400))
    }

    const baseUrl = empresa.evolutionApiUrl.replace(/\/+$/, '')
    const instance = empresa.evolutionInstance
    const apiKey = empresa.apiKey

    const restartRes = await fetch(`${baseUrl}/instance/restart/${instance}`, {
      method: 'POST',
      headers: { 'apikey': apiKey }
    })

    const data = await restartRes.json().catch(() => ({}))

    res.json(createSuccessResponse({ success: true, data }))
  } catch (error: any) {
    console.error('[WhatsApp Restart] Erro:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao reiniciar WhatsApp', 500))
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

// Listar todas as clínicas do profissional logado
router.get('/my-companies', auth(), async (req, res) => {
  try {
    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Apenas proprietários podem listar filiais', 403))
    }

    const professional = await prisma.professional.findUnique({
      where: { id: req.user.id },
      select: { companyId: true }
    })

    const empresas = await prisma.empresa.findMany({
      where: { 
        OR: [
          { ownerId: req.user.id },
          { id: professional?.companyId || -1 }
        ]
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json(createSuccessResponse(empresas))
  } catch (error: any) {
    console.error('[Empresas] Erro ao listar empresas:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar empresas', 500))
  }
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
  try {
    if (req.user?.type !== 'profissional') {
      return res.status(403).json(createErrorResponse('Apenas proprietários podem criar clínicas', 403))
    }

    const usage = await getBillingUsage(req.user.id, req.user.companyId)
    if (!usage.clinics.canCreate) {
      return res.status(402).json(createErrorResponse('Limite de clinicas do plano atingido.', 402, {
        limitType: 'clinics',
        addonCode: 'extra_clinic',
        used: usage.clinics.used,
        limit: usage.clinics.limit,
      }))
    }

    const { name, domain, whatsapp, apiKey, plan, isActive, openHour, closeHour } = req.body
    
    const created = await prisma.empresa.create({ 
      data: { 
        name, 
        domain, 
        whatsapp, 
        apiKey, 
        plan, 
        isActive, 
        openHour, 
        closeHour,
        ownerId: req.user.id // Vincula a empresa ao dono que está criando
      } 
    })
    await ensureCompanyDefaults(prisma, created.id, req.user.id)
    res.status(201).json(createSuccessResponse(created))
  } catch (error: any) {
    console.error('[Empresas] Erro ao criar empresa:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar clínica', 500))
  }
})

router.put('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const {
      name, domain, whatsapp, apiKey, plan, isActive, openHour, closeHour,
      // Campos de integração WhatsApp
      whatsappProvider, evolutionApiUrl, evolutionInstance, metaToken, metaPhoneNumberId
    } = req.body

    const data: any = {}
    if (name !== undefined) data.name = name
    if (domain !== undefined) data.domain = domain
    if (whatsapp !== undefined) data.whatsapp = whatsapp
    if (apiKey !== undefined) data.apiKey = apiKey
    if (plan !== undefined) data.plan = plan
    if (isActive !== undefined) data.isActive = isActive
    if (openHour !== undefined) data.openHour = openHour
    if (closeHour !== undefined) data.closeHour = closeHour
    if (whatsappProvider !== undefined) data.whatsappProvider = whatsappProvider
    if (evolutionApiUrl !== undefined) data.evolutionApiUrl = evolutionApiUrl
    if (evolutionInstance !== undefined) data.evolutionInstance = evolutionInstance
    if (metaToken !== undefined) data.metaToken = metaToken
    if (metaPhoneNumberId !== undefined) data.metaPhoneNumberId = metaPhoneNumberId

    const updated = await prisma.empresa.update({ where: { id }, data })
    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Empresas] Erro ao atualizar empresa:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar clínica', 500))
  }
})

router.delete('/:id', auth(), async (req, res) => {
  const id = Number(req.params.id)
  await prisma.empresa.delete({ where: { id } })
  res.json(createSuccessResponse({ id }))
})
