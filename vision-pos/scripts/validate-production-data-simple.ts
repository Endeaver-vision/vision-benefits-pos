/**
 * PRODUCTION TEST DATA VALIDATION SCRIPT
 * 
 * This script validates that the Week 8 production test data was seeded correctly.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateProductionData() {
  console.log('🔍 Validating production test data...\n');

  try {
    // 1. Validate Locations
    const totalLocations = await prisma.locations.count();
    const activeLocations = await prisma.locations.count({ where: { active: true } });
    console.log(`📍 Locations: ${totalLocations} total (${activeLocations} active)`);
    
    // 2. Validate Users
    const totalUsers = await prisma.users.count();
    const adminUsers = await prisma.users.count({ where: { role: 'ADMIN' } });
    const managerUsers = await prisma.users.count({ where: { role: 'MANAGER' } });
    const salesUsers = await prisma.users.count({ where: { role: 'SALES_ASSOCIATE' } });
    const activeUsers = await prisma.users.count({ where: { active: true } });
    console.log(`👥 Users: ${totalUsers} total (${adminUsers} admin, ${managerUsers} managers, ${salesUsers} sales, ${activeUsers} active)`);

    // 3. Validate Customers
    const totalCustomers = await prisma.customers.count();
    const vspCustomers = await prisma.customers.count({ where: { insuranceCarrier: 'VSP' } });
    const eyemedCustomers = await prisma.customers.count({ where: { insuranceCarrier: 'EyeMed' } });
    const specteraCustomers = await prisma.customers.count({ where: { insuranceCarrier: 'Spectera' } });
    const cashPayCustomers = await prisma.customers.count({ where: { insuranceCarrier: null } });
    console.log(`🏥 Patients: ${totalCustomers} total (${vspCustomers} VSP, ${eyemedCustomers} EyeMed, ${specteraCustomers} Spectera, ${cashPayCustomers} Cash)`);

    // 4. Validate Products
    const totalProducts = await prisma.products.count();
    const frameProducts = await prisma.products.count({ where: { categoryId: 'cat_frames' } });
    const lensProducts = await prisma.products.count({ where: { categoryId: 'cat_lenses' } });
    const coatingProducts = await prisma.products.count({ where: { categoryId: 'cat_coatings' } });
    const contactProducts = await prisma.products.count({ where: { categoryId: 'cat_contacts' } });
    console.log(`🛍️ Products: ${totalProducts} total (${frameProducts} frames, ${lensProducts} lenses, ${coatingProducts} coatings, ${contactProducts} contacts)`);

    // 5. Validate Insurance Carriers
    const totalCarriers = await prisma.insurance_carriers.count();
    console.log(`🏥 Insurance Carriers: ${totalCarriers}`);

    // 6. Validate Test Accounts
    const adminUser = await prisma.users.findUnique({ where: { email: 'admin@visioncare.com' } });
    const managerUser = await prisma.users.findUnique({ where: { email: 'manager@visioncare.com' } });
    const salesUser = await prisma.users.findUnique({ where: { email: 'robert.johnson@visioncare.com' } });
    
    console.log('\n🔐 Test Accounts:');
    console.log(`  Admin: ${adminUser ? '✅' : '❌'} admin@visioncare.com`);
    console.log(`  Manager: ${managerUser ? '✅' : '❌'} manager@visioncare.com`);
    console.log(`  Sales: ${salesUser ? '✅' : '❌'} robert.johnson@visioncare.com`);

    // Summary
    console.log('\n📊 VALIDATION SUMMARY:');
    const criticalChecks = [
      { name: 'Locations', actual: totalLocations, expected: 4 },
      { name: 'Users', actual: totalUsers, expected: 12 },
      { name: 'Patients', actual: totalCustomers, expected: 15 },
      { name: 'Products', actual: totalProducts, min: 50 },
      { name: 'Insurance Carriers', actual: totalCarriers, expected: 3 },
      { name: 'Admin Account', actual: adminUser ? 1 : 0, expected: 1 },
      { name: 'Manager Account', actual: managerUser ? 1 : 0, expected: 1 },
      { name: 'Sales Account', actual: salesUser ? 1 : 0, expected: 1 }
    ];

    let allPassed = true;
    for (const check of criticalChecks) {
      const expected = check.min ? `>= ${check.min}` : check.expected;
      const passed = check.min ? check.actual >= check.min : check.actual === check.expected;
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${check.name}: ${check.actual} (expected ${expected}) ${status}`);
      if (!passed) allPassed = false;
    }

    if (allPassed) {
      console.log('\n🎉 ALL VALIDATIONS PASSED!');
      console.log('✅ Production test data is ready for Week 8 Day 5 deployment');
      console.log('\n🔐 Login Credentials:');
      console.log('  Admin: admin@visioncare.com / Admin123!');
      console.log('  Manager: manager@visioncare.com / Manager123!');
      console.log('  Sales: robert.johnson@visioncare.com / Sales123!');
      console.log('\n🚀 Ready for production deployment and alpha testing!');
    } else {
      console.log('\n⚠️  Some validations failed. Please review the seed script.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    await validateProductionData();
  } catch (error) {
    console.error('Fatal error during validation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();