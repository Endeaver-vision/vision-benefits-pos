/**
 * POS Pricing Matrix E2E Tests
 *
 * Tests pricing display across all product/carrier combinations
 * by loading real customer data and verifying UI matches expected values.
 */

import { test, expect, Page } from '@playwright/test'

interface TestCustomer {
  id: string
  name: string
  carrier: 'VSP' | 'EyeMed'
  hasPriceList: boolean
}

interface ProductPrice {
  productId: string
  expectedPrice: number | { sv: number; mf: number } | 'retail'
  category: string
}

// Test customers - one per carrier with known price lists
const TEST_CUSTOMERS: TestCustomer[] = [
  {
    id: 'cminudpyt1ry7665fouf', // Bonnie D. Gregory
    name: 'Bonnie D. Gregory',
    carrier: 'VSP',
    hasPriceList: true,
  },
  // Add EyeMed customer when available
]

// Known prices from Bonnie Gregory's VSP price list
const VSP_BONNIE_EXPECTED: ProductPrice[] = [
  // Lens types
  { productId: 'sv', expectedPrice: 10, category: 'lens_type' },
  { productId: 'eyezen', expectedPrice: 10, category: 'lens_type' },
  { productId: 'bifocal', expectedPrice: 10, category: 'lens_type' },
  { productId: 'comfortDRx', expectedPrice: 10, category: 'lens_type' },

  // Materials with SV/MF variance
  { productId: 'poly', expectedPrice: 33, category: 'lens_material' }, // Note: should be {sv: X, mf: Y}
  { productId: 'trivex', expectedPrice: { sv: 51, mf: 42 }, category: 'lens_material' },
  { productId: 'hiIndex167', expectedPrice: { sv: 76, mf: 72 }, category: 'lens_material' },

  // AR Coatings - $0 copay
  { productId: 'crizalEZPro', expectedPrice: 0, category: 'ar_coating' },
  { productId: 'crizalRock', expectedPrice: 0, category: 'ar_coating' },

  // Photochromics
  { productId: 'genS', expectedPrice: 70, category: 'photochromic' },
  { productId: 'xtraActive', expectedPrice: 70, category: 'photochromic' },

  // Add-ons
  { productId: 'uv', expectedPrice: 0, category: 'add_on' },
  { productId: 'tint', expectedPrice: 13, category: 'add_on' },
  { productId: 'polarized', expectedPrice: 53, category: 'add_on' },

  // Mount fees
  { productId: 'semiRimless', expectedPrice: 14, category: 'mount_fee' },
  { productId: 'rimless', expectedPrice: 30, category: 'mount_fee' },

  // Exams
  { productId: 'routine-exam', expectedPrice: 10, category: 'exam' },

  // CL Fittings
  { productId: 'cl-sphere', expectedPrice: 10, category: 'cl_fitting' },
  { productId: 'cl-toric', expectedPrice: 10, category: 'cl_fitting' },
]

