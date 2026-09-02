import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getMetaWebhookFields,
  inspectMetaWebhookSubscriptions,
  META_COEXISTENCE_WEBHOOK_FIELDS,
  requiresPhoneNumberWebhookOverride,
} from './meta-whatsapp.js'

const APP_ID = '893193497129440'
const CALLBACK_URL = 'https://sellclin.com/api/webhooks/meta/company-token'

test('confirma o webhook apenas para o app e callback esperados', () => {
  const result = inspectMetaWebhookSubscriptions([
    {
      whatsapp_business_api_data: { id: APP_ID, name: 'SellClin' },
      override_callback_uri: CALLBACK_URL,
    },
  ], APP_ID, CALLBACK_URL)

  assert.equal(result.appSubscribed, true)
  assert.equal(result.overrideVerified, true)
  assert.equal(result.reportedCallbackUrl, CALLBACK_URL)
})

test('nao considera uma lista vazia como webhook configurado', () => {
  const result = inspectMetaWebhookSubscriptions([], APP_ID, CALLBACK_URL)

  assert.equal(result.appSubscribed, false)
  assert.equal(result.overrideVerified, false)
})

test('rejeita callback diferente mesmo quando o app esta assinado', () => {
  const result = inspectMetaWebhookSubscriptions([
    {
      whatsapp_business_api_data: { id: APP_ID },
      override_callback_uri: 'https://example.com/outro-webhook',
    },
  ], APP_ID, CALLBACK_URL)

  assert.equal(result.appSubscribed, true)
  assert.equal(result.overrideVerified, false)
})

test('coexistencia solicita todos os campos necessarios para ecos do celular', () => {
  assert.deepEqual(getMetaWebhookFields('coexistence'), META_COEXISTENCE_WEBHOOK_FIELDS)
  assert.deepEqual(getMetaWebhookFields('cloud_api'), ['messages'])
  assert.equal(requiresPhoneNumberWebhookOverride(META_COEXISTENCE_WEBHOOK_FIELDS), true)
  assert.equal(requiresPhoneNumberWebhookOverride(['messages']), false)
})
