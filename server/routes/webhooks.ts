import { Router } from 'express';
import { prisma } from '../prisma.js';
import { createErrorResponse, createSuccessResponse } from '../utils/response.js';
import {
  getPeriodEndForCycle,
  getProductIdForPlan,
  isBillingCycle,
  isPlanCode,
  markWebhookEventProcessed,
  verifyAbacateWebhookSignature,
  type BillingCycle,
  type PlanCode,
} from '../services/billing.js';

export const router = Router();

function planAndCycleFromProductId(productId?: string | null) {
  if (!productId) return null;

  for (const planCode of ['start', 'pro'] as PlanCode[]) {
    for (const billingCycle of ['monthly', 'yearly'] as BillingCycle[]) {
      if (productId === getProductIdForPlan(planCode, billingCycle)) {
        return { planCode, billingCycle };
      }
    }
  }

  return null;
}

function companyIdFromExternalId(externalId?: string | null) {
  const match = externalId?.match(/^sellclin-(\d+)-/);
  return match ? Number(match[1]) : null;
}

function normalizeAbacateStatus(eventName: string, payloadStatus?: string | null) {
  const event = eventName.toLowerCase();
  const status = payloadStatus?.toLowerCase() || '';

  if (event.includes('cancel') || status.includes('cancel')) return 'canceled';
  if (event.includes('expired') || status.includes('expired')) return 'expired';
  if (event.includes('failed') || event.includes('refused') || status.includes('failed') || status.includes('refused')) {
    return 'payment_pending';
  }
  if (event.includes('trial_started')) return 'active';
  if (event.includes('completed') || event.includes('renewed') || status === 'active' || status === 'paid') {
    return 'active';
  }

  return 'payment_pending';
}

