import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildMetaTemplatePayload } from './whatsapp-templates.js'

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
})
