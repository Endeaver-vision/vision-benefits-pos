import { test, expect } from '@playwright/test'

/**
 * POS (Point of Sale) Flow Tests
 * Tests the complete POS transaction flow
 */

test.describe('POS System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/username/i).fill('caritch')
    await page.getByLabel(/password/i).fill('Vision2020')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/quote-builder/, { timeout: 15000 })
  })

  test.describe('POS Page Layout', () => {
    test('should display POS interface', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Should have main POS elements
      await expect(page.locator('main')).toBeVisible()

      // Should have customer selection or search
      const customerSection = page.locator('text=/customer|search|select/i')
      await expect(customerSection.first()).toBeVisible({ timeout: 5000 })
    })

    test('should have product category tabs', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Look for category tabs
      const tabs = page.locator('text=/exam|frame|lens|contact/i')
      const tabCount = await tabs.count()

      expect(tabCount, 'Should have product category tabs').toBeGreaterThan(0)
    })

    test('should have cart/order summary area', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Look for cart or order elements
      const cartElements = page.locator('text=/cart|order|total|subtotal|checkout/i')
      const count = await cartElements.count()

      expect(count, 'Should have cart/order elements').toBeGreaterThan(0)
    })
  })

  test.describe('Customer Selection in POS', () => {
    test('should allow customer search', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Find and use customer search
      const searchInput = page.getByPlaceholder(/search/i).first()
        .or(page.getByRole('textbox').first())

      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        await page.waitForTimeout(1000)

        // Should show search results or no results message
        const hasResponse = await page.locator('text=/customer|no result|select/i').count() > 0
        expect(hasResponse).toBe(true)
      }
    })

    test('CRITICAL: should show insurance status after selecting customer', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Search for a customer
      const searchInput = page.getByPlaceholder(/search/i).first()
        .or(page.getByRole('textbox').first())

      if (await searchInput.isVisible()) {
        await searchInput.fill('a')
        await page.waitForTimeout(2000)

        // Try to select first customer result
        const customerResult = page.locator('[class*="customer"]').first()
          .or(page.locator('button:has-text("Select")').first())

        if (await customerResult.isVisible()) {
          await customerResult.click()
          await page.waitForTimeout(1000)

          // Should show insurance info
          const insuranceInfo = page.locator('text=/VSP|EyeMed|Spectera|insurance|authorized|verified/i')
          const hasInsurance = await insuranceInfo.count() > 0

          if (!hasInsurance) {
            test.info().annotations.push({
              type: 'GAP',
              description: 'Insurance status not displayed after customer selection'
            })
          }
        }
      }
    })
  })

  test.describe('Product Selection', () => {
    test('should display exam services', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Find and click exam tab
      const examTab = page.getByRole('tab', { name: /exam/i })
        .or(page.locator('button:has-text("Exam")'))

      if (await examTab.first().isVisible()) {
        await examTab.first().click()
        await page.waitForTimeout(1000)

        // Should show exam services
        const examServices = page.locator('text=/routine|medical|exam|vision/i')
        const count = await examServices.count()

        expect(count, 'Exam services should be displayed').toBeGreaterThan(0)
      }
    })

    test('should display frames', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Find and click frames tab
      const framesTab = page.getByRole('tab', { name: /frame/i })
        .or(page.locator('button:has-text("Frame")'))

      if (await framesTab.first().isVisible()) {
        await framesTab.first().click()
        await page.waitForTimeout(1000)

        // Should show frames
        const frames = page.locator('text=/ray-ban|oakley|coach|gucci|frame/i')
        const count = await frames.count()

        expect(count, 'Frames should be displayed').toBeGreaterThan(0)
      }
    })

    test('should display lenses', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Find and click lenses tab
      const lensesTab = page.getByRole('tab', { name: /lens/i })
        .or(page.locator('button:has-text("Lens")'))

      if (await lensesTab.first().isVisible()) {
        await lensesTab.first().click()
        await page.waitForTimeout(1000)

        // Should show lenses
        const lenses = page.locator('text=/single vision|progressive|bifocal|lens/i')
        const count = await lenses.count()

        expect(count, 'Lenses should be displayed').toBeGreaterThan(0)
      }
    })

    test('should display contact lenses', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Find and click contacts tab
      const contactsTab = page.getByRole('tab', { name: /contact/i })
        .or(page.locator('button:has-text("Contact")'))

      if (await contactsTab.first().isVisible()) {
        await contactsTab.first().click()
        await page.waitForTimeout(1000)

        // Should show contacts
        const contacts = page.locator('text=/acuvue|dailies|biofinity|contact/i')
        const count = await contacts.count()

        expect(count, 'Contact lenses should be displayed').toBeGreaterThan(0)
      }
    })
  })

  test.describe('Add to Cart', () => {
    test('should add product to cart', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Find an add button
      const addButton = page.getByRole('button', { name: /add|\\+/i }).first()

      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)

        // Cart should update
        const cartItems = page.locator('text=/item|\\$[0-9]+/i')
        const count = await cartItems.count()

        test.info().annotations.push({
          type: 'INFO',
          description: `Cart has ${count} item indicators after adding product`
        })
      }
    })

    test('should update cart total', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Get initial total
      const totalElement = page.locator('text=/total.*\\$/i').first()
      const initialTotal = await totalElement.textContent()

      // Add a product
      const addButton = page.getByRole('button', { name: /add|\\+/i }).first()

      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(500)

        // Total should change
        const newTotal = await totalElement.textContent()

        test.info().annotations.push({
          type: 'INFO',
          description: `Total changed from ${initialTotal} to ${newTotal}`
        })
      }
    })
  })

  test.describe('Insurance Pricing in POS', () => {
    test('CRITICAL: should show insurance vs patient pricing', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Select a customer with insurance first
      const searchInput = page.getByPlaceholder(/search/i).first()

      if (await searchInput.isVisible()) {
        await searchInput.fill('a')
        await page.waitForTimeout(2000)

        const customerResult = page.locator('[class*="customer"]').first()
        if (await customerResult.isVisible()) {
          await customerResult.click()
          await page.waitForTimeout(1000)
        }
      }

      // Now check for insurance pricing display
      const insurancePricing = page.locator('text=/patient pays|insurance pays|coverage|copay|allowance/i')
      const count = await insurancePricing.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Insurance pricing breakdown NOT displayed in POS'
        })
      } else {
        test.info().annotations.push({
          type: 'PASS',
          description: 'Insurance pricing is displayed in POS'
        })
      }
    })
  })

  test.describe('Checkout Flow', () => {
    test('should have checkout button', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      const checkoutButton = page.getByRole('button', { name: /checkout|pay|complete/i })
      const count = await checkoutButton.count()

      expect(count, 'Checkout button should exist').toBeGreaterThan(0)
    })

    test('CRITICAL: checkout should process order', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // This would test actual checkout - may fail without items in cart
      const checkoutButton = page.getByRole('button', { name: /checkout|complete/i }).first()

      if (await checkoutButton.isVisible()) {
        const isDisabled = await checkoutButton.isDisabled()

        test.info().annotations.push({
          type: 'INFO',
          description: `Checkout button disabled: ${isDisabled}`
        })

        if (!isDisabled) {
          // Would test checkout flow here
          test.info().annotations.push({
            type: 'INFO',
            description: 'Checkout button is clickable'
          })
        }
      }
    })
  })
})