router.post('/abacate-pay', async (req, res) => {
  try {
    const expectedSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
    const querySecret = typeof req.query.webhookSecret === 'string' ? req.query.webhookSecret : undefined;

    if (expectedSecret && querySecret !== expectedSecret) {
      return res.status(401).json(createErrorResponse('Webhook nao autorizado', 401));
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
    const signature = req.headers['x-webhook-signature'];
    const signatureValue = Array.isArray(signature) ? signature[0] : signature;

    if (!verifyAbacateWebhookSignature(rawBody, signatureValue)) {
      return res.status(401).json(createErrorResponse('Assinatura invalida', 401));
    }

    const body = req.body || {};
    const eventId = body.id || body.eventId;
    const eventName = body.event || body.type || body.eventType || 'unknown';

    if (!eventId) {
      return res.status(400).json(createErrorResponse('Evento sem id', 400));
    }

    const alreadyProcessed = await prisma.billingWebhookEvent.findUnique({
      where: { eventId },
    });

    if (alreadyProcessed) {
      return res.json(createSuccessResponse({ received: true, duplicate: true }));
    }

    const data = body.data || {};
    const subscription = data.subscription || data;
    const checkout = data.checkout || {};
    const payment = data.payment || {};
    const itemProductId = checkout.items?.[0]?.id || subscription.items?.[0]?.id;
    const metadata = checkout.metadata || subscription.metadata || body.metadata || {};
    const parsedCompanyId = Number(metadata.companyId);
    const companyId = Number.isFinite(parsedCompanyId) && parsedCompanyId > 0
      ? parsedCompanyId
      : companyIdFromExternalId(checkout.externalId || payment.externalId || subscription.externalId || body.externalId);
    const productMatch = planAndCycleFromProductId(itemProductId);
    const planCode = metadata.planCode || productMatch?.planCode;
    const billingCycle = metadata.billingCycle || productMatch?.billingCycle;

    if (!companyId) {
      return res.status(400).json(createErrorResponse('Evento sem clinica vinculada', 400));
    }

    const normalizedStatus = normalizeAbacateStatus(eventName, subscription.status || checkout.status || payment.status);
    const resolvedPlanCode = isPlanCode(planCode) ? planCode : undefined;
    const resolvedBillingCycle = isBillingCycle(billingCycle) ? billingCycle : undefined;
    const subscriptionId = subscription.id || data.subscriptionId || body.subscriptionId || null;
    const checkoutId = checkout.id || data.checkoutId || body.checkoutId || null;
    const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : undefined;
    const canceledAt = subscription.canceledAt
      ? new Date(subscription.canceledAt)
      : normalizedStatus === 'canceled'
        ? new Date()
        : undefined;

    await prisma.companySubscription.update({
      where: { companyId },
      data: {
        ...(resolvedPlanCode ? { planCode: resolvedPlanCode } : {}),
        ...(resolvedBillingCycle ? { billingCycle: resolvedBillingCycle } : {}),
        status: normalizedStatus,
        ...(trialEndsAt ? { trialEndsAt } : {}),
        currentPeriodEndsAt: normalizedStatus === 'active' ? getPeriodEndForCycle(resolvedBillingCycle || 'monthly') : undefined,
        abacateSubscriptionId: subscriptionId,
        abacateCheckoutId: checkoutId,
        canceledAt,
      },
    });

    if (resolvedPlanCode) {
      await prisma.empresa.update({
        where: { id: companyId },
        data: { plan: resolvedPlanCode },
      });
    }

    await markWebhookEventProcessed(eventId, eventName, body);

    return res.json(createSuccessResponse({ received: true }));
  } catch (error: any) {
    console.error('[Webhook/AbacatePay] Erro:', error);
    return res.status(500).json(createErrorResponse(error.message || 'Erro ao processar webhook', 500));
  }
});

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

/** Remove @s.whatsapp.net, @c.us, country-code prefix quirks and keep only digits */
function normalizePhone(raw: string): string {
  return raw.replace(/@.*$/, '').replace(/\D/g, '');
}

/** Find the company that owns a given Evolution instance name */
async function findCompanyByInstance(instance: string) {
  const trimmed = instance.trim();
  return prisma.empresa.findFirst({
    where: { 
      evolutionInstance: {
        equals: trimmed,
        mode: 'insensitive'
      },
      isActive: true 
    },
    select: { id: true, ownerId: true, name: true }
  });
}

/** Find the company that owns a given Meta phone-number ID */
async function findCompanyByMetaPhoneId(phoneNumberId: string) {
  return prisma.empresa.findFirst({
    where: { metaPhoneNumberId: phoneNumberId, isActive: true },
    select: { id: true, ownerId: true, name: true }
  });
}

/**
 * Core logic shared by Evolution and Meta webhooks.
 * 1. Looks up the lead by phone WITHIN the clinic (companyId).
 * 2. If missing → creates it as "prospect_lead" (Novo).
 * 3. Creates / reuses a Conversa (chat thread) for the phone+company.
 * 4. Stores the incoming message as a Mensagem for the future in-app chat.
 */
async function processIncomingMessage(opts: {
  companyId: number;
  ownerId: number | null;
  phone: string;
  pushName: string;
  messageText: string;
  rawPayload: any;
  origin: string; // 'WhatsApp' | 'WhatsApp Official'
}) {
  const { companyId, ownerId, phone, pushName, messageText, rawPayload, origin } = opts;

  if (!ownerId) {
    console.warn(`[Webhook] Empresa #${companyId} sem ownerId. Ignorando.`);
    return { action: 'ignored', reason: 'no_owner' };
  }

  // ── 1. Verificar se o Lead já existe DENTRO DESTA CLÍNICA ──
  let lead = await prisma.lead.findFirst({
    where: { phone, companyId }
  });

  let action: 'created' | 'existing' = 'existing';

  if (!lead) {
    // ── 2. Criar novo lead na clínica ──
    lead = await prisma.lead.create({
      data: {
        professionalId: ownerId,
        companyId,
        name: pushName || 'Contato WhatsApp',
        phone,
        status: 'prospect_lead', // Novo no funil
        origin,
        notes: messageText ? `Primeira mensagem: ${messageText}` : null,
        tags: ['whatsapp-auto'],
        isScheduled: false,
        value: 0
      }
    });

    // Registrar atividade de criação
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'sistema',
        content: `Lead criado automaticamente via ${origin}. Nome: "${pushName}".`,
        createdBy: 'Sistema'
      }
    });

    action = 'created';
    console.log(`[Webhook] ✅ Lead #${lead.id} criado para ${phone} na clínica #${companyId}`);
  } else {
    // ── 3. Lead já existe — registrar nova atividade ──
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'sistema',
        content: `Novo contato recebido via ${origin}: "${messageText?.substring(0, 120) || '(mídia)'}"`,
        createdBy: 'Sistema'
      }
    });
    console.log(`[Webhook] ♻️ Lead #${lead.id} já existia para ${phone} na clínica #${companyId}`);
  }

  // ── 4. Criar/reusar Conversa (chat thread) ──
  let conversa = await prisma.conversa.findFirst({
    where: { phone, companyId }
  });

  if (!conversa) {
    conversa = await prisma.conversa.create({
      data: {
        companyId,
        leadId: lead.id,
        professionalId: ownerId,
        phone,
        app: 'whatsapp',
        channel: origin,
        startedAt: new Date()
      }
    });
  }

  // ── 5. Salvar mensagem no histórico do chat ──
  await prisma.mensagem.create({
    data: {
      conversationId: conversa.id,
      sender: 'cliente',
      content: messageText || '(mídia)',
      rawJson: rawPayload,
      origin
    }
  });

  return { action, leadId: lead.id, conversaId: conversa.id };
}


