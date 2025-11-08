// Test script to check customers API
async function testCustomersAPI() {
  console.log('🧪 Testing customers API...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/customers?page=1&limit=5');
    const result = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('✅ API Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`\n🎉 Success! Found ${result.data.length} customers`);
      if (result.data.length > 0) {
        console.log('\n👥 Sample customers:');
        result.data.forEach((customer, index) => {
          console.log(`  ${index + 1}. ${customer.firstName} ${customer.lastName} (${customer.insuranceCarrier || 'Cash Pay'})`);
        });
      }
    } else {
      console.log('\n❌ API Error:', result.error);
    }
  } catch (error) {
    console.log('\n💥 Request Failed:', error.message);
  }
}

testCustomersAPI();