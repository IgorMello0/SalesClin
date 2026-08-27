import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sellclin2024secret';

async function run() {
  const professional = await prisma.professional.findFirst({
    where: { email: 'luizbucco@gmail.com' },
    include: { company: true, ownedCompanies: true }
  });

  if (!professional) {
    console.log('Professional not found');
    return;
  }

  console.log(`Found professional: ${professional.name} (${professional.id})`);

  const companyIds = [
    professional.company?.isActive ? professional.company.id : null,
    ...professional.ownedCompanies.map(c => c.id)
  ].filter(Boolean);
  
  const uniqueCompanyIds = [...new Set(companyIds)];
  console.log(`Professional has access to companies: ${uniqueCompanyIds.join(', ')}`);

  for (const compId of uniqueCompanyIds) {
    const comp = await prisma.empresa.findUnique({ where: { id: compId }});
    console.log(`\n--- Testing Company ${compId} (${comp?.name}) ---`);
    
    // Generate token for professional
    const token = jwt.sign(
      { 
        id: professional.id, 
        email: professional.email, 
        type: 'profissional',
        companyId: compId,
        allowedCompanies: uniqueCompanyIds
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const filters = ['today', '7days', '30days', 'this_month'];
    
    for (const filter of filters) {
      try {
        const res = await fetch(`http://localhost:4000/api/dashboard/metrics?filter=${filter}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log(`[${filter}] OK - Leads: ${data.data?.leadsGerais}, Propostas: ${data.data?.propostasGeradasCount}`);
        } else {
          const text = await res.text();
          console.error(`[${filter}] ERROR ${res.status}: ${text}`);
        }
      } catch (e: any) {
        console.error(`[${filter}] FETCH ERROR: ${e.message}`);
      }
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
