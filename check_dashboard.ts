import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sellclin2024secret';

async function run() {
  const users = await prisma.usuario.findMany({
    where: { email: { contains: 'luizbucco' } }
  });

  if (users.length === 0) {
    console.log('User luizbucco not found');
    return;
  }

  const user = users[0];
  console.log(`Found user: ${user.name} (${user.id})`);

  // Print all users matching to see if there are multiple accounts
  console.log(`Matched accounts: ${users.map(u => `${u.email} (ID: ${u.id}, companyId: ${u.companyId})`).join(', ')}`);

  const accesses = await prisma.userCompanyAccess.findMany({
    where: { userId: user.id },
    include: { company: true }
  });

  const companyIds = [user.companyId, ...accesses.map(a => a.companyId)].filter(Boolean);
  const uniqueCompanyIds = [...new Set(companyIds)];

  console.log(`User has access to companies: ${uniqueCompanyIds.join(', ')}`);

  for (const compId of uniqueCompanyIds) {
    const comp = await prisma.empresa.findUnique({ where: { id: compId }});
    console.log(`\n--- Testing Company ${compId} (${comp?.name}) ---`);
    
    // Generate token for this specific company
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        type: 'usuario', 
        role: 'dono', 
        companyId: compId 
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
          console.log(`[${filter}] OK`);
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
