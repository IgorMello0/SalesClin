import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildMetaTemplateCreateRequest, buildMetaTemplatePayload } from './whatsapp-templates.js'

describe('Meta WhatsApp template payload', () => {
  it('builds a utility template with examples and buttons', () => {
    const payload = buildMetaTemplatePayload({
      name: 'Confirmacao Consulta',
      language: 'pt_BR',
      category: 'UTILITY',
      headerText: 'Consulta de {{1}}',
      headerExamples: ['avaliacao'],
      bodyText: 'Ola {{1}}, sua consulta sera em {{2}}.',
      bodyExamples: ['Maria', '22/07 as 14h'],
      footerText: 'Equipe SellClin',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Confirmar' },
        { type: 'URL', text: 'Ver detalhes', url: 'https://sellclin.com' },
      ],
    })

    assert.equal(payload.name, 'confirmacao_consulta')
    assert.equal(payload.category, 'UTILITY')
    assert.deepEqual(payload.components[0].example.header_text, ['avaliacao'])
    assert.deepEqual(payload.components[1].example.body_text, [['Maria', '22/07 as 14h']])
    assert.equal(payload.components[3].buttons.length, 2)
  })

  it('rejects skipped variables and missing examples', () => {
    assert.throws(() => buildMetaTemplatePayload({
      name: 'lembrete_consulta',
      language: 'pt_BR',
      category: 'UTILITY',
      bodyText: 'Ola {{1}}, confirme em {{3}}.',
      bodyExamples: ['Maria', 'amanha'],
    }), /sem pular numeros/)

    assert.throws(() => buildMetaTemplatePayload({
      name: 'lembrete_consulta',
      language: 'pt_BR',
      category: 'UTILITY',
      bodyText: 'Ola {{1}}.',
    }), /exemplo para cada variavel/)

    assert.throws(() => buildMetaTemplatePayload({
      name: 'variavel_malformada',
      language: 'pt_BR',
      category: 'UTILITY',
      bodyText: 'Ola {{1}}, use tambem {{nome}}.',
      bodyExamples: ['Maria'],
    }), /variaveis numeradas/)
  })

  it('rejects unsafe dynamic URLs', () => {
    assert.throws(() => buildMetaTemplatePayload({
      name: 'acompanhar_pedido',
      language: 'pt_BR',
      category: 'UTILITY',
      bodyText: 'Acompanhe seu pedido.',
      buttons: [{ type: 'URL', text: 'Acompanhar', url: 'https://sellclin.com/{{1}}' }],
    }), /URL HTTPS estatica/)
  })

  it('builds the exact Meta request for an appointment reminder utility template', () => {
    const request = buildMetaTemplateCreateRequest('123456789012345', 'meta-test-token', {
      name: 'Lembrete de agendamento',
      language: 'pt_BR',
      category: 'UTILITY',
      headerText: 'Lembrete de agendamento',
      bodyText: 'Ola, {{1}}. Seu atendimento na {{2}} esta agendado para {{3}}. Responda para confirmar ou solicitar alteracao.',
      bodyExamples: ['Maria', 'Clinica Boca', '25/07 as 14h'],
      footerText: 'Mensagem referente ao seu agendamento',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Confirmar' },
        { type: 'QUICK_REPLY', text: 'Solicitar alteracao' },
      ],
    })

    assert.match(request.endpoint, /\/123456789012345\/message_templates$/)
    assert.equal(request.options.method, 'POST')
    assert.equal(request.options.headers.Authorization, 'Bearer meta-test-token')
    assert.equal(request.options.headers['Content-Type'], 'application/json')

    const postedBody = JSON.parse(request.options.body)
    assert.equal(postedBody.name, 'lembrete_de_agendamento')
    assert.equal(postedBody.category, 'UTILITY')
    assert.equal(postedBody.language, 'pt_BR')
    assert.equal(postedBody.allow_category_change, true)
    assert.deepEqual(postedBody.components[1].example.body_text, [[
      'Maria',
      'Clinica Boca',
      '25/07 as 14h',
    ]])
    assert.deepEqual(postedBody.components[3].buttons, [
      { type: 'QUICK_REPLY', text: 'Confirmar' },
      { type: 'QUICK_REPLY', text: 'Solicitar alteracao' },
    ])
  })
})
