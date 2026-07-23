export type WhatsAppTemplateButton = {
  type?: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text?: string
  url?: string
  phone_number?: string
}

export type WhatsAppTemplateComponent = {
  type?: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  format?: string
  text?: string
  buttons?: WhatsAppTemplateButton[]
  example?: {
    header_text?: string[]
    body_text?: string[][]
  }
}

export type WhatsAppTemplate = {
  id: number
  externalId?: string | null
  name: string
  language: string
  category: string
  status: string
  qualityScore?: string | null
  rejectionReason?: string | null
  parameterFormat?: string | null
  components?: WhatsAppTemplateComponent[]
  lastSyncedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type CreateWhatsAppTemplateInput = {
  name: string
  language: string
  category: 'UTILITY' | 'MARKETING'
  headerText?: string
  headerExamples?: string[]
  bodyText: string
  bodyExamples?: string[]
  footerText?: string
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
    text: string
    url?: string
    phoneNumber?: string
  }>
}
