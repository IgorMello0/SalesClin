import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 

async function fix() { 
  const company = await prisma.empresa.findFirst(); 
  if(!company) return; 
  
  console.log(company.id); 
  
  const futureDate = new Date('2099-12-31T23:59:59.999Z');
  let sub = await prisma.companySubscription.findUnique({where:{companyId: company.id}}); 
  
  if(!sub) { 
    sub = await prisma.companySubscription.create({
      data:{
        companyId: company.id, 
        planCode: 'enterprise', 
        status: 'active',
        billingCycle: 'yearly',
        accessSource: 'manual',
        manualAccessEndsAt: futureDate,
        currentPeriodEndsAt: futureDate
      }
    }); 
  } else { 
    await prisma.companySubscription.update({
      where:{companyId: company.id}, 
      data:{
        status: 'active',
        accessSource: 'manual',
        manualAccessEndsAt: futureDate,
        currentPeriodEndsAt: futureDate
      }
    }); 
  } 
  
  console.log('Fixed subscription for company ' + company.id + ' with manual access until 2099'); 
} 

fix().then(()=>process.exit(0)).catch(console.error);
