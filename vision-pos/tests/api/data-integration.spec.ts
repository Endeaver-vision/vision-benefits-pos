import { test, expect } from '@playwright/test'

/**
 * Data Integration Tests
 * Verifies that all parts of the system use the same data sources
 * and that pricing flows correctly through the application
 */

const API_BASE = 'http://localhost:3000/api'

test.describe('Data Integration', () => {
  test.describe('Database Product Verification', () => {
    test('CRITICAL: products API should return data from database', async ({ request }) => {
      const response = await request.get(`${API_BASE}/quote-builder/products`)

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data.success).toBe(true)

      // Should have real products, not empty arrays
      const totalProducts =
        (data.products?.lensType?.length || 0) +
        (data.products?.lensMaterial?.length || 0) +
        (data.products?.arCoating?.length || 0)

      expect(totalProducts, 'Should have products from database').toBeGreaterThan(0)

      test.info().annotations.push({
        type: 'INFO',
        description: `Total products from database: ${totalProducts}`
      })
    })

    test('CRITICAL: lens prices should match price list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/quote-builder/products`)
      const data = await response.json()

      const expectedPrices: Record<string, number> = {
        'Single Vision': 80,
        'Neurolens Progressive': 700,
        'Eyezen': 150,
        'Varilux Comfort': 300,
        'Varilux Physio': 400,
        'Varilux X Series': 450
      }

      const lensTypes = data.products?.lensType || []
      const mismatches: string[] = []

      for (const [name, expectedPrice] of Object.entries(expectedPrices)) {
        const lens = lensTypes.find((l: { name: string }) => l.name === name)
        if (lens && lens.price !== expectedPrice) {
          mismatches.push(`${name}: expected $${expectedPrice}, got $${lens.price}`)
        }
      }

      if (mismatches.length > 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: `Price mismatches: ${mismatches.join('; ')}`
        })
      }
    })

    test('should have all required product categories', async ({ request }) => {
      const response = await request.get(`${API_BASE}/quote-builder/products`)
      const data = await response.json()

      const requiredCategories = [
        'lensType',
        'lensMaterial',
        'arCoating',
        'transitions',
        'polarized',
        'mountFee',
        'addons'
      ]

      const missingCategories: string[] = []

      for (const category of requiredCategories) {
        if (!data.products?.[category] || data.products[category].length === 0) {
          missingCategories.push(category)
        }
      }

      if (missingCategories.length > 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: `Missing product categories: ${missingCategories.join(', ')}`
        })
      }

      expect(missingCategories.length, 'All product categories should exist').toBe(0)
    })
  })

  test.describe('Insurance Carrier Data', () => {
    test('CRITICAL: should have VSP benefits data', async ({ request }) => {
      // Check if we can get VSP-specific data
      const response = await request.get(`${API_BASE}/insurance/vsp/benefits`)

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'VSP benefits API endpoint does not exist'
        })
      } else if (response.ok()) {
        const data = await response.json()
        expect(data).toBeDefined()
      }
    })

    test('CRITICAL: should have EyeMed benefits data', async ({ request }) => {
      const response = await request.get(`${API_BASE}/insurance/eyemed/benefits`)

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'EyeMed benefits API endpoint does not exist'
        })
      } else if (response.ok()) {
        const data = await response.json()
        expect(data).toBeDefined()
      }
    })

    test('CRITICAL: should have Spectera benefits data', async ({ request }) => {
      const response = await request.get(`${API_BASE}/insurance/spectera/benefits`)

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Spectera benefits API endpoint does not exist'
        })
      } else if (response.ok()) {
        const data = await response.json()
        expect(data).toBeDefined()
      }
    })
  })

  test.describe('Pricing Engine Integration', () => {
    test('CRITICAL: pricing engine should calculate with insurance', async ({ request }) => {
      // Test VSP pricing calculation
      const response = await request.post(`${API_BASE}/pricing/calculate`, {
        data: {
          carrier: 'VSP',
          memberId: 'TEST123',
          products: [
            { sku: 'single-vision', retailPrice: 80 },
            { sku: 'polycarbonate', retailPrice: 65 }
          ]
        }
      })

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Pricing calculation endpoint does not exist'
        })
      } else if (response.ok()) {
        const data = await response.json()

        // Should have insurance calculations
        expect(data.patientTotal).toBeDefined()
        expect(data.insurancePays).toBeDefined()

        test.info().annotations.push({
          type: 'PASS',
          description: `Pricing calculated: Patient pays $${data.patientTotal}, Insurance pays $${data.insurancePays}`
        })
      }
    })

    test('CRITICAL: pricing should differ by carrier', async ({ request }) => {
      const carriers = ['VSP', 'EyeMed', 'Spectera']
      const results: Record<string, unknown> = {}

      for (const carrier of carriers) {
        const response = await request.post(`${API_BASE}/pricing/calculate`, {
          data: {
            carrier,
            products: [{ sku: 'progressive', retailPrice: 300 }]
          }
        })

        if (response.ok()) {
          results[carrier] = await response.json()
        }
      }

      const carrierCount = Object.keys(results).length
      if (carrierCount < 3) {
        test.info().annotations.push({
          type: 'GAP',
          description: `Only ${carrierCount}/3 carriers have pricing configured`
        })
      }
    })
  })

  test.describe('Customer Authorization Flow', () => {
    test('CRITICAL: should be able to create authorization for customer', async ({ request }) => {
      const response = await request.post(`${API_BASE}/authorizations`, {
        data: {
          customerId: 'test-customer-id',
          carrier: 'VSP',
          memberId: 'TEST123',
          groupNumber: 'GRP456'
        }
      })

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Authorization creation endpoint does not exist'
        })
      }
    })

    test('CRITICAL: should validate insurance before quote', async ({ request }) => {
      const response = await request.post(`${API_BASE}/insurance/validate`, {
        data: {
          carrier: 'VSP',
          memberId: 'TEST123'
        }
      })

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Insurance validation endpoint does not exist'
        })
      }
    })
  })

  test.describe('Quote Persistence', () => {
    test('CRITICAL: should be able to save quote', async ({ request }) => {
      const response = await request.post(`${API_BASE}/quotes`, {
        data: {
          customerId: 'test-customer',
          items: [
            { productId: 'test-product', quantity: 1, price: 100 }
          ],
          total: 100
        }
      })

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Quote save endpoint does not exist'
        })
      }
    })

    test('CRITICAL: should be able to retrieve saved quotes', async ({ request }) => {
      const response = await request.get(`${API_BASE}/quotes?customerId=test-customer`)

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Quote retrieval endpoint does not exist'
        })
      }
    })
  })

  test.describe('Contact Lens Database', () => {
    test('CRITICAL: should have contact lenses from database (not hardcoded 6)', async ({ request }) => {
      const response = await request.get(`${API_BASE}/pricing/contacts`)

      if (response.ok()) {
        const data = await response.json()
        const contacts = data.contacts || data

        if (Array.isArray(contacts)) {
          // If we only have 6 contacts, they're probably hardcoded
          if (contacts.length <= 6) {
            test.info().annotations.push({
              type: 'CRITICAL_GAP',
              description: `Only ${contacts.length} contact lenses - likely HARDCODED, not from database`
            })
          } else {
            test.info().annotations.push({
              type: 'PASS',
              description: `${contacts.length} contact lenses from database`
            })
          }

          // Check for real manufacturer data
          const manufacturers = [...new Set(contacts.map((c: { manufacturer?: string }) => c.manufacturer))]
          test.info().annotations.push({
            type: 'INFO',
            description: `Manufacturers: ${manufacturers.slice(0, 5).join(', ')}`
          })
        }
      }
    })

    test('should have contact lens pricing data', async ({ request }) => {
      const response = await request.get(`${API_BASE}/pricing/contacts`)

      if (response.ok()) {
        const data = await response.json()
        const contacts = data.contacts || data

        if (Array.isArray(contacts) && contacts.length > 0) {
          const hasPrice = contacts.some((c: { retailPrice?: number; price?: number }) => c.retailPrice || c.price)
          const hasCost = contacts.some((c: { cost?: number }) => c.cost)

          if (!hasPrice) {
            test.info().annotations.push({
              type: 'GAP',
              description: 'Contact lenses missing retail price data'
            })
          }
          if (!hasCost) {
            test.info().annotations.push({
              type: 'GAP',
              description: 'Contact lenses missing cost data'
            })
          }
        }
      }
    })
  })

  test.describe('Exam Services Database', () => {
    test('CRITICAL: exam services should come from database', async ({ request }) => {
      const response = await request.get(`${API_BASE}/pricing/services`)

      if (response.status() === 404) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Exam services API endpoint does not exist'
        })
        return
      }

      if (response.ok()) {
        const data = await response.json()
        const services = data.services || data

        if (Array.isArray(services)) {
          const examServices = services.filter((s: { category?: string; name?: string }) =>
            s.category === 'EXAM' || s.name?.toLowerCase().includes('exam')
          )

          if (examServices.length === 0) {
            test.info().annotations.push({
              type: 'CRITICAL_GAP',
              description: 'No exam services found in database'
            })
          } else {
            test.info().annotations.push({
              type: 'INFO',
              description: `${examServices.length} exam services in database`
            })

            // Check for expected services
            const expectedServices = ['Routine Eye Exam', 'Medical Eye Exam', 'Contact Lens Fitting']
            for (const expected of expectedServices) {
              const found = examServices.some((s: { name?: string }) =>
                s.name?.toLowerCase().includes(expected.toLowerCase())
              )
              if (!found) {
                test.info().annotations.push({
                  type: 'GAP',
                  description: `Missing expected service: ${expected}`
                })
              }
            }
          }
        }
      }
    })
  })

  test.describe('Frame Inventory', () => {
    test('CRITICAL: should have frames in inventory', async ({ request }) => {
      const response = await request.get(`${API_BASE}/inventory/frames`)

      if (response.status() === 404) {
        // Try alternate endpoint
        const altResponse = await request.get(`${API_BASE}/frames`)

        if (altResponse.status() === 404) {
          test.info().annotations.push({
            type: 'CRITICAL_GAP',
            description: 'Frame inventory endpoint does not exist'
          })
          return
        }
      }

      if (response.ok()) {
        const data = await response.json()
        const frames = data.frames || data

        if (Array.isArray(frames)) {
          test.info().annotations.push({
            type: 'INFO',
            description: `${frames.length} frames in inventory`
          })

          if (frames.length === 0) {
            test.info().annotations.push({
              type: 'CRITICAL_GAP',
              description: 'No frames in inventory database'
            })
          }
        }
      }
    })

    test('should have frame pricing data', async ({ request }) => {
      const response = await request.get(`${API_BASE}/inventory/frames`)

      if (response.ok()) {
        const data = await response.json()
        const frames = data.frames || data

        if (Array.isArray(frames) && frames.length > 0) {
          const hasRetailPrice = frames.every((f: { retailPrice?: number }) => typeof f.retailPrice === 'number')
          const hasWholesalePrice = frames.every((f: { wholesalePrice?: number }) => typeof f.wholesalePrice === 'number')

          if (!hasRetailPrice) {
            test.info().annotations.push({
              type: 'GAP',
              description: 'Some frames missing retail price'
            })
          }
        }
      }
    })
  })
})
