import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@visionpos.com' },
      include: { location: true }
    });

    if (!user) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Name:', user.firstName, user.lastName);
    console.log('- Role:', user.role);
    console.log('- Active:', user.active);
    console.log('- Location:', user.location?.name || 'None');
    console.log('- Has password hash:', !!user.passwordHash);

    // Test password verification
    if (user.passwordHash) {
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log('- Password "admin123" validates:', isValid);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
