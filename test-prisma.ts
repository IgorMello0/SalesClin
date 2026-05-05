import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const client = await prisma.client.findUnique({
      where: { id: 12 },
      include: {
        originLead: {
          include: {
            proposals: true
          }
        }
      }
    });
    console.log("Success:", client !== null);
  } catch (e: any) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
