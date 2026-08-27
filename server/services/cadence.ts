import { prisma } from '../prisma.js'

/**
 * Inicia ou reinicia a cadência de contato para um lead que acabou de entrar em um novo estágio.
 */
export async function triggerCadenceForLead(
  leadId: number, 
  companyId: number, 
  newStageCode: string, 
  assignedUserId?: number | null,
  assignedProfId?: number | null
) {
  try {
    // 1. Cancelar tarefas de cadência pendentes (que eram do estágio anterior)
    await prisma.task.updateMany({
      where: {
        leadId,
        cadenceStageCode: { not: null },
        status: 'pending'
      },
      data: {
        status: 'cancelled'
      }
    });

    // 2. Buscar a configuração de cadência para o novo estágio
    const config = await prisma.cadenceConfig.findUnique({
      where: { companyId_stageCode: { companyId, stageCode: newStageCode } }
    });

    if (!config || !config.isActive) return;

    let steps: any[] = [];
    let skipWeekends = true;

    if (Array.isArray(config.steps)) {
      steps = config.steps;
    } else if (config.steps && typeof config.steps === 'object') {
      steps = (config.steps as any).items || [];
      skipWeekends = (config.steps as any).skipWeekends ?? true;
    }

    if (steps.length === 0) return;

    // 3. Criar todas as tarefas baseadas no dia configurado
    // Primeiro ordenamos os steps por dia
    const sortedSteps = [...steps].sort((a, b) => (a.day || 1) - (b.day || 1));
    const baseDatePerDay = new Map<number, Date>();

    const taskPromises = sortedSteps.map((step, index) => {
      const day = step.day !== undefined ? Number(step.day) : 1; 

      let dueDate: Date;

      if (baseDatePerDay.has(day)) {
        // Já existe uma tarefa neste dia, usa a data dela como base
        dueDate = new Date(baseDatePerDay.get(day)!.getTime());
      } else {
        // Primeira tarefa do dia
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (day > 0 ? day - 1 : 0));
        
        if (skipWeekends) {
          const dayOfWeek = dueDate.getDay(); // 0 = Domingo, 6 = Sábado
          if (dayOfWeek === 6) {
            dueDate.setDate(dueDate.getDate() + 2); // De Sábado para Segunda
          } else if (dayOfWeek === 0) {
            dueDate.setDate(dueDate.getDate() + 1); // De Domingo para Segunda
          }
        }

        // Se for um dia futuro, começa às 08:00
        if (day > 1) {
          dueDate.setHours(8, 0, 0, 0);
        }
      }

      // Adiciona o intervalo configurado (em minutos ou horas)
      const intervalType = step.intervalType || 'minutes';
      const intervalValue = step.intervalValue ?? step.intervalMinutes ?? 0;
      
      if (intervalType === 'hours') {
        dueDate.setHours(dueDate.getHours() + Number(intervalValue));
      } else {
        dueDate.setMinutes(dueDate.getMinutes() + Number(intervalValue));
      }

      // Salva a data base para a próxima tarefa do mesmo dia
      baseDatePerDay.set(day, new Date(dueDate.getTime()));

      return prisma.task.create({
        data: {
          companyId,
          leadId,
          title: step.title || 'Cadência de Contato',
          description: step.template || `Contato via ${step.method}`,
          status: 'pending',
          priority: 'high',
          dueDate,
          assignedToUserId: assignedUserId,
          assignedToId: assignedProfId,
          cadenceStageCode: newStageCode,
          cadenceStepIndex: index
        }
      });
    });

    await Promise.all(taskPromises);

    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'system',
        content: `🤖 Cadência iniciada. ${steps.length} tarefa(s) agendada(s) automaticamente.`,
        createdBy: 'Cadência Automática'
      }
    });
    
    console.log(`[Cadence] Cadência iniciada para Lead #${leadId} no estágio ${newStageCode} com ${steps.length} tarefas.`);
  } catch (err) {
    console.error(`[Cadence] Erro ao iniciar cadência para lead ${leadId}:`, err);
  }
}

/**
 * Processa a conclusão de uma tarefa de cadência e agenda o próximo passo automaticamente.
 */
export async function processCadenceTaskCompletion(taskId: number) {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || !task.cadenceStageCode || task.cadenceStepIndex === null) return;
    
    // Buscar se o lead ainda está neste estágio
    const lead = await prisma.lead.findUnique({ where: { id: task.leadId! } });
    if (!lead || lead.status !== task.cadenceStageCode) {
      // O lead mudou de estágio, a cadência antiga não deve continuar
      return;
    }

    // Apenas loga a atividade de conclusão, já que todos os próximos passos 
    // já foram criados na entrada da etapa (Modelo de Dias)
    await prisma.leadActivity.create({
      data: {
        leadId: task.leadId!,
        type: 'system',
        content: `✅ Tarefa de cadência concluída: ${task.title}.`,
        createdBy: 'Cadência Automática'
      }
    });

    console.log(`[Cadence] Tarefa (${task.cadenceStepIndex}) concluída para Lead #${task.leadId}`);
  } catch (err) {
    console.error(`[Cadence] Erro ao processar conclusão da task ${taskId}:`, err);
  }
}
