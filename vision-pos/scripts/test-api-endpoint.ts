import fetch from 'node-fetch';

async function testAPI() {
  console.log('🧪 Testing customers API endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/customers?page=1&limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Response Error:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ API Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`\n🎉 Success! Found ${result.data.length} customers`);
      if (result.data && result.data.length > 0) {
        console.log('\n👥 Sample customers from API:');
        result.data.forEach((customer, index) => {
          console.log(`  ${index + 1}. ${customer.firstName} ${customer.lastName} (${customer.insuranceCarrier || 'Cash Pay'})`);
        });
      }
    } else {
      console.log('\n❌ API Error:', result.error);
    }
  } catch (error) {
    console.log('\n💥 Request Failed:', error.message);
    console.log('💡 Make sure the dev server is running on port 3000');
  }
}

testAPI();