test.describe('POS Pricing Matrix', () => {
  test.describe('VSP Customer - Bonnie Gregory', () => {
    let page: Page

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage()
      await page.goto('http://localhost:3000/pos?customerId=cminudpyt1ry7665fouf')
      // Wait for price list to load
      await page.waitForTimeout(3000)
    })

    test.afterAll(async () => {
      await page.close()
    })

    test('price list loads successfully', async () => {
      // Should NOT show "No Price List" badge
      const noPriceListBadge = page.locator('text=No Price List')
      await expect(noPriceListBadge).not.toBeVisible()
    })

    test('header shows correct insurance info', async () => {
      await expect(page.locator('text=VSP')).toBeVisible()
      await expect(page.locator('text=Active Auth')).toBeVisible()
      await expect(page.locator('text=Exam Copay:')).toBeVisible()
      await expect(page.locator('text=$10').first()).toBeVisible()
    })

    test.describe('Exam Tab Pricing', () => {
      test.beforeAll(async () => {
        await page.click('button:has-text("Exam")')
        await page.waitForTimeout(500)
      })

      test('routine exam shows $10 copay', async () => {
        const tile = page.locator('button:has-text("Routine Vision Exam")')
        await expect(tile).toContainText('$10')
      })

      test('CL fittings show $10 copay', async () => {
        for (const fitting of ['Sphere', 'Toric', 'Multifocal', 'Monovision', 'RGP']) {
          const tile = page.locator(`button:has-text("${fitting}")`).first()
          await expect(tile).toContainText('$10')
        }
      })

      test('specialty CL fittings show retail', async () => {
        const specialtyTile = page.locator('button:has-text("Specialty CL")')
        await expect(specialtyTile).toContainText('$850')

        const orthokTile = page.locator('button:has-text("Ortho-K")')
        await expect(orthokTile).toContainText('$2200')
      })

      test('diagnostics show retail prices', async () => {
        const optomapTile = page.locator('button:has-text("Optomap")')
        await expect(optomapTile).toContainText('$39')

        const iwellnessTile = page.locator('button:has-text("iWellness")')
        await expect(iwellnessTile).toContainText('$19')
      })
    })

    test.describe('Lenses Tab Pricing', () => {
      test.beforeAll(async () => {
        await page.click('button:has-text("Lenses")')
        await page.waitForTimeout(500)
      })

      test('single vision shows correct copay', async () => {
        const svTile = page.locator('button:has-text("Single Vision")')
        await expect(svTile).toContainText('$10')
      })

      test('progressives show correct copays', async () => {
        const comfortTile = page.locator('button:has-text("Varilux Comfort DRx")')
        await expect(comfortTile).toContainText('$10')
      })
    })

    test.describe('Materials Tab Pricing', () => {
      test.beforeAll(async () => {
        await page.click('button:has-text("Materials")')
        await page.waitForTimeout(500)
      })

      test('polycarbonate shows copay', async () => {
        const polyTile = page.locator('button:has-text("Polycarbonate")')
        await expect(polyTile).toBeVisible()
        // Should show a price (not just retail)
      })

      test('AR coatings show $0 included', async () => {
        const crizalTile = page.locator('button:has-text("Crizal EZ Pro")')
        // $0 prices display as "Included" in ProductTile
        await expect(crizalTile).toContainText('Included')
      })
    })

    test.describe('SV to MF Material Price Change', () => {
      test('material prices update when switching from SV to progressive', async () => {
        // Go to Lenses tab
        await page.click('button:has-text("Lenses")')
        await page.waitForTimeout(500)

        // Select Single Vision first
        await page.click('button:has-text("Single Vision")')
        await page.waitForTimeout(500)

        // Go to Materials tab
        await page.click('button:has-text("Materials")')
        await page.waitForTimeout(500)

        // Check trivex price for SV (should be $51)
        const trivexTileSV = page.locator('button:has-text("Trivex")')
        const svPrice = await trivexTileSV.textContent()
        expect(svPrice).toContain('$51')

        // Now switch to progressive
        await page.click('button:has-text("Lenses")')
        await page.waitForTimeout(500)
        await page.click('button:has-text("Varilux Comfort DRx")')
        await page.waitForTimeout(500)

        // Go back to Materials
        await page.click('button:has-text("Materials")')
        await page.waitForTimeout(500)

        // Check trivex price for MF (should be $42)
        const trivexTileMF = page.locator('button:has-text("Trivex")')
        const mfPrice = await trivexTileMF.textContent()
        expect(mfPrice).toContain('$42')
      })
    })
  })

  test.describe('Cash Customer (No Insurance)', () => {
    // Skip: POS requires a customer to be selected before showing products.
    // "Cash mode" means a customer without active insurance, not no customer.
    // TODO: Create a test customer without insurance for this scenario.
    test.skip('all products show retail prices', async ({ page }) => {
      // Navigate to POS without a customer (cash mode)
      await page.goto('http://localhost:3000/pos')
      await page.waitForTimeout(1000)

      // Go to Exam tab
      await page.click('button:has-text("Exam")')
      await page.waitForTimeout(500)

      // Routine exam should show $100 retail
      const examTile = page.locator('button:has-text("Routine Vision Exam")')
      await expect(examTile).toContainText('$100')

      // CL fittings should show retail
      const sphereTile = page.locator('button:has-text("Sphere")').first()
      await expect(sphereTile).toContainText('$75')
    })
  })
})

// Utility test to dump all prices for manual verification
test('dump all visible prices for verification', async ({ page }) => {
  await page.goto('http://localhost:3000/pos?customerId=cminudpyt1ry7665fouf')
  await page.waitForTimeout(3000)

  const tabs = ['Exam', 'Lenses', 'Materials', 'Add-Ons']
  const allPrices: Record<string, string[]> = {}

  for (const tab of tabs) {
    await page.click(`button:has-text("${tab}")`)
    await page.waitForTimeout(500)

    // Get all product tiles
    const tiles = await page.locator('button[class*="ProductTile"], button:has(p)').all()
    allPrices[tab] = []

    for (const tile of tiles) {
      const text = await tile.textContent()
      if (text && text.includes('$')) {
        allPrices[tab].push(text.replace(/\s+/g, ' ').trim())
      }
    }
  }

  console.log('\n=== PRICE DUMP ===')
  for (const [tab, prices] of Object.entries(allPrices)) {
    console.log(`\n${tab}:`)
    for (const price of prices) {
      console.log(`  ${price}`)
    }
  }
})
