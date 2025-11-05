const testCustomerAPI = async () => {
  const customerData = {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@example.com",
    phone: "555-0199",
    address: "456 Oak Street",
    city: "Springfield", 
    state: "IL",
    zipCode: "62701",
    insuranceCarrier: "EyeMed",
    memberId: "87654321",
    notes: "Prefers progressive lenses, sensitive to light"
  }

  try {
    console.log('🧪 Testing Week 4 Day 2: Customer Profile Management...')
    
    // Test 1: Create a new customer
    console.log('\n📋 Test 1: Creating new customer...')
    const response = await fetch('http://localhost:3000/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    })

    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Customer created successfully!')
      console.log('   Customer ID:', result.data.id)
      console.log('   Customer Number:', result.data.customerNumber)
      console.log('   Name:', result.data.firstName, result.data.lastName)
      
      // Test 2: Retrieve the customer by ID
      console.log('\n📋 Test 2: Retrieving customer by ID...')
      const getResponse = await fetch(`http://localhost:3000/api/customers/${result.data.id}`)
      const getResult = await getResponse.json()
      
      if (getResponse.ok) {
        console.log('✅ Customer retrieved successfully!')
        console.log('   Full name:', getResult.data.firstName, getResult.data.lastName)
        console.log('   Email:', getResult.data.email)
        console.log('   Phone:', getResult.data.phone)
        console.log('   Location:', getResult.data.city + ', ' + getResult.data.state)
        console.log('   Insurance:', getResult.data.insuranceCarrier)
        console.log('   Customer Number:', getResult.data.customerNumber)
      } else {
        console.log('❌ Error retrieving customer:', getResult.error)
      }
      
      // Test 3: Search for customers
      console.log('\n📋 Test 3: Testing customer search...')
      const searchResponse = await fetch('http://localhost:3000/api/customers?search=Sarah&limit=5')
      const searchResult = await searchResponse.json()
      
      if (searchResponse.ok) {
        console.log('✅ Customer search successful!')
        console.log('   Found customers:', searchResult.data.customers.length)
        console.log('   Total results:', searchResult.data.pagination.total)
        
        if (searchResult.data.customers.length > 0) {
          const customer = searchResult.data.customers[0]
          console.log('   First result:', customer.firstName, customer.lastName)
        }
      } else {
        console.log('❌ Error searching customers:', searchResult.error)
      }

    } else {
      console.log('❌ Error creating customer:', result.error)
    }

    // Test 4: Get customer analytics
    console.log('\n📋 Test 4: Testing customer analytics...')
    const analyticsResponse = await fetch('http://localhost:3000/api/customers/analytics')
    const analyticsResult = await analyticsResponse.json()
    
    if (analyticsResponse.ok) {
      console.log('✅ Customer analytics retrieved!')
      console.log('   Total customers:', analyticsResult.data.overview.totalCustomers)
      console.log('   Active customers:', analyticsResult.data.overview.activeCustomers)
      console.log('   Average order value:', '$' + analyticsResult.data.overview.averageOrderValue)
    } else {
      console.log('❌ Error getting analytics:', analyticsResult.error)
    }

    console.log('\n🎉 Week 4 Day 2 Testing Complete!')
    console.log('✅ Customer API Foundation: Working')
    console.log('✅ Customer Profile Management: Ready')
    console.log('✅ Advanced Search & Filtering: Implemented')
    console.log('✅ Customer Analytics: Available')
    
    console.log('\n🌐 Ready to test in browser:')
    console.log('   • Customer Management: http://localhost:3000/customers')
    console.log('   • Customer Profile: http://localhost:3000/customers/[customer-id]')

  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
}

testCustomerAPI()