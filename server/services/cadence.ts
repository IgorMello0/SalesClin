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

    const steps = config.steps as any[];
    if (!Array.isArray(steps) || steps.length === 0) return;

    // 3. Pegar o primeiro passo (index 0)
    const firstStep = steps[0];
    const waitValue = firstStep.waitValue !== undefined ? Number(firstStep.waitValue) : (Number(firstStep.waitMinutes) || 0);
    const waitUnit = firstStep.waitUnit || 'minutes';
    let waitMinutes = 0;
    if (waitUnit === 'days') waitMinutes = waitValue * 24 * 60;
    else if (waitUnit === 'hours') waitMinutes = waitValue * 60;
    else waitMinutes = waitValue;

    const dueDate = new Date(Date.now() + waitMinutes * 60000);

    // 4. Criar a tarefa
    await prisma.task.create({
      data: {
        companyId,
        leadId,
        title: firstStep.title || 'Cadência de Contato',
        description: firstStep.template || `Contato via ${firstStep.method}`,
        status: 'pending',
        priority: 'high',
        dueDate,
        assignedToUserId: assignedUserId,
        assignedToId: assignedProfId,
        cadenceStageCode: newStageCode,
        cadenceStepIndex: 0
      }
    });

    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'system',
        content: `🤖 Cadência iniciada. Passo 1 agendado: ${firstStep.title || 'Contato'}`,
        createdBy: 'Cadência Automática'
      }
    });
    
    console.log(`[Cadence] Cadência iniciada para Lead #${leadId} no estágio ${newStageCode}`);
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

    const config = await prisma.cadenceConfig.findUnique({
      where: { companyId_stageCode: { companyId: task.companyId, stageCode: task.cadenceStageCode } }
    });

    if (!config || !config.isActive) return;

    const steps = config.steps as any[];
    if (!Array.isArray(steps)) return;

    const nextIndex = task.cadenceStepIndex + 1;
    if (nextIndex >= steps.length) {
      // Fim da cadência!
      console.log(`[Cadence] Cadência finalizada para Lead #${task.leadId} no estágio ${task.cadenceStageCode}`);
      return;
    }

    // Agendar próximo passo
    const nextStep = steps[nextIndex];
    const waitValue = nextStep.waitValue !== undefined ? Number(nextStep.waitValue) : (Number(nextStep.waitMinutes) || 0);
    const waitUnit = nextStep.waitUnit || 'minutes';
    let waitMinutes = 0;
    if (waitUnit === 'days') waitMinutes = waitValue * 24 * 60;
    else if (waitUnit === 'hours') waitMinutes = waitValue * 60;
    else waitMinutes = waitValue;

    const dueDate = new Date(Date.now() + waitMinutes * 60000);

    await prisma.task.create({
      data: {
        companyId: task.companyId,
        leadId: task.leadId,
        title: nextStep.title || 'Cadência de Contato',
        description: nextStep.template || `Contato via ${nextStep.method}`,
        status: 'pending',
        priority: 'high',
        dueDate,
        assignedToUserId: task.assignedToUserId, // Mantém o mesmo responsável (Usuário)
        assignedToId: task.assignedToId, // Mantém o mesmo responsável (Profissional)
        cadenceStageCode: task.cadenceStageCode,
        cadenceStepIndex: nextIndex
      }
    });

    await prisma.leadActivity.create({
      data: {
        leadId: task.leadId!,
        type: 'system',
        content: `✅ Passo concluído: ${task.title}. Próximo passo agendado: ${nextStep.title || 'Contato'}`,
        createdBy: 'Cadência Automática'
      }
    });

    console.log(`[Cadence] Próximo passo (${nextIndex}) agendado para Lead #${task.leadId}`);
  } catch (err) {
    console.error(`[Cadence] Erro ao processar conclusão da task ${taskId}:`, err);
  }
}
