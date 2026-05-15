export interface FunnelStage {
  id: string;
  label: string;
  color: string;
  isTransition?: boolean;
  isLinked?: boolean;
}

export interface FunnelDefinition {
  id: string;
  label: string;
  icon: string;
  moduleCode: string;
}

export const FUNNELS: FunnelDefinition[] = [
  { id: 'prospecting', label: 'Prospecção', icon: 'person_search', moduleCode: 'funnel' },
  { id: 'commercial', label: 'Comercial', icon: 'handshake', moduleCode: 'commercial_funnel' },
  { id: 'sales', label: 'Vendas', icon: 'payments', moduleCode: 'sales_funnel' },
];

export const STAGES: Record<string, FunnelStage[]> = {
  prospecting: [
    { id: 'prospect_lead', label: 'Novos Leads', color: 'bg-blue-500' },
    { id: 'prospect_qualified', label: 'Qualificados', color: 'bg-indigo-500' },
    { id: 'prospect_scheduled', label: 'Agendados', color: 'bg-violet-500' },
    { id: 'prospect_attended', label: 'Compareceu', color: 'bg-emerald-500', isTransition: true },
  ],
  commercial: [
    { id: 'comercial_consult', label: 'Consulta Feita', color: 'bg-emerald-500', isLinked: true },
    { id: 'comercial_proposal', label: 'Proposta', color: 'bg-orange-500' },
    { id: 'comercial_follow', label: 'Follow-up', color: 'bg-amber-500' },
    { id: 'comercial_closed', label: 'Fechado', color: 'bg-green-600' },
  ],
  sales: [
    { id: 'sales_payment', label: 'Pagamento', color: 'bg-cyan-500' },
    { id: 'sales_contract', label: 'Contrato', color: 'bg-blue-600' },
    { id: 'sales_post', label: 'Pós-Venda', color: 'bg-purple-500' },
  ]
};

export const QUICK_STATUSES = [
  { id: 'aguardando', label: 'Aguardando', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'ligar_tarde', label: 'Ligar mais tarde', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'retorna_amanha', label: 'Retorna amanhã', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'nao_respondeu', label: 'Não respondeu', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'negociacao', label: 'Em negociação', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

export const ORIGIN_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicação', label: 'Indicação' },
  { value: 'meta ads', label: 'Meta Ads' },
  { value: 'google', label: 'Google' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'whatsapp', label: 'Whatsapp' },
  { value: 'site', label: 'Site' },
  { value: 'outro', label: 'Outro' },
];
