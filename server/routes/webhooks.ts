import { Router } from 'express';
import { prisma } from '../prisma.js';
import { createErrorResponse, createSuccessResponse } from '../utils/response.js';

export const router = Router();

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
// URL para configurar no Evolution:
//   POST https://<domain>/api/webhooks/evolution
//   Eventos: MESSAGES_UPSERT
//
router.post('/evolution', async (req, res) => {
  try {
    const body = req.body;

    // ── Validar evento ──
    const event = body.event || '';
    if (!event.includes('messages') && !event.includes('MESSAGES')) {
      // Não é evento de mensagem — ignorar silenciosamente
      return res.json({ received: true, ignored: true });
    }

    const data = body.data || body;
    const key = data.key || {};
    const instance = body.instance || body.instanceName || '';

    // Ignorar mensagens enviadas por mim (fromMe)
    if (key.fromMe === true) {
      return res.json({ received: true, ignored: true, reason: 'fromMe' });
    }

    // Ignorar mensagens de grupo
    const remoteJid = key.remoteJid || '';
    if (remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) {
      return res.json({ received: true, ignored: true, reason: 'group' });
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

    if (!phone || !instance) {
      return res.status(400).json(createErrorResponse('Dados insuficientes (phone ou instance)', 400));
    }

    // ── Identificar clínica pela instância ──
    const empresa = await findCompanyByInstance(instance);
    if (!empresa) {
      console.warn(`[Webhook/Evolution] Instância "${instance}" não encontrada no DB.`);
      return res.json({ received: true, ignored: true, reason: 'unknown_instance' });
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

    return res.json(createSuccessResponse(result));

  } catch (error: any) {
    console.error('[Webhook/Evolution] Erro:', error);
    // Sempre retornar 200 para o Evolution não reenviar em loop
    return res.status(200).json({ received: true, error: error.message });
  }
});


// ═══════════════════════════════════════════════════════════
// 2) WEBHOOK — META OFFICIAL WHATSAPP BUSINESS API
// ═══════════════════════════════════════════════════════════
//
// URL para configurar no Meta Business:
//   GET  https://<domain>/api/webhooks/meta  (verificação)
//   POST https://<domain>/api/webhooks/meta  (mensagens)
//

// Verificação do webhook (challenge) — Meta envia um GET
router.get('/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // O verify_token é definido pelo usuário no Meta Business.
  // Usamos a API key da empresa como token de verificação.
  // Para simplificar, aceitamos qualquer token por agora e validamos no POST.
  if (mode === 'subscribe' && token && challenge) {
    console.log('[Webhook/Meta] Challenge verificado com sucesso.');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Receber mensagens do Meta
router.post('/meta', async (req, res) => {
  try {
    const body = req.body;

    // Formato do Meta: body.entry[].changes[].value
    if (!body.entry || !Array.isArray(body.entry)) {
      return res.json({ received: true, ignored: true });
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

        if (!phoneNumberId || messages.length === 0) continue;

        // ── Identificar clínica pelo phone_number_id do Meta ──
        const empresa = await findCompanyByMetaPhoneId(phoneNumberId);
        if (!empresa) {
          console.warn(`[Webhook/Meta] phone_number_id "${phoneNumberId}" não encontrado no DB.`);
          continue;
        }

        for (const msg of messages) {
          // Ignorar status updates (delivered, read, etc.)
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

    // Meta EXIGE resposta 200 rápida
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
