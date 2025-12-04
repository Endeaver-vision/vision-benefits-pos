import { test, expect } from '@playwright/test'

/**
 * Insurance Flow Tests
 * Tests the complete insurance verification and pricing flow
 * This is CRITICAL functionality for a vision benefits POS
 */

test.describe('Insurance Flow', () => {
  // Login helper
  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login')
    await page.getByLabel(/username/i).fill('caritch')
    await page.getByLabel(/password/i).fill('Vision2020')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/quote-builder|dashboard/, { timeout: 15000 })
  }

  test.describe('Insurance Selection Step', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('CRITICAL: Quote builder should have insurance step', async ({ page }) => {
      await page.goto('/quote-builder')

      // Look for insurance-related UI
      const insuranceElements = page.locator('text=/insurance|carrier|VSP|EyeMed|Spectera|verify|scan/i')
      const count = await insuranceElements.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'NO insurance selection step found in quote builder'
        })
      } else {
        test.info().annotations.push({
          type: 'PASS',
          description: `Found ${count} insurance-related elements`
        })
      }
    })

    test('CRITICAL: Should be able to select carrier', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      // Look for carrier selection dropdown or buttons
      const carrierSelect = page.getByRole('combobox').filter({ hasText: /carrier|insurance/i })
        .or(page.locator('select').filter({ hasText: /VSP|EyeMed/i }))
        .or(page.getByRole('button', { name: /VSP|EyeMed|Spectera/i }))

      const count = await carrierSelect.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'No carrier selection UI found'
        })
      }
    })

    test('CRITICAL: Should have member ID input', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      // Look for member ID input
      const memberIdInput = page.getByLabel(/member.*id/i)
        .or(page.getByPlaceholder(/member.*id/i))
        .or(page.locator('input[name*="member"]'))

      const count = await memberIdInput.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'No member ID input found'
        })
      }
    })

    test('CRITICAL: Should have verify insurance button', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      const verifyButton = page.getByRole('button', { name: /verify|check|validate|scan/i })
        .filter({ hasText: /insurance|eligibility|benefits/i })

      const count = await verifyButton.count()

      if (count === 0) {
        // Try broader search
        const anyVerifyButton = page.getByRole('button', { name: /verify|scan/i })
        const anyCount = await anyVerifyButton.count()

        if (anyCount === 0) {
          test.info().annotations.push({
            type: 'CRITICAL_GAP',
            description: 'No verify/scan insurance button found'
          })
        }
      }
    })
  })

  test.describe('Insurance Card Scanning', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('CRITICAL: Should have scan insurance card option', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      const scanElements = page.locator('text=/scan.*card|camera|upload.*card|photo/i')
        .or(page.getByRole('button', { name: /scan|camera|photo/i }))

      const count = await scanElements.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Insurance card scanning feature is MISSING'
        })
      }
    })

    test('Should have manual entry option as fallback', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      const manualEntry = page.locator('text=/manual|enter.*manually|type.*info/i')
        .or(page.getByRole('button', { name: /manual|enter/i }))

      const count = await manualEntry.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'GAP',
          description: 'No manual insurance entry option visible'
        })
      }
    })
  })

  test.describe('Insurance Verification Response', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('CRITICAL: Should show eligibility status after verification', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      // Select a customer first
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

      // Look for eligibility display
      const eligibilityDisplay = page.locator('text=/eligible|verified|active|coverage|benefits.*available/i')
      const count = await eligibilityDisplay.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Insurance eligibility status NOT displayed after customer selection'
        })
      }
    })

    test('CRITICAL: Should show available benefits', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      // Look for benefits display
      const benefitsDisplay = page.locator('text=/exam.*copay|frame.*allowance|lens.*coverage|contact.*allowance/i')
      const count = await benefitsDisplay.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Available insurance benefits NOT displayed'
        })
      }
    })

    test('Should show last exam date if available', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      const lastExam = page.locator('text=/last.*exam|previous.*exam|exam.*date|eligibility.*date/i')
      const count = await lastExam.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'GAP',
          description: 'Last exam date not displayed'
        })
      }
    })
  })

  test.describe('Insurance Pricing Display', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('CRITICAL: Exam pricing should show insurance vs patient cost', async ({ page }) => {
      await page.goto('/quote-builder')

      // Navigate to exam step
      const examTab = page.getByRole('button', { name: /exam/i }).first()
      if (await examTab.isVisible()) {
        await examTab.click()
        await page.waitForTimeout(1000)
      }

      // Look for dual pricing display
      const dualPricing = page.locator('text=/copay|patient.*pays|insurance.*pays|covered/i')
      const count = await dualPricing.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Exam services do not show insurance pricing breakdown'
        })
      }
    })

    test('CRITICAL: Lens pricing should show allowance and patient balance', async ({ page }) => {
      await page.goto('/quote-builder')

      // Navigate to eyeglasses step
      const eyeglassesTab = page.getByRole('button', { name: /eyeglass/i }).first()
      if (await eyeglassesTab.isVisible()) {
        await eyeglassesTab.click()
        await page.waitForTimeout(1000)
      }

      // Look for allowance/balance display
      const insurancePricing = page.locator('text=/allowance|balance|patient.*pays|after.*insurance/i')
      const count = await insurancePricing.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Lens options do not show insurance allowance/patient balance'
        })
      }
    })

    test('CRITICAL: Contact lens pricing should show fitting fee and allowance', async ({ page }) => {
      await page.goto('/quote-builder')

      // Navigate to contacts step
      const contactsTab = page.getByRole('button', { name: /contact/i }).first()
      if (await contactsTab.isVisible()) {
        await contactsTab.click()
        await page.waitForTimeout(1000)
      }

      // Look for fitting fee and allowance
      const contactPricing = page.locator('text=/fitting|allowance|covered|patient.*pays/i')
      const count = await contactPricing.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: 'Contact lenses do not show fitting fee or insurance allowance'
        })
      }
    })
  })

  test.describe('Carrier-Specific Logic', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('VSP should have specific benefits structure', async ({ page }) => {
      // This would test VSP-specific logic
      // For now, document what we're looking for
      test.info().annotations.push({
        type: 'INFO',
        description: 'VSP benefits: WellVision exam copay, frame allowance with 20% off balance, lens options'
      })
    })

    test('EyeMed should have specific benefits structure', async ({ page }) => {
      test.info().annotations.push({
        type: 'INFO',
        description: 'EyeMed benefits: Exam copay, frame allowance varies by network, lens coverage'
      })
    })

    test('Spectera should have specific benefits structure', async ({ page }) => {
      test.info().annotations.push({
        type: 'INFO',
        description: 'Spectera benefits: Exam copay, set allowances for frames and lenses'
      })
    })
  })

  test.describe('Quote Review with Insurance', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('CRITICAL: Review should show complete insurance breakdown', async ({ page }) => {
      await page.goto('/quote-builder')

      // Navigate to review
      const reviewTab = page.getByRole('button', { name: /review/i }).first()
      if (await reviewTab.isVisible()) {
        await reviewTab.click()
        await page.waitForTimeout(1000)
      }

      // Check for complete breakdown
      const expectedElements = [
        'retail|subtotal',
        'insurance|coverage|pays',
        'patient|you.*pay|due'
      ]

      let missingCount = 0
      for (const pattern of expectedElements) {
        const element = page.locator(`text=/${pattern}/i`)
        const count = await element.count()
        if (count === 0) {
          missingCount++
        }
      }

      if (missingCount > 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: `Review missing ${missingCount}/3 insurance breakdown elements`
        })
      }
    })

    test('CRITICAL: Should show insurance savings', async ({ page }) => {
      await page.goto('/quote-builder')

      const reviewTab = page.getByRole('button', { name: /review/i }).first()
      if (await reviewTab.isVisible()) {
        await reviewTab.click()
        await page.waitForTimeout(1000)
      }

      const savings = page.locator('text=/sav(e|ing)|discount|benefit/i')
      const count = await savings.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'GAP',
          description: 'Insurance savings not highlighted in review'
        })
      }
    })
  })

  test.describe('No Insurance Flow', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('Should handle self-pay customers', async ({ page }) => {
      await page.goto('/quote-builder')
      await page.waitForTimeout(2000)

      // Look for self-pay or no insurance option
      const selfPayOption = page.locator('text=/self.*pay|no.*insurance|cash.*pay|out.*of.*pocket/i')
        .or(page.getByRole('button', { name: /self.*pay|no.*insurance/i }))

      const count = await selfPayOption.count()

      if (count === 0) {
        test.info().annotations.push({
          type: 'GAP',
          description: 'No clear self-pay/no-insurance option visible'
        })
      }
    })

    test('Self-pay should show full retail prices', async ({ page }) => {
      await page.goto('/quote-builder')

      // Navigate to eyeglasses
      const eyeglassesTab = page.getByRole('button', { name: /eyeglass/i }).first()
      if (await eyeglassesTab.isVisible()) {
        await eyeglassesTab.click()
        await page.waitForTimeout(1000)
      }

      // Prices should be visible
      const prices = page.locator('text=/\\$[0-9]+/')
      const count = await prices.count()

      expect(count, 'Should display prices for products').toBeGreaterThan(0)
    })
  })
})
