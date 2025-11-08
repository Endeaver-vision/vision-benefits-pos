// Week 8 Day 1 - Analytics Views Setup Script
// This script creates analytics database views using raw SQL

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function setupAnalyticsViews() {
  const prisma = new PrismaClient();
  
  console.log('🔧 Setting up Analytics Database Views...\n');

  try {
    // Read the analytics views SQL file
    const sqlPath = path.join(__dirname, 'prisma', 'migrations', 'analytics_views.sql');
    const analyticsSQL = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by CREATE VIEW statements and execute each
    const viewStatements = analyticsSQL.split('CREATE VIEW IF NOT EXISTS');
    
    for (let i = 1; i < viewStatements.length; i++) {
      const viewSQL = 'CREATE VIEW IF NOT EXISTS' + viewStatements[i];
      const viewName = viewSQL.match(/CREATE VIEW IF NOT EXISTS (\w+)/)[1];
      
      try {
        await prisma.$executeRawUnsafe(viewSQL);
        console.log(`✅ Created analytics view: ${viewName}`);
      } catch (error) {
        console.log(`❌ Failed to create view ${viewName}:`, error.message);
      }
    }

    // Verify views were created
    console.log('\n📊 Verifying Analytics Views...');
    
    const views = [
      'daily_analytics',
      'staff_performance_analytics', 
      'monthly_trends',
      'customer_analytics',
      'activity_summary'
    ];

    for (const viewName of views) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${viewName} LIMIT 1`);
        console.log(`✅ View ${viewName} is accessible`);
      } catch (error) {
        console.log(`❌ View ${viewName} failed:`, error.message);
      }
    }

    console.log('\n🎉 Analytics views setup complete!');

  } catch (error) {
    console.error('❌ Error setting up analytics views:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupAnalyticsViews()
    .then(() => {
      console.log('\n✅ Analytics database views ready for use!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupAnalyticsViews;