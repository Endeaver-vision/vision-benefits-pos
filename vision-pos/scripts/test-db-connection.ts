import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    const customers = await prisma.customers.findMany({ 
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        insuranceCarrier: true,
        active: true
      }
    });
    
    console.log(`✅ Found ${customers.length} customers in database`);
    
    if (customers.length > 0) {
      console.log('\n👥 Sample customers:');
      customers.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.firstName} ${customer.lastName}`);
        console.log(`     Email: ${customer.email || 'N/A'}`);
        console.log(`     Phone: ${customer.phone || 'N/A'}`);
        console.log(`     Insurance: ${customer.insuranceCarrier || 'Cash Pay'}`);
        console.log(`     Active: ${customer.active}`);
        console.log('');
      });
    } else {
      console.log('❌ No customers found in database!');
    }
    
  } catch (error) {
    console.error('❌ Database Error:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();