import { PrismaClient } from '@prisma/client';
import { getCompanyBillingStatus } from './server/services/billing.js';

async function main() {
  const status16 = await getCompanyBillingStatus(16);
  const status17 = await getCompanyBillingStatus(17);
  console.log('Company 16:', status16);
  console.log('Company 17:', status17);
}
main();
