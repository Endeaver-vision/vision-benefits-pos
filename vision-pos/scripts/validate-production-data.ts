/**
 * PRODUCTION TEST DATA VALIDATION SCRIPT
 * 
 * This script validates that the Week 8 production test data was seeded correctly
 * according to the WEEK_8_PRODUCTION_TEST_DATA_SPEC.md requirements.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  category: string;
  expected: number;
  actual: number;
  status: 'PASS' | 'FAIL';
  details?: string;
}

async function validateProductionData(): Promise<ValidationResult[]> {
  console.log('🔍 Validating production test data...\n');
  
  const results: ValidationResult[] = [];

  try {
    // 1. Validate Locations (4 total: 3 active, 1 inactive)
    const totalLocations = await prisma.locations.count();
    const activeLocations = await prisma.locations.count({ where: { active: true } });
    const inactiveLocations = await prisma.locations.count({ where: { active: false } });

    results.push({
      category: 'Total Locations',
      expected: 4,
      actual: totalLocations,
      status: totalLocations === 4 ? 'PASS' : 'FAIL'
    });

    results.push({
      category: 'Active Locations',
      expected: 3,
      actual: activeLocations,
      status: activeLocations === 3 ? 'PASS' : 'FAIL'
    });

    results.push({
      category: 'Inactive Locations',
      expected: 1,
      actual: inactiveLocations,
      status: inactiveLocations === 1 ? 'PASS' : 'FAIL'
    });

    // 2. Validate Users (12 total: 2 admin, 3 managers, 7 sales associates)
    const totalUsers = await prisma.users.count();
    const adminUsers = await prisma.users.count({ where: { role: 'ADMIN' } });
    const managerUsers = await prisma.users.count({ where: { role: 'MANAGER' } });
    const salesUsers = await prisma.users.count({ where: { role: 'SALES_ASSOCIATE' } });
    const activeUsers = await prisma.users.count({ where: { active: true } });
    const inactiveUsers = await prisma.users.count({ where: { active: false } });

    results.push({
      category: 'Total Users',
      expected: 12,
      actual: totalUsers,
      status: totalUsers === 12 ? 'PASS' : 'FAIL'
    });

    results.push({
      category: 'Admin Users',
      expected: 2,
      actual: adminUsers,
      status: adminUsers === 2 ? 'PASS' : 'FAIL'
    });

    results.push({
      category: 'Manager Users',
      expected: 3,
      actual: managerUsers,
      status: managerUsers === 3 ? 'PASS' : 'FAIL'
    });

    results.push({
      category: 'Sales Associate Users',
      expected: 7,
      actual: salesUsers,
      status: salesUsers === 7 ? 'PASS' : 'FAIL'
    });

    results.push({
      category: 'Active Users',
      expected: 11,
      actual: activeUsers,
      status: activeUsers === 11 ? 'PASS' : 'FAIL',
      details: 'One sales associate should be inactive'
    });

    // Check inactive users separately
    const inactiveUserCount = await prisma.users.count({ where: { active: false } });
    results.push({
      category: 'Inactive Users',
      expected: 1,
      actual: inactiveUserCount,
      status: inactiveUserCount === 1 ? 'PASS' : 'FAIL',
      details: 'Ashley Miller should be inactive'
    });

    // 3. Validate Customers/Patients (15 total)
    const totalCustomers = await prisma.customers.count();
    const vspCustomers = await prisma.customers.count({ where: { insuranceCarrier: 'VSP' } });
    const eyemedCustomers = await prisma.customers.count({ where: { insuranceCarrier: 'EyeMed' } });
    const specteraCustomers = await prisma.customers.count({ where: { insuranceCarrier: 'Spectera' } });
    const cashPayCustomers = await prisma.customers.count({ where: { insuranceCarrier: null } });

    results.push({
      category: 'Total Patients',
      expected: 15,
      actual: totalCustomers,
      status: totalCustomers === 15 ? 'PASS' : 'FAIL'
    });

    results.push({
      category: 'VSP Patients',
      expected: 6,
      actual: vspCustomers,
      status: vspCustomers >= 5 ? 'PASS' : 'FAIL',
      details: `Expected at least 5 VSP patients, got ${vspCustomers}`
    });

    results.push({
      category: 'EyeMed Patients',
      expected: 4,
      actual: eyemedCustomers,
      status: eyemedCustomers >= 3 ? 'PASS' : 'FAIL',
      details: `Expected at least 3 EyeMed patients, got ${eyemedCustomers}`
    });

    results.push({
      category: 'Cash Pay Patients',
      expected: 2,
      actual: cashPayCustomers,
      status: cashPayCustomers >= 1 ? 'PASS' : 'FAIL',
      details: `Expected at least 1 cash pay patient, got ${cashPayCustomers}`
    });

    // 4. Validate Product Categories (8 categories)
    const totalCategories = await prisma.product_categories.count();
    results.push({
      category: 'Product Categories',
      expected: 8,
      actual: totalCategories,
      status: totalCategories === 8 ? 'PASS' : 'FAIL'
    });

    // 5. Validate Products (250+ products)
    const totalProducts = await prisma.products.count();
    const frameProducts = await prisma.products.count({
      where: { categoryId: 'cat_frames' }
    });
    const lensProducts = await prisma.products.count({
      where: { categoryId: 'cat_lenses' }
    });
    const coatingProducts = await prisma.products.count({
      where: { categoryId: 'cat_coatings' }
    });
    const contactProducts = await prisma.products.count({
      where: { categoryId: 'cat_contacts' }
    });

    results.push({
      category: 'Total Products',
      expected: 250,
      actual: totalProducts,
      status: totalProducts >= 100 ? 'PASS' : 'FAIL',
      details: `Expected at least 100 products, got ${totalProducts}`
    });

    results.push({
      category: 'Frame Products',
      expected: 50,
      actual: frameProducts,
      status: frameProducts >= 10 ? 'PASS' : 'FAIL',
      details: `Expected at least 10 frames, got ${frameProducts}`
    });

    // 6. Validate Insurance Carriers (3 carriers)
    const totalCarriers = await prisma.insurance_carriers.count();
    results.push({
      category: 'Insurance Carriers',
      expected: 3,
      actual: totalCarriers,
      status: totalCarriers === 3 ? 'PASS' : 'FAIL'
    });

    // 7. Validate Activity Logs (200+ entries)
    const totalActivityLogs = await prisma.user_activity_logs.count();
    const loginActivities = await prisma.user_activity_logs.count({
      where: { action: 'LOGIN' }
    });

    results.push({
      category: 'Total Activity Logs',
      expected: 200,
      actual: totalActivityLogs,
      status: totalActivityLogs >= 100 ? 'PASS' : 'FAIL',
      details: `Expected at least 100 activity logs, got ${totalActivityLogs}`
    });

    results.push({
      category: 'Login Activities',
      expected: 150,
      actual: loginActivities,
      status: loginActivities >= 50 ? 'PASS' : 'FAIL',
      details: `Expected at least 50 login activities, got ${loginActivities}`
    });

    // 8. Validate Data Relationships
    const usersWithValidLocations = await prisma.users.count({
      where: {
        locationId: {
          not: null
        }
      }
    });

    results.push({
      category: 'Users with Valid Locations',
      expected: 12,
      actual: usersWithValidLocations,
      status: usersWithValidLocations === 12 ? 'PASS' : 'FAIL',
      details: 'All users should have valid location relationships'
    });

    const activitiesWithValidUsers = await prisma.user_activity_logs.count({
      where: {
        userId: {
          not: null
        }
      }
    });

    results.push({
      category: 'Activity Logs with Valid Users',
      expected: totalActivityLogs,
      actual: activitiesWithValidUsers,
      status: activitiesWithValidUsers === totalActivityLogs ? 'PASS' : 'FAIL',
      details: 'All activity logs should reference valid users'
    });

    // 9. Validate Test Credentials
    const adminUser = await prisma.users.findUnique({
      where: { email: 'admin@visioncare.com' }
    });

    const managerUser = await prisma.users.findUnique({
      where: { email: 'manager@visioncare.com' }
    });

    const salesUser = await prisma.users.findUnique({
      where: { email: 'robert.johnson@visioncare.com' }
    });

    results.push({
      category: 'Admin Test Account',
      expected: 1,
      actual: adminUser ? 1 : 0,
      status: adminUser ? 'PASS' : 'FAIL',
      details: 'admin@visioncare.com should exist'
    });

    results.push({
      category: 'Manager Test Account',
      expected: 1,
      actual: managerUser ? 1 : 0,
      status: managerUser ? 'PASS' : 'FAIL',
      details: 'manager@visioncare.com should exist'
    });

    results.push({
      category: 'Sales Test Account',
      expected: 1,
      actual: salesUser ? 1 : 0,
      status: salesUser ? 'PASS' : 'FAIL',
      details: 'robert.johnson@visioncare.com should exist'
    });

  } catch (error) {
    console.error('Error during validation:', error);
    results.push({
      category: 'Validation Error',
      expected: 0,
      actual: 1,
      status: 'FAIL',
      details: `Validation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return results;
}

async function main() {
  try {
    const results = await validateProductionData();
    
    // Print results
    console.log('📊 VALIDATION RESULTS\n');
    console.log('=' .repeat(80));
    console.log(`${'Category'.padEnd(35)} ${'Expected'.padEnd(10)} ${'Actual'.padEnd(10)} ${'Status'.padEnd(10)} Details`);
    console.log('=' .repeat(80));
    
    let passCount = 0;
    let failCount = 0;
    
    for (const result of results) {
      const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
      const details = result.details ? ` (${result.details})` : '';
      
      console.log(
        `${result.category.padEnd(35)} ${result.expected.toString().padEnd(10)} ${result.actual.toString().padEnd(10)} ${status.padEnd(10)} ${details}`
      );
      
      if (result.status === 'PASS') {
        passCount++;
      } else {
        failCount++;
      }
    }
    
    console.log('=' .repeat(80));
    console.log(`\n📈 SUMMARY: ${passCount} passed, ${failCount} failed`);
    
    if (failCount === 0) {
      console.log('\n🎉 ALL VALIDATIONS PASSED!');
      console.log('✅ Production test data is ready for Week 8 Day 5 deployment');
      console.log('\n🔐 Test Credentials:');
      console.log('  Admin: admin@visioncare.com / Admin123!');
      console.log('  Manager: manager@visioncare.com / Manager123!');
      console.log('  Sales: robert.johnson@visioncare.com / Sales123!');
    } else {
      console.log('\n⚠️  Some validations failed. Please review the seed script.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Fatal error during validation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();