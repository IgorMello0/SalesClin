import { Router } from 'express'
import { prisma } from '../prisma.js'
import { auth } from '../middleware/auth.js'
import { createSuccessResponse, createErrorResponse } from '../utils/response.js'

export const router = Router()

// Helper para calcular a próxima data com base na regra de recorrência
function getNextDueDate(currentDate: Date, rule: string): Date {
  const nextDate = new Date(currentDate)
  switch (rule) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    default:
      nextDate.setDate(nextDate.getDate() + 1)
  }
  return nextDate
}

// Helper para disparar alertas urgentes (WhatsApp/E-mail)
async function fnAlertUrgentTask(task: any, assignee: any, creatorName: string, company: any) {
  const msg = `⚠️ *SALESCLIN CRM: TAREFA URGENTE DELEGADA!*\n\nOlá, ${assignee.name}. Uma nova tarefa urgente foi delegada a você por ${creatorName}.\n\n📌 *Tarefa:* ${task.title}\n📅 *Vencimento:* ${new Date(task.dueDate).toLocaleDateString('pt-BR')}\n📝 *Descrição:* ${task.description || 'Sem descrição.'}\n\nPor favor, verifique o seu painel do CRM.`

  console.log(`[Alerts] Iniciando alertas urgentes para ${assignee.name} (${assignee.email} / ${assignee.phone})`)

  // Alerta por E-mail (Simulação no console / SMTP Integrável)
  console.log(`[Alerts - E-mail] Enviando para: ${assignee.email}\nAssunto: TAREFA URGENTE - SalesClin CRM\nCorpo: ${msg}`)

  // Alerta por WhatsApp (Evolution API / Meta API)
  if (assignee.phone) {
    const cleanPhone = assignee.phone.replace(/\D/g, '')
    if (company && company.whatsapp_provider === 'evolution' && company.evolution_api_url && company.evolution_instance) {
      try {
        console.log(`[Alerts - WhatsApp] Disparando via Evolution API para: ${cleanPhone}`)
        const baseUrl = company.evolution_api_url.replace(/\/+$/, '')
        const response = await fetch(`${baseUrl}/message/sendText/${company.evolution_instance}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Adicione 'apikey' se a Evolution API exigir, geralmente buscada nas configurações da empresa ou .env
            'apikey': process.env.EVOLUTION_API_KEY || company.apiKey || ''
          },
          body: JSON.stringify({
            number: cleanPhone,
            options: {
              delay: 1000,
              presence: 'composing'
            },
            textMessage: {
              text: msg.replace(/\*/g, '') // remove markdown asterisks
            }
          })
        })
        if (!response.ok) {
          console.error(`[Alerts - WhatsApp] Erro no envio via Evolution: Status ${response.status}`)
        } else {
          console.log(`[Alerts - WhatsApp] Mensagem enviada com sucesso para ${cleanPhone}`)
        }
      } catch (err) {
        console.error('[Alerts - WhatsApp] Erro na requisição WhatsApp:', err)
      }
    } else {
      console.log(`[Alerts - WhatsApp Simulador] Provedor de WhatsApp não configurado na empresa. Mensagem simulada para: ${cleanPhone}`)
    }
  }
}

// 1. Listar tarefas do usuário logado (com filtros e busca)
router.get('/', auth(), async (req, res) => {
  try {
    const professionalId = req.user!.id
    const companyId = req.user!.companyId
    const { status, priority, dueDateRange, search, team } = req.query as any

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Clínica não definida', 400))
    }

    const where: any = {
      companyId
    }

    // Se não for rota da equipe, restringe às tarefas atribuídas ou criadas pelo usuário
    if (team !== 'true') {
      where.OR = [
        { assignedToId: professionalId },
        { createdById: professionalId }
      ]
    }

    // Filtro por Status (pendente, em andamento, concluído)
    if (status) {
      where.status = status
    }

    // Filtro por Prioridade (low, medium, high, urgent)
    if (priority) {
      where.priority = priority
    }

    // Filtro de Data
    if (dueDateRange) {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

      if (dueDateRange === 'today') {
        where.dueDate = {
          gte: todayStart,
          lte: todayEnd
        }
      } else if (dueDateRange === 'overdue') {
        where.dueDate = {
          lt: todayStart
        }
      } else if (dueDateRange === 'upcoming') {
        where.dueDate = {
          gt: todayEnd
        }
      }
    }

    // Busca textual no título ou descrição
    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, phone: true, photoUrl: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true, photoUrl: true }
        },
        client: {
          select: { id: true, name: true, email: true, phone: true }
        },
        lead: {
          select: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    })

    res.json(createSuccessResponse(tasks))
  } catch (error: any) {
    console.error('[Tasks] Erro ao buscar tarefas:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao buscar tarefas', 500))
  }
})

// 2. Criar nova tarefa
router.post('/', auth(), async (req, res) => {
  try {
    const creatorId = req.user!.id
    const companyId = req.user!.companyId
    const { title, description, priority, dueDate, assignedToId, clientId, leadId, isRecurring, recurrenceRule } = req.body

    if (!title || !dueDate || !assignedToId) {
      return res.status(400).json(createErrorResponse('Título, data de vencimento e responsável são obrigatórios.', 400))
    }

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Clínica não definida', 400))
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: 'pending',
        priority: priority || 'medium',
        dueDate: new Date(dueDate),
        assignedToId: Number(assignedToId),
        createdById: creatorId,
        companyId,
        clientId: clientId ? Number(clientId) : null,
        leadId: leadId ? Number(leadId) : null,
        isRecurring: !!isRecurring,
        recurrenceRule: isRecurring ? (recurrenceRule || 'daily') : null
      },
      include: {
        assignedTo: true,
        createdBy: true,
        company: true
      }
    })

    // Se foi atribuído a outra pessoa, dispara notificação no sininho
    if (task.assignedToId !== creatorId) {
      await prisma.notification.create({
        data: {
          title: 'Nova tarefa atribuída',
          content: `${task.createdBy.name} delegou uma tarefa a você: "${task.title}"`,
          type: 'task_assigned',
          recipientId: task.assignedToId,
          companyId: task.companyId,
          taskId: task.id
        }
      })

      // Dispara alerta se for tarefa URGENTE
      if (task.priority === 'urgent') {
        await fnAlertUrgentTask(task, task.assignedTo, task.createdBy.name, task.company)
      }
    }

    res.status(201).json(createSuccessResponse(task))
  } catch (error: any) {
    console.error('[Tasks] Erro ao criar tarefa:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao criar tarefa', 500))
  }
})

// 3. Atualizar tarefa (Status, Recorrência, etc)
router.put('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const companyId = req.user!.companyId
    const { title, description, status, priority, dueDate, assignedToId, clientId, leadId, isRecurring, recurrenceRule } = req.body

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { assignedTo: true, createdBy: true, company: true }
    })

    if (!existingTask) {
      return res.status(404).json(createErrorResponse('Tarefa não encontrada', 404))
    }

    // Se status mudou para concluída e a tarefa é recorrente
    const isNowCompleted = status === 'completed' && existingTask.status !== 'completed'

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedToId: assignedToId ? Number(assignedToId) : undefined,
        clientId: clientId !== undefined ? (clientId ? Number(clientId) : null) : undefined,
        leadId: leadId !== undefined ? (leadId ? Number(leadId) : null) : undefined,
        isRecurring: isRecurring !== undefined ? !!isRecurring : undefined,
        recurrenceRule: isRecurring ? (recurrenceRule || 'daily') : (isRecurring === false ? null : undefined)
      },
      include: {
        assignedTo: true,
        createdBy: true,
        company: true
      }
    })

    // Notificar criador se outra pessoa concluiu a tarefa dele
    if (isNowCompleted && updated.createdById !== req.user!.id) {
      await prisma.notification.create({
        data: {
          title: 'Tarefa concluída',
          content: `${updated.assignedTo.name} concluiu a tarefa: "${updated.title}"`,
          type: 'task_completed',
          recipientId: updated.createdById,
          companyId: updated.companyId,
          taskId: updated.id
        }
      })
    }

    // Lógica de Recorrência Automática
    if (isNowCompleted && updated.isRecurring && updated.recurrenceRule) {
      const nextDate = getNextDueDate(updated.dueDate, updated.recurrenceRule)
      console.log(`[Tasks] Tarefa recorrente finalizada. Criando próxima recorrência para: ${nextDate.toISOString()}`)

      const nextTask = await prisma.task.create({
        data: {
          title: updated.title,
          description: updated.description,
          status: 'pending',
          priority: updated.priority,
          dueDate: nextDate,
          assignedToId: updated.assignedToId,
          createdById: updated.createdById,
          companyId: updated.companyId,
          clientId: updated.clientId,
          leadId: updated.leadId,
          isRecurring: true,
          recurrenceRule: updated.recurrenceRule,
          parentTaskId: updated.parentTaskId || updated.id // Link para o pai raiz
        },
        include: {
          assignedTo: true,
          createdBy: true
        }
      })

      // Notificar o responsável da próxima tarefa agendada
      if (nextTask.assignedToId !== req.user!.id) {
        await prisma.notification.create({
          data: {
            title: 'Nova recorrência agendada',
            content: `Uma tarefa recorrente foi reiniciada para ${nextDate.toLocaleDateString('pt-BR')}: "${nextTask.title}"`,
            type: 'task_assigned',
            recipientId: nextTask.assignedToId,
            companyId: nextTask.companyId,
            taskId: nextTask.id
          }
        })
      }
    }

    res.json(createSuccessResponse(updated))
  } catch (error: any) {
    console.error('[Tasks] Erro ao atualizar tarefa:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao atualizar tarefa', 500))
  }
})

// 4. Deletar tarefa
router.delete('/:id', auth(), async (req, res) => {
  try {
    const id = Number(req.params.id)

    const existingTask = await prisma.task.findUnique({
      where: { id }
    })

    if (!existingTask) {
      return res.status(404).json(createErrorResponse('Tarefa não encontrada', 404))
    }

    await prisma.task.delete({
      where: { id }
    })

    res.json(createSuccessResponse({ id }))
  } catch (error: any) {
    console.error('[Tasks] Erro ao deletar tarefa:', error)
    res.status(500).json(createErrorResponse(error.message || 'Erro ao deletar tarefa', 500))
  }
})
