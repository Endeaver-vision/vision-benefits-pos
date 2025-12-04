import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActiveStatus() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@visionpos.com' },
      select: {
        id: true,
        email: true,
        active: true,
        firstName: true,
        lastName: true,
        role: true
      }
    });

    if (user) {
      console.log('Admin user found:');
      console.log(`- Email: ${user.email}`);
      console.log(`- Active status: ${user.active}`);
      console.log(`- Name: ${user.firstName} ${user.lastName}`);
      console.log(`- Role: ${user.role}`);
    } else {
      console.log('Admin user not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActiveStatus();
