import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database status...\n');
    
    const customers = await prisma.customers.count();
    const users = await prisma.users.count();
    const locations = await prisma.locations.count();
    const products = await prisma.products.count();
    const quotes = await prisma.quotes.count();
    
    console.log('📊 Database Status:');
    console.log(`  Customers: ${customers}`);
    console.log(`  Users: ${users}`);
    console.log(`  Locations: ${locations}`);
    console.log(`  Products: ${products}`);
    console.log(`  Quotes: ${quotes}`);
    
    if (customers === 0) {
      console.log('\n❌ No customers found in database!');
      console.log('💡 This is likely why you can\'t see any demo patients.');
      console.log('🔧 We need to run the production seed script.');
    } else {
      console.log('\n✅ Customers exist in database');
      
      // Show first few customers
      const sampleCustomers = await prisma.customers.findMany({
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          insuranceCarrier: true
        }
      });
      
      console.log('\n📋 Sample Customers:');
      sampleCustomers.forEach(customer => {
        console.log(`  ${customer.firstName} ${customer.lastName} (${customer.insuranceCarrier || 'Cash Pay'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();