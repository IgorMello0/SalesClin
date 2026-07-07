export const INTERNAL_TEST_EMAILS = [
  'igormello403@gmail.com',
  'crmsellclin@gmail.com',
];

export const HIDDEN_DEVELOPMENT_MODULES = [
  'pagamentos',
  'conversas',
  'catalogos',
  'contratos',
  'relatorios',
];

export function canAccessHiddenDevelopmentPages(email?: string | null): boolean {
  if (!email) return false;
  return INTERNAL_TEST_EMAILS.includes(email.trim().toLowerCase());
}

export function isHiddenDevelopmentModule(moduleCode: string): boolean {
  return HIDDEN_DEVELOPMENT_MODULES.includes(moduleCode);
}
