const { calculatePOFPricing, validatePatientOwnedFrame } = require('./src/lib/patient-owned-frames');

async function testPOFLogic() {
  console.log('Testing POF Business Logic...\n');
  
  // Test pricing calculation
  console.log('1. Testing pricing calculation:');
  const pricing = calculatePOFPricing('GOOD');
  console.log('GOOD condition pricing:', pricing);
  
  const excellentPricing = calculatePOFPricing('EXCELLENT');
  console.log('EXCELLENT condition pricing:', excellentPricing);
  
  const poorPricing = calculatePOFPricing('POOR');
  console.log('POOR condition pricing:', poorPricing);
  
  // Test validation
  console.log('\n2. Testing frame validation:');
  const validationResult = await validatePatientOwnedFrame({
    frameCondition: 'GOOD',
    frameDescription: 'Oakley titanium frame',
    patientAge: 35,
    prescriptionType: 'SINGLE_VISION'
  });
  
  console.log('Validation result:', validationResult);
  
  console.log('\n✅ POF logic testing complete!');
}

testPOFLogic().catch(console.error);