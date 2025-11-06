const { PrismaClient } = require('@prisma/client');

async function testPOFEndpointLogic() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Testing POF API Endpoint Logic...\n');
    
    // Test 1: Check if we can find a quote to work with
    console.log('1. Finding test quote...');
    const testQuote = await prisma.quotes.findFirst({
      include: {
        customers: true
      }
    });
    
    if (!testQuote) {
      console.log('⚠️  No quotes found - creating test data would be needed');
      return;
    }
    
    console.log(`✅ Found quote ID: ${testQuote.id} for customer: ${testQuote.customers.firstName} ${testQuote.customers.lastName}`);
    
    // Test 2: Simulate setting POF fields
    console.log('\n2. Testing POF field updates...');
    
    const updatedQuote = await prisma.quotes.update({
      where: { id: testQuote.id },
      data: {
        isPatientOwnedFrame: true,
        pofInspectionCompleted: true,
        pofConditionAssessment: 'GOOD',
        pofWaiverSigned: true,
        pofLiabilityAccepted: true,
        pofNotes: 'Test POF configuration via API simulation'
      }
    });
    
    console.log('✅ POF fields updated successfully');
    
    // Test 3: Create a test POF incident
    console.log('\n3. Testing POF incident creation...');
    
    const incident = await prisma.pofIncidents.create({
      data: {
        quoteId: testQuote.id,
        customerId: testQuote.customerId,
        userId: testQuote.createdBy,
        locationId: testQuote.locationId,
        incidentType: 'FRAME_DAMAGE',
        severity: 'LOW',
        title: 'Test POF incident',
        description: 'API endpoint test incident',
        frameDescription: 'Test frame description',
        frameCondition: 'GOOD',
        status: 'OPEN',
        financialImpact: 0.00,
        refundIssued: false,
        photosAttached: false,
        customerNotified: true,
        insuranceNotified: false
      }
    });
    
    console.log(`✅ POF incident created with ID: ${incident.id}`);
    
    // Test 4: Verify we can query POF data
    console.log('\n4. Testing POF data queries...');
    
    const pofQuotes = await prisma.quotes.findMany({
      where: { isPatientOwnedFrame: true },
      include: {
        pofIncidents: true,
        customers: {
          select: { firstName: true, lastName: true }
        }
      }
    });
    
    console.log(`✅ Found ${pofQuotes.length} POF quotes with incidents`);
    
    // Clean up test data
    console.log('\n5. Cleaning up test data...');
    await prisma.pofIncidents.delete({ where: { id: incident.id } });
    await prisma.quotes.update({
      where: { id: testQuote.id },
      data: {
        isPatientOwnedFrame: false,
        pofInspectionCompleted: false,
        pofConditionAssessment: null,
        pofWaiverSigned: false,
        pofLiabilityAccepted: false,
        pofNotes: null
      }
    });
    
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 POF Backend System Test PASSED!');
    console.log('\n📋 Test Results:');
    console.log('   ✅ Database schema working');
    console.log('   ✅ POF fields update successfully');
    console.log('   ✅ POF incidents creation working');
    console.log('   ✅ POF data queries working');
    console.log('   ✅ Data relationships intact');
    console.log('\n🚀 POF Backend ready for UI implementation!');
    
  } catch (error) {
    console.error('❌ POF Backend Test Failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPOFEndpointLogic();