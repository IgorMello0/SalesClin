import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const especialistasEmails = [
  'aryannysantos2014@gmail.com',
  'amandarsoares535@gmail.com',
  'saragomessilvamg29@gmail.com'
];

async function main() {
  console.log('--- UPDATING ESPECIALISTAS ---');
  for (const email of especialistasEmails) {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      console.log(`[ESPECIALISTA] User not found: ${email}`);
      continue;
    }
    
    const accesses = await prisma.userCompanyAccess.findMany({ where: { userId: user.id } });
    for (const access of accesses) {
      let roleIdToAssign = access.roleId;

      if (access.roleId) {
        // Se já tem um cargo (ex: "Dentista"), vamos garantir que a flag isSpecialist seja true
        const currentRole = await prisma.role.findUnique({ where: { id: access.roleId } });
        if (currentRole && !currentRole.isSpecialist) {
          await prisma.role.update({
            where: { id: access.roleId },
            data: { isSpecialist: true }
          });
          console.log(`[ESPECIALISTA] Atualizou o cargo existente "${currentRole.name}" para isSpecialist=true.`);
        }
      } else {
        // Se não tem cargo, vamos procurar ou criar um de Especialista
        let role = await prisma.role.findFirst({ where: { companyId: access.companyId, isSpecialist: true } });
        if (!role) {
          role = await prisma.role.findFirst({ where: { companyId: access.companyId, value: 'especialista' } });
          if (role) {
            role = await prisma.role.update({ where: { id: role.id }, data: { isSpecialist: true } });
          } else {
            const company = await prisma.empresa.findUnique({ where: { id: access.companyId } });
            role = await prisma.role.create({
              data: {
                companyId: access.companyId,
                name: 'Especialista',
                value: 'especialista',
                isSpecialist: true,
                professionalId: company?.ownerId || 1
              }
            });
          }
        }
        roleIdToAssign = role.id;
      }

      // Atualiza o acesso na tabela ponte se precisou mudar o roleId
      if (access.roleId !== roleIdToAssign && roleIdToAssign) {
        await prisma.userCompanyAccess.update({
          where: { userId_companyId: { userId: user.id, companyId: access.companyId } },
          data: { roleId: roleIdToAssign }
        });
      }
      
      // Sincroniza o roleId legado na tabela Usuario
      if (roleIdToAssign && user.roleId !== roleIdToAssign) {
        await prisma.usuario.update({
          where: { id: user.id },
          data: { roleId: roleIdToAssign }
        });
        console.log(`[ESPECIALISTA] Sincronizou Usuario.roleId para ${email}`);
      }

      console.log(`[ESPECIALISTA] Finalizou processamento para ${email} na clínica ${access.companyId}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