// ═══════════════════════════════════════════════════════════
// 1) WEBHOOK — EVOLUTION API (MESSAGES_UPSERT)
// ═══════════════════════════════════════════════════════════
//
// URL SEGURA (com token único por clínica):
//   POST https://<domain>/api/webhooks/evolution/<webhookToken>
//
// URL LEGADA (fallback por nome de instância — menos seguro):
//   POST https://<domain>/api/webhooks/evolution
//

/** Lógica compartilhada de processamento do payload da Evolution */
async function handleEvolutionPayload(body: any, empresa: { id: number; ownerId: number | null; name: string }) {
  // ── Validar evento ──
  const event = body.event || '';
  if (!event.includes('messages') && !event.includes('MESSAGES')) {
    return { received: true, ignored: true, reason: 'not_message_event' };
  }

  const data = body.data || body;
  const key = data.key || {};

  // Ignorar mensagens enviadas por mim (fromMe)
  if (key.fromMe === true) {
    return { received: true, ignored: true, reason: 'fromMe' };
  }

  // Ignorar mensagens de grupo
  const remoteJid = key.remoteJid || '';
  if (remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) {
    return { received: true, ignored: true, reason: 'group' };
  }

  // ── Extrair dados ──
  const phone = normalizePhone(remoteJid);
  const pushName = data.pushName || data.senderName || '';
  const messageObj = data.message || {};
  const messageText = messageObj.conversation
    || messageObj.extendedTextMessage?.text
    || messageObj.imageMessage?.caption
    || messageObj.videoMessage?.caption
    || '';

  if (!phone) {
    return { received: true, ignored: true, reason: 'no_phone' };
  }

  // ── Processar ──
  const result = await processIncomingMessage({
    companyId: empresa.id,
    ownerId: empresa.ownerId,
    phone,
    pushName,
    messageText,
    rawPayload: body,
    origin: 'WhatsApp'
  });

  return { success: true, ...result };
}

// ── ROTA PRINCIPAL: com token exclusivo da clínica na URL ──
router.post('/evolution/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Identificar clínica pelo token único (100% seguro, sem depender de nome de instância)
    const empresa = await prisma.empresa.findUnique({
      where: { webhookToken: token },
      select: { id: true, ownerId: true, name: true, isActive: true }
    });

    if (!empresa || !empresa.isActive) {
      console.warn(`[Webhook/Evolution] Token "${token}" não encontrado ou empresa inativa.`);
      return res.json({ received: true, ignored: true, reason: 'invalid_token' });
    }

    console.log(`[Webhook/Evolution] ✅ Recebido para clínica "${empresa.name}" (ID: ${empresa.id})`);

    const result = await handleEvolutionPayload(req.body, empresa);
    return res.json(result);

  } catch (error: any) {
    console.error('[Webhook/Evolution] Erro:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
});

