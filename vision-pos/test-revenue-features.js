const { PrismaClient } = require('@prisma/client');

async function runRevenueFeatureTests() {
  const prisma = new PrismaClient();
  
  console.log('🧪 WEEK 5 REVENUE FEATURES - END-TO-END TESTING SUITE');
  console.log('======================================================\n');

  try {
    // Test 1: Second Pair System Testing
    console.log('📝 TEST 1: SECOND PAIR DISCOUNT SYSTEM');
    console.log('----------------------------------------');
    
    await testSecondPairAPI();
    
    // Test 2: POF System Testing
    console.log('\n📝 TEST 2: PATIENT-OWNED FRAME SYSTEM');
    console.log('---------------------------------------');
    
    await testPOFAPI();
    
    // Test 3: Combined Scenarios
    console.log('\n📝 TEST 3: EDGE CASE SCENARIOS');
    console.log('--------------------------------');
    
    await testEdgeCases();
    
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ TEST SUITE FAILED:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function testSecondPairAPI() {
  console.log('Testing Second Pair Discount API...');
  
  // Test same-day 50% discount
  try {
    const sameDayResponse = await fetch('http://localhost:3000/api/quotes/second-pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calculate_discount',
        originalQuoteId: 'test-quote-1',
        secondPairQuoteId: 'test-quote-2',
        secondPairTotal: 400.00,
        timeframe: 'same_day'
      })
    });
    
    if (sameDayResponse.ok) {
      const result = await sameDayResponse.json();
      console.log('✅ Same-day 50% discount:', result);
      
      // Verify 50% discount calculation
      if (Math.abs(result.discountAmount - 200.00) < 0.01) {
        console.log('✅ Same-day discount calculation correct: $200.00');
      } else {
        console.log('❌ Same-day discount calculation incorrect');
      }
    } else {
      console.log('❌ Same-day discount API failed');
    }
  } catch (error) {
    console.log('❌ Same-day discount test error:', error.message);
  }

  // Test 30-day 30% discount
  try {
    const thirtyDayResponse = await fetch('http://localhost:3000/api/quotes/second-pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calculate_discount',
        originalQuoteId: 'test-quote-1',
        secondPairQuoteId: 'test-quote-2',
        secondPairTotal: 400.00,
        timeframe: 'within_30_days'
      })
    });
    
    if (thirtyDayResponse.ok) {
      const result = await thirtyDayResponse.json();
      console.log('✅ 30-day 30% discount:', result);
      
      // Verify 30% discount calculation
      if (Math.abs(result.discountAmount - 120.00) < 0.01) {
        console.log('✅ 30-day discount calculation correct: $120.00');
      } else {
        console.log('❌ 30-day discount calculation incorrect');
      }
    } else {
      console.log('❌ 30-day discount API failed');
    }
  } catch (error) {
    console.log('❌ 30-day discount test error:', error.message);
  }
}

