import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const closersEmails = [
  'prevendasbucco20@gmail.com',
  'prevendasbucco03@gmail.com',
  'yarinhacordis@hotmail.com',
  'aflaviane745@gmail.com'
];

const sdrsEmails = [
  'prevendasbucco30@gmail.com',
  'alicesilvafaria70@gmail.com',
  'brunamkt88@gmail.com'
];

async function main() {
  console.log('--- UPDATING CLOSERS ---');
  for (const email of closersEmails) {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      console.log(`[CLOSER] User not found: ${email}`);
      continue;
    }
    
    const accesses = await prisma.userCompanyAccess.findMany({ where: { userId: user.id } });
    for (const access of accesses) {
      let role = await prisma.role.findFirst({ where: { companyId: access.companyId, isCloser: true } });
      if (!role) {
        role = await prisma.role.findFirst({ where: { companyId: access.companyId, value: 'closer' } });
        if (role) {
          role = await prisma.role.update({ where: { id: role.id }, data: { isCloser: true } });
        } else {
          const company = await prisma.empresa.findUnique({ where: { id: access.companyId } });
          role = await prisma.role.create({
            data: {
              companyId: access.companyId,
              name: 'Closer',
              value: 'closer',
              isCloser: true,
              professionalId: company?.ownerId || 1
            }
          });
        }
      }

      await prisma.userCompanyAccess.update({
        where: { userId_companyId: { userId: user.id, companyId: access.companyId } },
        data: { roleId: role.id }
      });
      console.log(`[CLOSER] Updated ${email} in company ${access.companyId} with role ${role.name}`);
    }
  }

  console.log('--- UPDATING SDRS ---');
  for (const email of sdrsEmails) {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      console.log(`[SDR] User not found: ${email}`);
      continue;
    }
    
    const accesses = await prisma.userCompanyAccess.findMany({ where: { userId: user.id } });
    for (const access of accesses) {
      let role = await prisma.role.findFirst({ where: { companyId: access.companyId, isSDR: true } });
      if (!role) {
        role = await prisma.role.findFirst({ where: { companyId: access.companyId, value: 'sdr' } });
        if (role) {
          role = await prisma.role.update({ where: { id: role.id }, data: { isSDR: true } });
        } else {
          const company = await prisma.empresa.findUnique({ where: { id: access.companyId } });
          role = await prisma.role.create({
            data: {
              companyId: access.companyId,
              name: 'SDR',
              value: 'sdr',
              isSDR: true,
              professionalId: company?.ownerId || 1
            }
          });
        }
      }

      await prisma.userCompanyAccess.update({
        where: { userId_companyId: { userId: user.id, companyId: access.companyId } },
        data: { roleId: role.id }
      });
      console.log(`[SDR] Updated ${email} in company ${access.companyId} with role ${role.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
