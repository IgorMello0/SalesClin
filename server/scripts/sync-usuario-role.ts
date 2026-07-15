import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const emails = [
  'prevendasbucco20@gmail.com',
  'prevendasbucco03@gmail.com',
  'yarinhacordis@hotmail.com',
  'aflaviane745@gmail.com',
  'prevendasbucco30@gmail.com',
  'alicesilvafaria70@gmail.com',
  'brunamkt88@gmail.com'
];

async function main() {
  console.log('--- SYNCING LEGACY USUARIO ROLE_ID ---');
  for (const email of emails) {
    const user = await prisma.usuario.findUnique({ where: { email }, include: { companyAccess: true } });
    if (!user) {
      console.log(`User not found: ${email}`);
      continue;
    }
    
    // We get the first company access that has a role
    const access = user.companyAccess.find(a => a.roleId);
    if (!access || !access.roleId) {
      console.log(`No role found in companyAccess for: ${email}`);
      continue;
    }
    
    if (user.roleId !== access.roleId) {
      await prisma.usuario.update({
        where: { id: user.id },
        data: { roleId: access.roleId }
      });
      const role = await prisma.role.findUnique({ where: { id: access.roleId } });
      console.log(`Synced role for ${email}: ${role?.name}`);
    } else {
      console.log(`Already synced for ${email}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
