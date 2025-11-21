import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a location first
  const location = await prisma.location.upsert({
    where: { name: 'Main Office' },
    update: {},
    create: {
      name: 'Main Office',
      address: '123 Main St, City, State 12345',
      phone: '555-0100',
      timezone: 'America/New_York',
    },
  });

  console.log('✅ Location created:', location.name);

  // Hash the password
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Create admin user
  const user = await prisma.user.upsert({
    where: { email: 'admin@visionpos.com' },
    update: {},
    create: {
      email: 'admin@visionpos.com',
      passwordHash,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
      locationId: location.id,
    },
  });

  console.log('✅ Admin user created');
  console.log('📧 Email: admin@visionpos.com');
  console.log('🔑 Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
