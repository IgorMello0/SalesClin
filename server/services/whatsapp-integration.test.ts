import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMetaConnectUrl, verifyMetaState } from './meta-whatsapp.js'
import { handleMetaMessages, handleUazapiPayload } from './whatsapp-integration.js'

type RecordData = Record<string, any>

function createFakeDatabase() {
  const state = {
    leads: [] as RecordData[],
    conversations: [] as RecordData[],
    messages: [] as RecordData[],
    activities: [] as RecordData[],
    webhookEvents: [] as RecordData[],
  }

  let nextLeadId = 1
  let nextConversationId = 1
  let nextMessageId = 1
  let nextActivityId = 1

  const db = {
    empresa: {
      findFirst: async () => null,
    },
    lead: {
      findFirst: async ({ where }: any) => state.leads.find(
        (lead) => lead.phone === where.phone && lead.companyId === where.companyId,
      ) || null,
      create: async ({ data }: any) => {
        const lead = { id: nextLeadId++, ...data }
        state.leads.push(lead)
        return lead
      },
    },
    conversa: {
      findFirst: async ({ where }: any) => state.conversations.find(
        (conversation) => conversation.phone === where.phone && conversation.companyId === where.companyId,
      ) || null,
      create: async ({ data }: any) => {
        const conversation = { id: nextConversationId++, ...data }
        state.conversations.push(conversation)
        return conversation
      },
      update: async ({ where, data }: any) => {
        const conversation = state.conversations.find((item) => item.id === where.id)
        if (!conversation) throw new Error('Conversation not found')
        Object.assign(conversation, data)
        return conversation
      },
    },
    mensagem: {
      findFirst: async ({ where }: any) => state.messages.find(
        (message) => message.conversationId === where.conversationId
          && message.providerMessageId === where.providerMessageId,
      ) || null,
      create: async ({ data }: any) => {
        const message = { id: nextMessageId++, ...data }
        state.messages.push(message)
        return message
      },
    },
    leadActivity: {
      create: async ({ data }: any) => {
        const activity = { id: nextActivityId++, ...data }
        state.activities.push(activity)
        return activity
      },
    },
    whatsAppWebhookEvent: {
      create: async ({ data }: any) => {
        if (state.webhookEvents.some((event) => event.eventKey === data.eventKey)) {
          throw Object.assign(new Error('Duplicate webhook event'), { code: 'P2002' })
        }
        state.webhookEvents.push({ ...data })
        return data
      },
      update: async ({ where, data }: any) => {
        const event = state.webhookEvents.find((item) => item.eventKey === where.eventKey)
        if (!event) throw new Error('Webhook event not found')
        Object.assign(event, data)
        return event
      },
    },
  }

  return { db: db as any, state }
}

function metaInboundPayload(messageId: string, text: string) {
  return {
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: 'meta-phone-1' },
          contacts: [{ wa_id: '5511999990001', profile: { name: 'Lead Meta' } }],
          messages: [{
            id: messageId,
            from: '5511999990001',
            timestamp: '1784246400',
            type: 'text',
            text: { body: text },
          }],
        },
      }],
    }],
  }
}

test('WhatsApp Oficial cria lead, conversa e mensagem sem duplicar retry', async () => {
  process.env.META_APP_ID = 'meta-app-test'
  process.env.META_APP_SECRET = 'meta-secret-test'
  process.env.META_WHATSAPP_CONFIG_ID = 'cloud-config-id'
  process.env.META_WHATSAPP_REDIRECT_URI = 'https://sellclin.test/api/whatsapp/meta/callback'
  process.env.JWT_SECRET = 'jwt-secret-for-whatsapp-tests'

  const connectUrl = new URL(buildMetaConnectUrl(5, 10, 'cloud_api'))
  assert.equal(connectUrl.searchParams.get('config_id'), 'cloud-config-id')
  const stateToken = connectUrl.searchParams.get('state')
  assert.ok(stateToken)
  assert.equal(verifyMetaState(stateToken).officialMode, 'cloud_api')

  const { db, state } = createFakeDatabase()
  const company = { id: 5, ownerId: 10, name: 'Clinica Oficial' }
  const payload = metaInboundPayload('wamid.official-1', 'Quero agendar uma avaliacao')

  await handleMetaMessages(payload, company, db)
  await handleMetaMessages(payload, company, db)

  assert.equal(state.leads.length, 1)
  assert.equal(state.leads[0].status, 'prospect_lead')
  assert.equal(state.leads[0].origin, 'WhatsApp Official')
  assert.deepEqual(state.leads[0].tags, ['whatsapp-auto'])
  assert.equal(state.conversations.length, 1)
  assert.equal(state.messages.length, 1)
  assert.equal(state.messages[0].providerMessageId, 'wamid.official-1')
  assert.equal(state.activities.length, 1)
})

