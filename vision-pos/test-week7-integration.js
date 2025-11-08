/**
 * Week 7 Day 5 - Integration & Testing Script
 * 
 * This script comprehensively tests:
 * 1. Complete quote lifecycle testing (BUILDING → DRAFT → PRESENTED → SIGNED → COMPLETED)
 * 2. Cancellation flow testing (all states, required reason)
 * 3. Admin tools testing (add product, bulk edit, import/export, user management)
 * 4. Edge case testing (expired drafts, partial completions, multiple drafts per patient)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

class Week7IntegrationTester {
  constructor() {
    this.testResults = {
      quotesLifecycle: { passed: 0, failed: 0, tests: [] },
      cancellationFlow: { passed: 0, failed: 0, tests: [] },
      adminTools: { passed: 0, failed: 0, tests: [] },
      edgeCases: { passed: 0, failed: 0, tests: [] }
    };
    this.testCustomerId = null;
    this.testQuoteId = null;
    this.testProductId = null;
    this.testUserId = null;
    this.testLocationId = null;
  }

  // Utility methods
  async makeRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  async logTest(category, testName, passed, details = '') {
    const result = { testName, passed, details, timestamp: new Date().toISOString() };
    this.testResults[category].tests.push(result);
    
    if (passed) {
      this.testResults[category].passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.testResults[category].failed++;
      console.log(`❌ ${testName}: ${details}`);
    }
    
    if (details) {
      console.log(`   ${details}`);
    }
  }

  async setupTestData() {
    console.log('\n🔧 Setting up test data...');
    
    try {
      // Create test customer
      const customerResponse = await this.makeRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Customer',
          email: 'test@example.com',
          phone: '555-0123',
          dateOfBirth: '1990-01-01'
        })
      });
      
      if (customerResponse.ok) {
        const customer = await customerResponse.json();
        this.testCustomerId = customer.id;
        console.log(`✅ Created test customer: ${this.testCustomerId}`);
      }

      // Create test product
      const productResponse = await this.makeRequest('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Product',
          category: 'Test Category',
          price: 99.99,
          isActive: true,
          requiresPrescription: false
        })
      });

      if (productResponse.ok) {
        const product = await productResponse.json();
        this.testProductId = product.id;
        console.log(`✅ Created test product: ${this.testProductId}`);
      }

      // Create test user
      const userResponse = await this.makeRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'testuser@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'SALES',
          password: 'TestPassword123!'
        })
      });

      if (userResponse.ok) {
        const user = await userResponse.json();
        this.testUserId = user.id;
        console.log(`✅ Created test user: ${this.testUserId}`);
      }

      // Create test location
      const locationResponse = await this.makeRequest('/admin/locations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Location',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          phone: '555-0123',
          email: 'testlocation@example.com',
          isActive: true
        })
      });

      if (locationResponse.ok) {
        const location = await locationResponse.json();
        this.testLocationId = location.id;
        console.log(`✅ Created test location: ${this.testLocationId}`);
      }

    } catch (error) {
      console.log(`❌ Failed to setup test data: ${error.message}`);
    }
  }

  // 1. Quote Lifecycle Testing
  async testQuoteLifecycle() {
    console.log('\n📝 Testing Quote Lifecycle...');

    try {
      // Step 1: Create quote in BUILDING state
      const createResponse = await this.makeRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: this.testCustomerId,
          products: [
            {
              productId: this.testProductId,
              quantity: 1,
              price: 99.99
            }
          ]
        })
      });

      if (createResponse.ok) {
        const quote = await createResponse.json();
        this.testQuoteId = quote.id;
        await this.logTest('quotesLifecycle', 'Create Quote (BUILDING)', 
          quote.status === 'BUILDING', `Quote ID: ${quote.id}`);
      } else {
        await this.logTest('quotesLifecycle', 'Create Quote (BUILDING)', false, 'Failed to create quote');
        return;
      }

      // Step 2: Convert to DRAFT
      const draftResponse = await this.makeRequest(`/quotes/${this.testQuoteId}/draft`, {
        method: 'POST'
      });

      if (draftResponse.ok) {
        const draftQuote = await draftResponse.json();
        await this.logTest('quotesLifecycle', 'Convert to DRAFT', 
          draftQuote.status === 'DRAFT', `Status: ${draftQuote.status}`);
      } else {
        await this.logTest('quotesLifecycle', 'Convert to DRAFT', false, 'Failed to convert to draft');
      }

      // Step 3: Present quote
      const presentResponse = await this.makeRequest(`/quotes/${this.testQuoteId}/present`, {
        method: 'POST',
        body: JSON.stringify({
          presentationMethod: 'EMAIL'
        })
      });

      if (presentResponse.ok) {
        const presentedQuote = await presentResponse.json();
        await this.logTest('quotesLifecycle', 'Present Quote', 
          presentedQuote.status === 'PRESENTED', `Status: ${presentedQuote.status}`);
      } else {
        await this.logTest('quotesLifecycle', 'Present Quote', false, 'Failed to present quote');
      }

      // Step 4: Sign quote
      const signResponse = await this.makeRequest(`/quotes/${this.testQuoteId}/sign`, {
        method: 'POST',
        body: JSON.stringify({
          customerSignature: 'TestCustomer',
          employeeSignature: 'TestEmployee',
          signatureDate: new Date().toISOString()
        })
      });

      if (signResponse.ok) {
        const signedQuote = await signResponse.json();
        await this.logTest('quotesLifecycle', 'Sign Quote', 
          signedQuote.status === 'SIGNED', `Status: ${signedQuote.status}`);
      } else {
        await this.logTest('quotesLifecycle', 'Sign Quote', false, 'Failed to sign quote');
      }

      // Step 5: Complete quote
      const completeResponse = await this.makeRequest(`/quotes/${this.testQuoteId}/complete`, {
        method: 'POST'
      });

      if (completeResponse.ok) {
        const completedQuote = await completeResponse.json();
        await this.logTest('quotesLifecycle', 'Complete Quote', 
          completedQuote.status === 'COMPLETED', `Status: ${completedQuote.status}`);
      } else {
        await this.logTest('quotesLifecycle', 'Complete Quote', false, 'Failed to complete quote');
      }

      // Verify final state
      const finalResponse = await this.makeRequest(`/quotes/${this.testQuoteId}`);
      if (finalResponse.ok) {
        const finalQuote = await finalResponse.json();
        await this.logTest('quotesLifecycle', 'Verify Final State', 
          finalQuote.status === 'COMPLETED', `Final Status: ${finalQuote.status}`);
      }

    } catch (error) {
      await this.logTest('quotesLifecycle', 'Quote Lifecycle Test', false, error.message);
    }
  }

  // 2. Cancellation Flow Testing
  async testCancellationFlow() {
    console.log('\n❌ Testing Cancellation Flow...');

    const testStates = ['BUILDING', 'DRAFT', 'PRESENTED', 'SIGNED'];

    for (const state of testStates) {
      try {
        // Create a new quote for each state test
        const createResponse = await this.makeRequest('/quotes', {
          method: 'POST',
          body: JSON.stringify({
            customerId: this.testCustomerId,
            products: [{ productId: this.testProductId, quantity: 1, price: 99.99 }]
          })
        });

        if (!createResponse.ok) continue;

        const quote = await createResponse.json();
        let quoteId = quote.id;

        // Move quote to target state
        if (state === 'DRAFT') {
          await this.makeRequest(`/quotes/${quoteId}/draft`, { method: 'POST' });
        } else if (state === 'PRESENTED') {
          await this.makeRequest(`/quotes/${quoteId}/draft`, { method: 'POST' });
          await this.makeRequest(`/quotes/${quoteId}/present`, {
            method: 'POST',
            body: JSON.stringify({ presentationMethod: 'EMAIL' })
          });
        } else if (state === 'SIGNED') {
          await this.makeRequest(`/quotes/${quoteId}/draft`, { method: 'POST' });
          await this.makeRequest(`/quotes/${quoteId}/present`, {
            method: 'POST',
            body: JSON.stringify({ presentationMethod: 'EMAIL' })
          });
          await this.makeRequest(`/quotes/${quoteId}/sign`, {
            method: 'POST',
            body: JSON.stringify({
              customerSignature: 'Test',
              employeeSignature: 'Test',
              signatureDate: new Date().toISOString()
            })
          });
        }

        // Test cancellation
        const cancelResponse = await this.makeRequest(`/quotes/${quoteId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({
            reason: `Testing cancellation from ${state} state`
          })
        });

        if (cancelResponse.ok) {
          const canceledQuote = await cancelResponse.json();
          await this.logTest('cancellationFlow', `Cancel from ${state}`, 
            canceledQuote.status === 'CANCELLED', 
            `Canceled from ${state} to ${canceledQuote.status}`);
        } else {
          await this.logTest('cancellationFlow', `Cancel from ${state}`, false, 
            'Failed to cancel quote');
        }

        // Test cancellation without reason (should fail)
        const noReasonResponse = await this.makeRequest(`/quotes/${quoteId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({})
        });

        await this.logTest('cancellationFlow', `Cancel without reason (${state})`, 
          !noReasonResponse.ok, 'Should require cancellation reason');

      } catch (error) {
        await this.logTest('cancellationFlow', `Cancel from ${state}`, false, error.message);
      }
    }
  }

  // 3. Admin Tools Testing
  async testAdminTools() {
    console.log('\n🔧 Testing Admin Tools...');

    // Test Product Management
    await this.testProductManagement();
    
    // Test User Management
    await this.testUserManagement();
    
    // Test Location Management
    await this.testLocationManagement();
    
    // Test Import/Export
    await this.testImportExport();
  }

  async testProductManagement() {
    try {
      // Test product creation
      const createResponse = await this.makeRequest('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Admin Test Product',
          category: 'Admin Test',
          price: 149.99,
          isActive: true
        })
      });

      await this.logTest('adminTools', 'Create Product', createResponse.ok, 
        createResponse.ok ? 'Product created successfully' : 'Failed to create product');

      if (createResponse.ok) {
        const product = await createResponse.json();
        const productId = product.id;

        // Test product update
        const updateResponse = await this.makeRequest(`/admin/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Admin Test Product',
            price: 199.99
          })
        });

        await this.logTest('adminTools', 'Update Product', updateResponse.ok,
          updateResponse.ok ? 'Product updated successfully' : 'Failed to update product');

        // Test bulk operations
        const bulkResponse = await this.makeRequest('/admin/products/bulk', {
          method: 'POST',
          body: JSON.stringify({
            action: 'activate',
            productIds: [productId]
          })
        });

        await this.logTest('adminTools', 'Bulk Product Operations', bulkResponse.ok,
          bulkResponse.ok ? 'Bulk operation successful' : 'Bulk operation failed');
      }

    } catch (error) {
      await this.logTest('adminTools', 'Product Management', false, error.message);
    }
  }

  async testUserManagement() {
    try {
      // Test user creation
      const createResponse = await this.makeRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admintest@example.com',
          firstName: 'Admin',
          lastName: 'Test',
          role: 'SALES',
          password: 'AdminTest123!'
        })
      });

      await this.logTest('adminTools', 'Create User', createResponse.ok,
        createResponse.ok ? 'User created successfully' : 'Failed to create user');

      if (createResponse.ok) {
        const user = await createResponse.json();
        const userId = user.id;

        // Test user update
        const updateResponse = await this.makeRequest(`/admin/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({
            firstName: 'Updated Admin',
            role: 'ADMIN'
          })
        });

        await this.logTest('adminTools', 'Update User', updateResponse.ok,
          updateResponse.ok ? 'User updated successfully' : 'Failed to update user');

        // Test user activity logging
        const activityResponse = await this.makeRequest('/admin/users/activity');
        await this.logTest('adminTools', 'User Activity Logs', activityResponse.ok,
          activityResponse.ok ? 'Activity logs retrieved' : 'Failed to get activity logs');
      }

    } catch (error) {
      await this.logTest('adminTools', 'User Management', false, error.message);
    }
  }

  async testLocationManagement() {
    try {
      // Test location creation
      const createResponse = await this.makeRequest('/admin/locations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Admin Test Location',
          address: '456 Admin St',
          city: 'Admin City',
          state: 'AC',
          zipCode: '54321',
          phone: '555-0456',
          email: 'admintest@location.com',
          isActive: true
        })
      });

      await this.logTest('adminTools', 'Create Location', createResponse.ok,
        createResponse.ok ? 'Location created successfully' : 'Failed to create location');

      if (createResponse.ok) {
        const location = await createResponse.json();
        const locationId = location.id;

        // Test location settings
        const settingsResponse = await this.makeRequest(`/admin/locations/${locationId}/settings`, {
          method: 'PUT',
          body: JSON.stringify({
            brandingColor: '#FF0000',
            taxRate: 8.25,
            timezone: 'America/New_York'
          })
        });

        await this.logTest('adminTools', 'Location Settings', settingsResponse.ok,
          settingsResponse.ok ? 'Location settings updated' : 'Failed to update settings');
      }

    } catch (error) {
      await this.logTest('adminTools', 'Location Management', false, error.message);
    }
  }

  async testImportExport() {
    try {
      // Test export functionality
      const exportResponse = await this.makeRequest('/admin/products/import-export?action=export');
      await this.logTest('adminTools', 'Product Export', exportResponse.ok,
        exportResponse.ok ? 'Products exported successfully' : 'Export failed');

      // Test import validation
      const importResponse = await this.makeRequest('/admin/products/import-export', {
        method: 'POST',
        body: JSON.stringify({
          action: 'import',
          data: [
            {
              name: 'Imported Product',
              category: 'Import Test',
              price: 99.99,
              isActive: true
            }
          ]
        })
      });

      await this.logTest('adminTools', 'Product Import', importResponse.ok,
        importResponse.ok ? 'Products imported successfully' : 'Import failed');

    } catch (error) {
      await this.logTest('adminTools', 'Import/Export', false, error.message);
    }
  }

  // 4. Edge Case Testing
  async testEdgeCases() {
    console.log('\n🔍 Testing Edge Cases...');

    await this.testExpiredDrafts();
    await this.testPartialCompletions();
    await this.testMultipleDraftsPerPatient();
    await this.testDataValidation();
  }

  async testExpiredDrafts() {
    try {
      // Create a quote and check expiration logic
      const createResponse = await this.makeRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: this.testCustomerId,
          products: [{ productId: this.testProductId, quantity: 1, price: 99.99 }],
          expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        })
      });

      if (createResponse.ok) {
        const quote = await createResponse.json();
        
        // Try to present expired quote
        const presentResponse = await this.makeRequest(`/quotes/${quote.id}/present`, {
          method: 'POST',
          body: JSON.stringify({ presentationMethod: 'EMAIL' })
        });

        await this.logTest('edgeCases', 'Expired Draft Handling', !presentResponse.ok,
          'Should not allow presenting expired quotes');
      }

    } catch (error) {
      await this.logTest('edgeCases', 'Expired Draft Handling', false, error.message);
    }
  }

  async testPartialCompletions() {
    try {
      // Test incomplete form submissions
      const incompleteResponse = await this.makeRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: this.testCustomerId
          // Missing products
        })
      });

      await this.logTest('edgeCases', 'Incomplete Quote Creation', !incompleteResponse.ok,
        'Should reject quotes without products');

      // Test signature validation
      const createResponse = await this.makeRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: this.testCustomerId,
          products: [{ productId: this.testProductId, quantity: 1, price: 99.99 }]
        })
      });

      if (createResponse.ok) {
        const quote = await createResponse.json();
        
        // Try to sign without both signatures
        const signResponse = await this.makeRequest(`/quotes/${quote.id}/sign`, {
          method: 'POST',
          body: JSON.stringify({
            customerSignature: 'OnlyCustomer'
            // Missing employee signature
          })
        });

        await this.logTest('edgeCases', 'Incomplete Signature Validation', !signResponse.ok,
          'Should require both signatures');
      }

    } catch (error) {
      await this.logTest('edgeCases', 'Partial Completions', false, error.message);
    }
  }

  async testMultipleDraftsPerPatient() {
    try {
      // Create multiple quotes for the same customer
      const quotes = [];
      
      for (let i = 0; i < 3; i++) {
        const response = await this.makeRequest('/quotes', {
          method: 'POST',
          body: JSON.stringify({
            customerId: this.testCustomerId,
            products: [{ productId: this.testProductId, quantity: i + 1, price: 99.99 }]
          })
        });

        if (response.ok) {
          const quote = await response.json();
          quotes.push(quote.id);
        }
      }

      // Verify customer can have multiple active quotes
      const customerResponse = await this.makeRequest(`/customers/${this.testCustomerId}/quotes`);
      
      if (customerResponse.ok) {
        const customerQuotes = await customerResponse.json();
        await this.logTest('edgeCases', 'Multiple Drafts Per Patient', 
          customerQuotes.length >= 3, 
          `Customer has ${customerQuotes.length} quotes`);
      }

    } catch (error) {
      await this.logTest('edgeCases', 'Multiple Drafts Per Patient', false, error.message);
    }
  }

  async testDataValidation() {
    try {
      // Test invalid data scenarios
      const invalidQuote = await this.makeRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'invalid-id',
          products: []
        })
      });

      await this.logTest('edgeCases', 'Invalid Customer ID Validation', !invalidQuote.ok,
        'Should reject invalid customer IDs');

      // Test SQL injection prevention
      const sqlInjection = await this.makeRequest('/quotes?search=\'; DROP TABLE quotes; --');
      await this.logTest('edgeCases', 'SQL Injection Prevention', sqlInjection.ok,
        'Should handle malicious input safely');

      // Test XSS prevention
      const xssResponse = await this.makeRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: this.testCustomerId,
          products: [{ productId: this.testProductId, quantity: 1, price: 99.99 }],
          notes: '<script>alert("xss")</script>'
        })
      });

      if (xssResponse.ok) {
        const quote = await xssResponse.json();
        await this.logTest('edgeCases', 'XSS Prevention', 
          !quote.notes?.includes('<script>'),
          'Should sanitize malicious scripts');
      }

    } catch (error) {
      await this.logTest('edgeCases', 'Data Validation', false, error.message);
    }
  }

  // Cleanup test data
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      if (this.testQuoteId) {
        await this.makeRequest(`/quotes/${this.testQuoteId}`, { method: 'DELETE' });
        console.log('✅ Cleaned up test quote');
      }
      
      if (this.testCustomerId) {
        await this.makeRequest(`/customers/${this.testCustomerId}`, { method: 'DELETE' });
        console.log('✅ Cleaned up test customer');
      }
      
      if (this.testProductId) {
        await this.makeRequest(`/admin/products/${this.testProductId}`, { method: 'DELETE' });
        console.log('✅ Cleaned up test product');
      }
      
      if (this.testUserId) {
        await this.makeRequest(`/admin/users/${this.testUserId}`, { method: 'DELETE' });
        console.log('✅ Cleaned up test user');
      }
      
      if (this.testLocationId) {
        await this.makeRequest(`/admin/locations/${this.testLocationId}`, { method: 'DELETE' });
        console.log('✅ Cleaned up test location');
      }
    } catch (error) {
      console.log(`⚠️ Cleanup warning: ${error.message}`);
    }
  }

  // Generate comprehensive test report
  generateReport() {
    console.log('\n📊 WEEK 7 DAY 5 - INTEGRATION TEST RESULTS');
    console.log('==========================================');

    const categories = ['quotesLifecycle', 'cancellationFlow', 'adminTools', 'edgeCases'];
    let totalPassed = 0;
    let totalFailed = 0;

    categories.forEach(category => {
      const results = this.testResults[category];
      totalPassed += results.passed;
      totalFailed += results.failed;
      
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  ✅ Passed: ${results.passed}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      console.log(`  📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    });

    console.log('\n==========================================');
    console.log(`OVERALL RESULTS:`);
    console.log(`  ✅ Total Passed: ${totalPassed}`);
    console.log(`  ❌ Total Failed: ${totalFailed}`);
    console.log(`  📊 Overall Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
    
    const isProductionReady = (totalFailed === 0 || (totalPassed / (totalPassed + totalFailed)) >= 0.95);
    console.log(`\n🎯 PRODUCTION READY: ${isProductionReady ? '✅ YES' : '❌ NO'}`);
    
    if (!isProductionReady) {
      console.log('\n⚠️ ISSUES TO ADDRESS:');
      categories.forEach(category => {
        const failedTests = this.testResults[category].tests.filter(t => !t.passed);
        if (failedTests.length > 0) {
          console.log(`\n${category.toUpperCase()}:`);
          failedTests.forEach(test => {
            console.log(`  - ${test.testName}: ${test.details}`);
          });
        }
      });
    }

    return isProductionReady;
  }

  // Main test runner
  async runAllTests() {
    console.log('🚀 Starting Week 7 Day 5 Integration Testing...');
    console.log('Testing complete sales & admin features for production readiness\n');

    try {
      // Check if server is running
      const healthCheck = await this.makeRequest('/api/health').catch(() => null);
      if (!healthCheck) {
        console.log('❌ Server not running at http://localhost:3000');
        console.log('Please start the development server with: npm run dev');
        return false;
      }

      await this.setupTestData();
      
      // Run all test suites
      await this.testQuoteLifecycle();
      await this.testCancellationFlow();
      await this.testAdminTools();
      await this.testEdgeCases();
      
      await this.cleanup();
      
      return this.generateReport();

    } catch (error) {
      console.error('❌ Testing failed:', error.message);
      return false;
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new Week7IntegrationTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export default Week7IntegrationTester;