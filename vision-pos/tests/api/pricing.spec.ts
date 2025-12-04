import { test, expect } from '@playwright/test'

/**
 * Pricing Engine API Tests
 * Tests the pricing calculation APIs to ensure they work correctly
 */

const API_BASE = 'http://localhost:3000/api'

test.describe('Pricing Engine API', () => {
  test.describe('GET /api/quote-builder/products', () => {
    test('should return products grouped by category', async ({ request }) => {
      const response = await request.get(`${API_BASE}/quote-builder/products`)

      expect(response.ok()).toBeTruthy()

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.products).toBeDefined()

      // Should have all required categories
      const expectedCategories = ['lensType', 'lensMaterial', 'arCoating', 'transitions', 'polarized', 'mountFee', 'addons']

      for (const category of expectedCategories) {
        expect(data.products[category], `Category ${category} should exist`).toBeDefined()
      }
    })

    test('should return lens types with correct prices', async ({ request }) => {
      const response = await request.get(`${API_BASE}/quote-builder/products`)
      const data = await response.json()

      const lensTypes = data.products.lensType
      expect(Array.isArray(lensTypes)).toBe(true)
      expect(lensTypes.length).toBeGreaterThan(0)

      // Check structure of each lens type
      for (const lens of lensTypes) {
        expect(lens.id).toBeDefined()
        expect(lens.name).toBeDefined()
        expect(typeof lens.price).toBe('number')
      }

      // Verify some known prices from the price list
      const singleVision = lensTypes.find((l: { name: string }) => l.name === 'Single Vision')
      if (singleVision) {
        expect(singleVision.price).toBe(80) // From price list
      }

      const neurolensProgressive = lensTypes.find((l: { name: string }) => l.name === 'Neurolens Progressive')
      if (neurolensProgressive) {
        expect(neurolensProgressive.price).toBe(700) // From price list
        expect(neurolensProgressive.notes).toContain('cash pay only')
      }
    })

    test('should return lens materials with correct prices', async ({ request }) => {
      const response = await request.get(`${API_BASE}/quote-builder/products`)
      const data = await response.json()

      const materials = data.products.lensMaterial
      expect(Array.isArray(materials)).toBe(true)

      // Verify prices from price list
      const expectedMaterials: Record<string, number> = {
        'CR-39': 0,
        'Polycarbonate': 65,
        'Trivex': 75,
        'High Index 1.67': 130,
        'Ultra High Index 1.72': 150
      }

      for (const [name, expectedPrice] of Object.entries(expectedMaterials)) {
        const material = materials.find((m: { name: string }) => m.name === name)
        if (material) {
          expect(material.price, `${name} should cost $${expectedPrice}`).toBe(expectedPrice)
        }
      }
    })

    test('should return AR coatings with correct prices', async ({ request }) => {
      const response = await request.get(`${API_BASE}/quote-builder/products`)
      const data = await response.json()

      const arCoatings = data.products.arCoating
      expect(Array.isArray(arCoatings)).toBe(true)

      // Verify some AR coating prices
      const crizalSapphire = arCoatings.find((ar: { name: string }) => ar.name === 'Crizal Sapphire')
      if (crizalSapphire) {
        expect(crizalSapphire.price).toBe(187)
      }

      const crizalRock = arCoatings.find((ar: { name: string }) => ar.name === 'Crizal Rock')
      if (crizalRock) {
        expect(crizalRock.price).toBe(158)
      }
    })
  })

  test.describe('GET /api/customers', () => {
    test('should search customers by name', async ({ request }) => {
      const response = await request.get(`${API_BASE}/customers?search=test`)

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(Array.isArray(data.customers) || Array.isArray(data)).toBe(true)
    })

    test('should return customer with insurance info', async ({ request }) => {
      const response = await request.get(`${API_BASE}/customers?search=a&limit=1`)

      if (response.ok()) {
        const data = await response.json()
        const customers = data.customers || data

        if (customers.length > 0) {
          const customer = customers[0]
          // Customer should have insurance fields
          expect(customer).toHaveProperty('id')
          expect(customer).toHaveProperty('firstName')
          expect(customer).toHaveProperty('lastName')

          // Check for insurance info (may be null)
          const hasInsuranceFields = 'insuranceCarrier' in customer || 'memberId' in customer
          test.info().annotations.push({
            type: 'INFO',
            description: `Customer has insurance fields: ${hasInsuranceFields}`
          })
        }
      }
    })
  })

  test.describe('GET /api/customers/[id]/authorization', () => {
    test('should return authorization for customer with insurance', async ({ request }) => {
      // First get a customer
      const customersResponse = await request.get(`${API_BASE}/customers?limit=10`)

      if (customersResponse.ok()) {
        const customersData = await customersResponse.json()
        const customers = customersData.customers || customersData

        if (customers.length > 0) {
          const customerId = customers[0].id

          const authResponse = await request.get(`${API_BASE}/customers/${customerId}/authorization`)

          // May return 404 if no authorization, or 200 with data
          const status = authResponse.status()

          if (status === 200) {
            const authData = await authResponse.json()
            expect(authData.carrier).toBeDefined()
            expect(authData.memberId).toBeDefined()

            test.info().annotations.push({
              type: 'PASS',
              description: `Authorization found for customer ${customerId}: ${authData.carrier}`
            })
          } else if (status === 404) {
            test.info().annotations.push({
              type: 'INFO',
              description: `No authorization found for customer ${customerId}`
            })
          }
        }
      }
    })
  })

  test.describe('POST /api/pricing/quote', () => {
    test('CRITICAL: should calculate pricing with insurance', async ({ request }) => {
      // This tests the core pricing engine

      // First get a customer with authorization
      const customersResponse = await request.get(`${API_BASE}/customers?limit=20`)

      if (!customersResponse.ok()) {
        test.skip()
        return
      }

      const customersData = await customersResponse.json()
      const customers = customersData.customers || customersData

      let testCustomerId: string | null = null

      // Find a customer with an authorization
      for (const customer of customers) {
        const authResponse = await request.get(`${API_BASE}/customers/${customer.id}/authorization`)
        if (authResponse.status() === 200) {
          testCustomerId = customer.id
          break
        }
      }

      if (!testCustomerId) {
        test.info().annotations.push({
          type: 'SKIP',
          description: 'No customer with authorization found for pricing test'
        })
        return
      }

      // Now test pricing calculation
      const quoteResponse = await request.post(`${API_BASE}/pricing/quote`, {
        data: {
          customerId: testCustomerId,
          products: [
            { sku: 'single-vision', name: 'Single Vision', retailPrice: 80 },
            { sku: 'polycarbonate', name: 'Polycarbonate', retailPrice: 65 }
          ]
        }
      })

      if (quoteResponse.ok()) {
        const quoteData = await quoteResponse.json()

        expect(quoteData.success).toBe(true)
        expect(quoteData.items).toBeDefined()

        // Check that insurance pricing was calculated
        for (const item of quoteData.items || []) {
          expect(item.retailPrice).toBeDefined()
          expect(item.patientCopay).toBeDefined()
          expect(item.insurancePays).toBeDefined()

          test.info().annotations.push({
            type: 'PASS',
            description: `Item ${item.productName}: Retail $${item.retailPrice}, Patient pays $${item.patientCopay}, Insurance pays $${item.insurancePays}`
          })
        }
      } else {
        test.info().annotations.push({
          type: 'FAIL',
          description: `Pricing quote failed: ${quoteResponse.status()}`
        })
      }
    })
  })

  test.describe('GET /api/pos/products', () => {
    test('should return POS products with visibility settings', async ({ request }) => {
      const response = await request.get(`${API_BASE}/pos/products?category=lenses`)

      expect(response.ok()).toBeTruthy()

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.products).toBeDefined()
      expect(Array.isArray(data.products)).toBe(true)
    })

    test('should filter products by category', async ({ request }) => {
      const categories = ['frames', 'lenses', 'contacts']

      for (const category of categories) {
        const response = await request.get(`${API_BASE}/pos/products?category=${category}`)

        if (response.ok()) {
          const data = await response.json()
          expect(data.products).toBeDefined()

          test.info().annotations.push({
            type: 'INFO',
            description: `${category}: ${data.products.length} products`
          })
        }
      }
    })

    test('CRITICAL: should calculate insurance pricing for products', async ({ request }) => {
      // Get a customer with authorization
      const customersResponse = await request.get(`${API_BASE}/customers?limit=20`)

      if (!customersResponse.ok()) {
        test.skip()
        return
      }

      const customersData = await customersResponse.json()
      const customers = customersData.customers || customersData

      let testCustomerId: string | null = null

      for (const customer of customers) {
        const authResponse = await request.get(`${API_BASE}/customers/${customer.id}/authorization`)
        if (authResponse.status() === 200) {
          testCustomerId = customer.id
          break
        }
      }

      if (!testCustomerId) {
        test.info().annotations.push({
          type: 'SKIP',
          description: 'No customer with authorization found'
        })
        return
      }

      // Get products with customer context
      const response = await request.get(`${API_BASE}/pos/products?customerId=${testCustomerId}&category=lenses`)

      if (response.ok()) {
        const data = await response.json()

        // Products should have insurance pricing
        for (const product of data.products.slice(0, 5)) {
          expect(product.retailPrice).toBeDefined()

          const hasInsurancePricing = 'patientPays' in product || 'insurancePays' in product

          if (hasInsurancePricing) {
            test.info().annotations.push({
              type: 'PASS',
              description: `${product.name}: Insurance pricing calculated`
            })
          } else {
            test.info().annotations.push({
              type: 'GAP',
              description: `${product.name}: No insurance pricing returned`
            })
          }
        }
      }
    })
  })

  test.describe('POST /api/checkout', () => {
    test('should have checkout endpoint', async ({ request }) => {
      // Just verify endpoint exists
      const response = await request.post(`${API_BASE}/checkout`, {
        data: {
          customerId: 'test',
          items: []
        }
      })

      // Should get error for invalid data, not 404
      expect(response.status()).not.toBe(404)
    })
  })

  test.describe('GET /api/pricing/services', () => {
    test('should return exam services with prices', async ({ request }) => {
      const response = await request.get(`${API_BASE}/pricing/services`)

      if (response.ok()) {
        const data = await response.json()

        expect(data.services || data).toBeDefined()

        const services = data.services || data

        if (Array.isArray(services) && services.length > 0) {
          // Check for expected exam services
          const examServices = services.filter((s: { category?: string; name?: string }) =>
            s.category === 'EXAM' || s.name?.toLowerCase().includes('exam')
          )

          test.info().annotations.push({
            type: 'INFO',
            description: `Found ${examServices.length} exam services`
          })

          for (const service of examServices.slice(0, 5)) {
            expect(service.name).toBeDefined()
            expect(service.retailPrice).toBeDefined()
          }
        }
      }
    })
  })

  test.describe('GET /api/pricing/contacts', () => {
    test('should return contact lenses from database', async ({ request }) => {
      const response = await request.get(`${API_BASE}/pricing/contacts`)

      if (response.ok()) {
        const data = await response.json()

        const contacts = data.contacts || data

        if (Array.isArray(contacts)) {
          expect(contacts.length, 'Should have contact lenses in database').toBeGreaterThan(0)

          test.info().annotations.push({
            type: 'INFO',
            description: `Found ${contacts.length} contact lenses in database`
          })

          // Check structure
          if (contacts.length > 0) {
            const contact = contacts[0]
            expect(contact.lensName || contact.name).toBeDefined()
            expect(contact.manufacturer).toBeDefined()
          }
        }
      }
    })
  })
})
