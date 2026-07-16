import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const search = "Maurília";
  const searchStr = String(search);
  const numericSearch = searchStr.replace(/\D/g, '');
  
  const where: any = { companyId: 16 };
  
  where.OR = [
    { name: { contains: searchStr, mode: 'insensitive' } },
    { phone: { contains: searchStr, mode: 'insensitive' } }
  ];
  
  if (numericSearch.length > 0) {
    where.OR.push({ phone: { contains: numericSearch } });
  }
  
  const leads = await prisma.lead.findMany({ where });
  console.log(leads.length);
}

main().finally(() => prisma.$disconnect());