// ── ROTA LEGADA: sem token, usa nome da instância (compatibilidade retroativa) ──
router.post('/evolution', async (req, res) => {
  try {
    const body = req.body;

    const event = body.event || '';
    if (!event.includes('messages') && !event.includes('MESSAGES')) {
      return res.json({ received: true, ignored: true });
    }

    const instance = body.instance || body.instanceName || '';

    if (!instance) {
      return res.status(400).json(createErrorResponse('Dados insuficientes (instance)', 400));
    }

    // Identificar clínica pela instância (fallback — menos seguro)
    const empresa = await findCompanyByInstance(instance);
    if (!empresa) {
      console.warn(`[Webhook/Evolution] Instância "${instance}" não encontrada no DB.`);
      return res.json({ received: true, ignored: true, reason: 'unknown_instance' });
    }

    console.log(`[Webhook/Evolution/Legacy] Recebido via rota legada para "${empresa.name}" (ID: ${empresa.id})`);

    const result = await handleEvolutionPayload(body, empresa);
    return res.json(result);

  } catch (error: any) {
    console.error('[Webhook/Evolution] Erro:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
});


// ═══════════════════════════════════════════════════════════
// 2) WEBHOOK — META OFFICIAL WHATSAPP BUSINESS API
// ═══════════════════════════════════════════════════════════
//
// URL SEGURA (com token):
//   GET  https://<domain>/api/webhooks/meta/<webhookToken>
//   POST https://<domain>/api/webhooks/meta/<webhookToken>
//
// URL LEGADA (sem token):
//   GET  https://<domain>/api/webhooks/meta
//   POST https://<domain>/api/webhooks/meta
//

/** Lógica compartilhada de verificação do Meta challenge */
function handleMetaVerification(req: any, res: any) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && challenge) {
    console.log('[Webhook/Meta] Challenge verificado com sucesso.');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

/** Lógica compartilhada de processamento de mensagens do Meta */
async function handleMetaMessages(body: any, empresaOverride?: { id: number; ownerId: number | null; name: string }) {
  if (!body.entry || !Array.isArray(body.entry)) {
    return;
  }

  for (const entry of body.entry) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field !== 'messages') continue;

      const value = change.value || {};
      const metadata = value.metadata || {};
      const phoneNumberId = metadata.phone_number_id || '';
      const messages = value.messages || [];
      const contacts = value.contacts || [];

      if (messages.length === 0) continue;

      // Se já temos a empresa via token, usar ela. Senão, buscar pelo phoneNumberId
      let empresa = empresaOverride;
      if (!empresa) {
        if (!phoneNumberId) continue;
        empresa = await findCompanyByMetaPhoneId(phoneNumberId);
        if (!empresa) {
          console.warn(`[Webhook/Meta] phone_number_id "${phoneNumberId}" não encontrado no DB.`);
          continue;
        }
      }

      for (const msg of messages) {
        if (msg.type === 'status' || !msg.from) continue;

        const phone = normalizePhone(msg.from);
        const contactInfo = contacts.find((c: any) => c.wa_id === msg.from);
        const pushName = contactInfo?.profile?.name || '';
        const messageText = msg.text?.body
          || msg.image?.caption
          || msg.video?.caption
          || '';

        await processIncomingMessage({
          companyId: empresa.id,
          ownerId: empresa.ownerId,
          phone,
          pushName,
          messageText,
          rawPayload: msg,
          origin: 'WhatsApp Official'
        });
      }
    }
  }
}

// Verificação (GET) — com token
router.get('/meta/:token', (req, res) => handleMetaVerification(req, res));
// Verificação (GET) — legada
router.get('/meta', (req, res) => handleMetaVerification(req, res));

