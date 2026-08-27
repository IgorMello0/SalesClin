import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = 'samuesotero664@gmail.com';
  
  // 1. Find the Professional and Usuario
  const prof = await prisma.professional.findUnique({
    where: { email },
    include: {
      ownedCompanies: true,
      company: { include: { subscription: true } }
    }
  });

  if (!prof) {
    console.error(`Profissional com email ${email} não encontrado.`);
    return;
  }

  console.log(`Profissional encontrado: ${prof.name} (ID: ${prof.id})`);
  
  // 2. Identify the company to grant access
  let companyId = prof.companyId;
  if (!companyId && prof.ownedCompanies.length > 0) {
    companyId = prof.ownedCompanies[0].id;
  }

  if (!companyId) {
    console.error("Este usuário não tem uma empresa vinculada nem é dono de nenhuma.");
    return;
  }

  console.log(`Empresa vinculada: ${prof.company?.name || prof.ownedCompanies[0]?.name} (ID: ${companyId})`);

  // 3. Find the highest plan available
  const plans = await prisma.plan.findMany({ orderBy: { priceCents: 'desc' } });
  const topPlanCode = plans.length > 0 ? plans[0].code : 'pro';
  console.log(`Aplicando o plano máximo: ${topPlanCode}`);

  // 4. Upsert the CompanySubscription to grant unlimited lifetime access
  const hundredYearsFromNow = new Date();
  hundredYearsFromNow.setFullYear(hundredYearsFromNow.getFullYear() + 100);

  const sub = await prisma.companySubscription.upsert({
    where: { companyId },
    update: {
      planCode: topPlanCode,
      status: 'active',
      accessSource: 'manual',
      manualAccessEndsAt: hundredYearsFromNow,
      currentPeriodEndsAt: hundredYearsFromNow,
      trialEndsAt: hundredYearsFromNow,
    },
    create: {
      companyId,
      planCode: topPlanCode,
      status: 'active',
      accessSource: 'manual',
      manualAccessEndsAt: hundredYearsFromNow,
      currentPeriodEndsAt: hundredYearsFromNow,
      trialEndsAt: hundredYearsFromNow,
    }
  });

  console.log("Assinatura (CompanySubscription) atualizada com sucesso para ACESSO TOTAL ILIMITADO.");
  console.log(sub);

  // 5. Ensure the user's role is Admin (or has full permissions)
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) {
    const adminRole = await prisma.role.findFirst({
      where: { companyId, isAdmin: true }
    });
    
    if (adminRole) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { roleId: adminRole.id }
      });
      console.log(`Usuário promovido ao cargo de Administrador (Role ID: ${adminRole.id}).`);
    } else {
      console.log("Cargo 'Admin' não encontrado na empresa. Pode ser necessário criar um caso não consiga acessar algo.");
    }
  }

}

main().catch(console.error).finally(() => prisma.$disconnect());
