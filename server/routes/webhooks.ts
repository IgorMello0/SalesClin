import { Router } from 'express';
import { prisma } from '../prisma';
import { createErrorResponse, createSuccessResponse } from '../utils/response';

export const router = Router();

/**
 * Webhook Universal para Ingestão de Leads (SaaS Friendly)
 * O usuário do SalesClin utilizará esta URL (ex: /api/webhooks/leads/12345-API-KEY)
 * para conectar ao Meta Ads, Zapier, Elementor, etc.
 */
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
    const adminUser = await prisma.usuario.findFirst({
      where: { companyId: empresa.id, role: 'admin' },
    });

    // Precisamos de um Professional record para vincular ao Lead.
    // Tenta achar um profissional que pertença a essa empresa.
    const professional = await prisma.professional.findFirst({
      where: { companyId: empresa.id }
    });

    if (!professional) {
      return res.status(400).json(createErrorResponse('Nenhum profissional configurado para receber leads nesta empresa.', 400));
    }

    // 3. Normalização de Dados do Payload (Mapeamento flexível)
    // Suporta formatos do Meta Ads, Elementor, Typeform, etc.
    const name = data.name || data.nome || data.full_name || 'Lead sem nome';
    const email = data.email || data.mail || null;
    const phone = data.phone || data.telefone || data.whatsapp || data.celular || null;
    const city = data.city || data.cidade || null;
    const value = parseFloat(data.value || data.valor || 0);
    
    // Tratamento de UTM e Origem
    let origin = data.origin || data.origem || 'API Webhook';
    if (data.utm_source) {
      origin = String(data.utm_source);
    } else if (data.form_name?.toLowerCase().includes('facebook') || data.source === 'fb_ig') {
      origin = 'Facebook Ads';
    }

    // Extrair outros campos em observações
    const observations = JSON.stringify(data, null, 2);

    // 4. Criação do Lead
    const newLead = await prisma.lead.create({
      data: {
        professionalId: professional.id,
        name,
        email,
        phone,
        city,
        value,
        origin,
        status: 'prospect_lead', // Status inicial do funil
        observations,
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