// Receber mensagens (POST) — com token
router.post('/meta/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const empresa = await prisma.empresa.findUnique({
      where: { webhookToken: token },
      select: { id: true, ownerId: true, name: true, isActive: true }
    });

    if (!empresa || !empresa.isActive) {
      console.warn(`[Webhook/Meta] Token "${token}" não encontrado ou empresa inativa.`);
      return res.sendStatus(200);
    }

    console.log(`[Webhook/Meta] ✅ Recebido para clínica "${empresa.name}" (ID: ${empresa.id})`);
    await handleMetaMessages(req.body, empresa);
    return res.sendStatus(200);
  } catch (error: any) {
    console.error('[Webhook/Meta] Erro:', error);
    return res.sendStatus(200);
  }
});

// Receber mensagens (POST) — legada (busca por phone_number_id)
router.post('/meta', async (req, res) => {
  try {
    await handleMetaMessages(req.body);
    return res.sendStatus(200);
  } catch (error: any) {
    console.error('[Webhook/Meta] Erro:', error);
    return res.sendStatus(200);
  }
});


// ═══════════════════════════════════════════════════════════
// 3) WEBHOOK UNIVERSAL DE LEADS (já existente — Meta Ads, Zapier, etc.)
// ═══════════════════════════════════════════════════════════
router.post('/leads/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;
    const data = req.body;

    if (!apiKey) {
      return res.status(401).json(createErrorResponse('API Key ausente', 401));
    }

    // 1. Identificar a Empresa dona do Webhook
    const empresa = await prisma.empresa.findFirst({
      where: { apiKey, isActive: true },
    });

    if (!empresa) {
      return res.status(401).json(createErrorResponse('API Key inválida ou empresa inativa', 401));
    }

    // 2. Encontrar o Profissional Admin / Padrão da Empresa para atribuir o Lead
    const professional = await prisma.professional.findFirst({
      where: { companyId: empresa.id }
    });

    if (!professional) {
      return res.status(400).json(createErrorResponse('Nenhum profissional configurado para receber leads nesta empresa.', 400));
    }

    // 3. Normalização de Dados do Payload (Mapeamento flexível)
    const name = data.name || data.nome || data.full_name || 'Lead sem nome';
    const email = data.email || data.mail || null;
    const phone = data.phone || data.telefone || data.whatsapp || data.celular || null;
    const value = parseFloat(data.value || data.valor || 0);
    
    // Tratamento de UTM e Origem
    let origin = data.origin || data.origem || 'API Webhook';
    if (data.utm_source) {
      origin = String(data.utm_source);
    } else if (data.form_name?.toLowerCase().includes('facebook') || data.source === 'fb_ig') {
      origin = 'Facebook Ads';
    }

    const observations = JSON.stringify(data, null, 2);

    // 4. Verificar se já existe um Lead com este telefone NESTA EMPRESA
    const existingLead = await prisma.lead.findFirst({
      where: { 
        phone: phone ? String(phone) : undefined,
        companyId: empresa.id
      }
    });
    
    if (existingLead) {
      console.log(`[Webhooks] Lead duplicado detectado (#${existingLead.id}). Atualizando...`);
      
      const updatedLead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          notes: existingLead.notes ? `${existingLead.notes}\n\n[Novo Contato]: ${observations}` : observations,
          activities: {
            create: {
              type: 'sistema',
              content: `Novo contato recebido via webhook (${origin}). Dados atualizados.`,
              createdBy: 'Sistema'
            }
          }
        }
      });
      
      return res.json(createSuccessResponse({ 
        message: 'Lead já existente atualizado com sucesso!',
        leadId: updatedLead.id,
        isDuplicate: true
      }));
    }
    
    // 5. Criação do Lead
    const newLead = await prisma.lead.create({
      data: {
        professionalId: professional.id,
        companyId: empresa.id,
        name,
        email,
        phone,
        value,
        origin,
        status: 'prospect_lead',
        notes: observations,
        isScheduled: false
      }
    });

    res.status(201).json(createSuccessResponse({ 
      message: 'Lead recebido com sucesso!',
      leadId: newLead.id 
    }));

  } catch (error: any) {
    console.error('[Webhooks] Erro ao processar lead:', error);
    res.status(500).json(createErrorResponse('Erro interno no processamento do Webhook', 500));
  }
});
