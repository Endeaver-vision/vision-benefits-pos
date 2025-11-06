const { PrismaClient } = require('@prisma/client');

async function testPofModel() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing POF model access...');
    
    // Test if we can access the pofIncidents model
    const count = await prisma.pofIncidents.count();
    console.log('POF incidents count:', count);
    
    // Test if we can access quotes with POF fields
    const quotesWithPof = await prisma.quotes.findMany({
      where: {
        isPatientOwnedFrame: true
      },
      take: 1
    });
    console.log('Quotes with POF:', quotesWithPof.length);
    
    console.log('✅ POF model access working correctly!');
  } catch (error) {
    console.error('❌ Error accessing POF models:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPofModel();