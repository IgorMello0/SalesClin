import { prisma } from './server/prisma'; prisma.module.findMany().then(console.log).finally(()=>prisma.$disconnect());