test('Coexistencia usa configuracao dedicada e recebe pelo pipeline oficial', async () => {
  process.env.META_APP_ID = 'meta-app-test'
  process.env.META_APP_SECRET = 'meta-secret-test'
  process.env.META_WHATSAPP_CONFIG_ID = 'cloud-config-id'
  process.env.META_WHATSAPP_COEXISTENCE_CONFIG_ID = 'coexistence-config-id'
  process.env.META_WHATSAPP_REDIRECT_URI = 'https://sellclin.test/api/whatsapp/meta/callback'
  process.env.JWT_SECRET = 'jwt-secret-for-whatsapp-tests'

  const connectUrl = new URL(buildMetaConnectUrl(8, 21, 'coexistence'))
  assert.equal(connectUrl.searchParams.get('config_id'), 'coexistence-config-id')
  assert.equal(connectUrl.searchParams.get('override_default_response_type'), 'true')
  assert.deepEqual(JSON.parse(connectUrl.searchParams.get('extras') || '{}'), {
    setup: {},
    featureType: 'whatsapp_business_app_onboarding',
    sessionInfoVersion: '3',
    version: 'v3',
  })

  const stateToken = connectUrl.searchParams.get('state')
  assert.ok(stateToken)
  assert.deepEqual(verifyMetaState(stateToken), {
    companyId: 8,
    userId: 21,
    officialMode: 'coexistence',
  })

  const { db, state } = createFakeDatabase()
  await handleMetaMessages(
    metaInboundPayload('wamid.coexistence-1', 'Mensagem pelo numero coexistente'),
    { id: 8, ownerId: 21, name: 'Clinica Coexistencia' },
    db,
  )

  assert.equal(state.leads.length, 1)
  assert.equal(state.leads[0].companyId, 8)
  assert.equal(state.messages[0].content, 'Mensagem pelo numero coexistente')
})

test('Coexistencia habilitada libera conexao sem allowlist de teste', async () => {
  const { isCoexistenceAllowed } = await import('./whatsapp-connections.js')

  process.env.WHATSAPP_COEXISTENCE_ENABLED = 'true'
  delete process.env.WHATSAPP_COEXISTENCE_RESTRICT_EMAILS
  delete process.env.WHATSAPP_COEXISTENCE_TEST_EMAILS

  assert.equal(isCoexistenceAllowed('cliente@sellclin.test'), true)

  process.env.WHATSAPP_COEXISTENCE_RESTRICT_EMAILS = 'true'
  process.env.WHATSAPP_COEXISTENCE_TEST_EMAILS = 'igormello403@gmail.com'

  assert.equal(isCoexistenceAllowed('cliente@sellclin.test'), false)
  assert.equal(isCoexistenceAllowed('igormello403@gmail.com'), true)
})

test('WhatsApp Nao Oficial cria lead e ignora mensagem repetida', async () => {
  const { db, state } = createFakeDatabase()
  const payload = {
    event: 'message',
    message: {
      id: 'unofficial-message-1',
      chatid: '5511988880002@s.whatsapp.net',
      senderName: 'Lead Nao Oficial',
      text: 'Gostaria de saber os valores',
      fromMe: false,
      isGroup: false,
    },
  }
  const company = { id: 9, ownerId: 30, name: 'Clinica Nao Oficial' }

  const firstResult = await handleUazapiPayload(payload, company, db)
  const retryResult = await handleUazapiPayload(payload, company, db)

  assert.equal(firstResult.action, 'created')
  assert.equal(retryResult.action, 'duplicate_message')
  assert.equal(state.leads.length, 1)
  assert.equal(state.leads[0].phone, '5511988880002')
  assert.equal(state.leads[0].status, 'prospect_lead')
  assert.equal(state.conversations.length, 1)
  assert.equal(state.messages.length, 1)
  assert.equal(state.activities.length, 1)
})