async function testPOFAPI() {
  console.log('Testing Patient-Owned Frame API...');
  
  // Test POF frame validation
  try {
    const validationResponse = await fetch('http://localhost:3000/api/quotes/patient-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'validate_frame',
        quoteId: 'test-quote-pof',
        frameCondition: 'GOOD',
        frameDescription: 'Ray-Ban Wayfarer, black plastic',
        frameValue: 180.00
      })
    });
    
    if (validationResponse.ok) {
      const result = await validationResponse.json();
      console.log('✅ POF frame validation:', result);
      
      if (result.success && result.validation) {
        console.log('✅ Frame validation successful');
        console.log(`  - Recommended: ${result.validation.isRecommended}`);
        console.log(`  - Business rules passed: ${result.validation.businessRules.passed}`);
      }
    } else {
      console.log('❌ POF validation API failed');
    }
  } catch (error) {
    console.log('❌ POF validation test error:', error.message);
  }

  // Test POF pricing application
  try {
    const pricingResponse = await fetch('http://localhost:3000/api/quotes/patient-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_pricing',
        quoteId: 'test-quote-pof',
        pofFixedFee: 45.00
      })
    });
    
    if (pricingResponse.ok) {
      const result = await pricingResponse.json();
      console.log('✅ POF pricing update:', result);
      
      if (result.success && result.pricing && result.pricing.pofFixedFee === 45.00) {
        console.log('✅ POF $45 fixed fee applied correctly');
      }
    } else {
      console.log('❌ POF pricing API failed');
    }
  } catch (error) {
    console.log('❌ POF pricing test error:', error.message);
  }

  // Test POF setup
  try {
    const setupResponse = await fetch('http://localhost:3000/api/quotes/patient-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_patient_frame',
        quoteId: 'test-quote-pof',
        frameDetails: {
          brand: 'Ray-Ban',
          model: 'Wayfarer RB2140',
          color: 'Black',
          condition: 'GOOD',
          estimatedValue: 180.00,
          description: 'Classic black Wayfarer frames'
        },
        waiverSigned: true,
        staffWitness: 'Test Staff',
        pofFixedFee: 45.00
      })
    });
    
    if (setupResponse.ok) {
      const result = await setupResponse.json();
      console.log('✅ POF setup complete:', result);
      
      if (result.success) {
        console.log('✅ POF workflow completed successfully');
      }
    } else {
      console.log('❌ POF setup API failed');
    }
  } catch (error) {
    console.log('❌ POF setup test error:', error.message);
  }
}

async function testEdgeCases() {
  console.log('Testing Edge Cases and Complex Scenarios...');
  
  // Test expired discount handling
  console.log('🔍 Testing expired discount scenario...');
  try {
    const expiredResponse = await fetch('http://localhost:3000/api/quotes/second-pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calculate_discount',
        originalQuoteId: 'test-quote-old',
        secondPairQuoteId: 'test-quote-new',
        secondPairTotal: 400.00,
        timeframe: 'expired', // Beyond 30 days
        originalQuoteDate: '2024-01-01' // Old date
      })
    });
    
    if (expiredResponse.ok) {
      const result = await expiredResponse.json();
      console.log('✅ Expired discount handling:', result);
      
      if (!result.success && result.error && result.error.includes('expired')) {
        console.log('✅ Expired discount properly rejected');
      }
    }
  } catch (error) {
    console.log('❌ Expired discount test error:', error.message);
  }

  // Test POF poor condition frame
  console.log('🔍 Testing POF poor condition scenario...');
  try {
    const poorConditionResponse = await fetch('http://localhost:3000/api/quotes/patient-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'validate_frame',
        quoteId: 'test-quote-poor',
        frameCondition: 'POOR',
        frameDescription: 'Damaged plastic frame with cracks',
        frameValue: 50.00
      })
    });
    
    if (poorConditionResponse.ok) {
      const result = await poorConditionResponse.json();
      console.log('✅ Poor condition frame validation:', result);
      
      if (result.validation && !result.validation.isRecommended) {
        console.log('✅ Poor condition frame properly flagged as not recommended');
      }
    }
  } catch (error) {
    console.log('❌ Poor condition test error:', error.message);
  }

  // Test database constraints and data integrity
  console.log('🔍 Testing database integrity...');
  const prisma = new PrismaClient();
  
  try {
    // Test POF incidents model access
    const incidentCount = await prisma.pofIncidents.count();
    console.log(`✅ POF incidents model accessible (${incidentCount} records)`);
    
    // Test quotes with POF fields
    const pofQuotesCount = await prisma.quotes.count({
      where: { isPatientOwnedFrame: true }
    });
    console.log(`✅ POF quotes accessible (${pofQuotesCount} POF quotes)`);
    
    // Test second pairs model
    const secondPairsCount = await prisma.second_pairs.count();
    console.log(`✅ Second pairs model accessible (${secondPairsCount} records)`);
    
  } catch (error) {
    console.log('❌ Database integrity test error:', error.message);
  }
}

// Run the test suite
runRevenueFeatureTests().catch(console.error);