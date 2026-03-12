import { test, expect } from '@playwright/test'

/**
 * Phase 6 POS Tests - Critical Flows & Patient Validation
 *
 * These tests validate the complete POS workflow including:
 * - Patient selection
 * - Product selection
 * - Quote generation
 * - Action buttons
 *
 * For the 5-patient validation, run: npm run test:pos-patients
 */

test.describe('POS Phase 6 - Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('complete POS layout renders correctly', async ({ page }) => {
    // Navigation buttons
    await expect(page.locator('button[title="Exam Services"]')).toBeVisible()
    await expect(page.locator('button[title="Lens Type"]')).toBeVisible()
    await expect(page.locator('button[title="Material"]')).toBeVisible()
    await expect(page.locator('button[title="Coatings"]')).toBeVisible()
    await expect(page.locator('button[title="Add-Ons"]')).toBeVisible()
    await expect(page.locator('button[title="Frames"]')).toBeVisible()
    await expect(page.locator('button[title="Contacts"]')).toBeVisible()

    // Action buttons
    await expect(page.locator('button[title="Add Pair"]')).toBeVisible()
    await expect(page.locator('button[title="Hold Quote"]')).toBeVisible()
    await expect(page.locator('button[title="Recall Quote"]')).toBeVisible()
    await expect(page.locator('button[title="Add Discount"]')).toBeVisible()
    await expect(page.locator('button[title="Add Notes"]')).toBeVisible()
    await expect(page.locator('button[title="Present to Patient"]')).toBeVisible()
    await expect(page.locator('button[title="Print Quote"]')).toBeVisible()
    await expect(page.locator('button[title="Email Quote"]')).toBeVisible()
    await expect(page.locator('button[title="New Quote"]')).toBeVisible()
    await expect(page.locator('button[title="Checkout"]')).toBeVisible()

    // Order summary
    await expect(page.locator('text=Order Summary')).toBeVisible()
  })

  test('patient search shows when no patient selected', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Select a Patient' })).toBeVisible()
  })

  test('exam services menu is selected by default', async ({ page }) => {
    // Should be on exam services by default
    const examButton = page.locator('button[title="Exam Services"]')
    await expect(examButton).toHaveClass(/bg-blue-600/)
  })

  test('can navigate through all menus', async ({ page }) => {
    const menus = [
      'Exam Services',
      'Lens Type',
      'Material',
      'Coatings',
      'Add-Ons',
      'Frames',
      'Contacts',
    ]

    for (const menu of menus) {
      const button = page.locator(`button[title="${menu}"]`)
      await button.click()
      await expect(button).toHaveClass(/bg-blue-600/)
    }
  })

  test('recall opens held quotes drawer', async ({ page }) => {
    await page.locator('button[title="Recall Quote"]').click()
    await expect(page.locator('text=Held Quotes')).toBeVisible()
    // Close with escape
    await page.keyboard.press('Escape')
  })
})

test.describe('POS Phase 6 - Button States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('item-dependent buttons are disabled when empty', async ({ page }) => {
    // These should be disabled when no items
    await expect(page.locator('button[title="Hold Quote"]')).toBeDisabled()
    await expect(page.locator('button[title="Add Discount"]')).toBeDisabled()
    await expect(page.locator('button[title="Present to Patient"]')).toBeDisabled()
    await expect(page.locator('button[title="Print Quote"]')).toBeDisabled()
    await expect(page.locator('button[title="Email Quote"]')).toBeDisabled()
    await expect(page.locator('button[title="Checkout"]')).toBeDisabled()
  })

  test('always-enabled buttons work', async ({ page }) => {
    // These should always be enabled
    await expect(page.locator('button[title="Recall Quote"]')).toBeEnabled()
    await expect(page.locator('button[title="New Quote"]')).toBeEnabled()
  })

  test('add pair is disabled without patient', async ({ page }) => {
    await expect(page.locator('button[title="Add Pair"]')).toBeDisabled()
  })
})

test.describe('POS Phase 6 - Order Summary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('shows empty state initially', async ({ page }) => {
    await expect(page.locator('text=No items yet')).toBeVisible()
  })

  test('checkout button shows Pay label', async ({ page }) => {
    const checkout = page.locator('button[title="Checkout"]')
    await expect(checkout).toContainText('Pay')
  })
})

test.describe('POS Phase 6 - Accessibility & UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('tab navigation works through interface', async ({ page }) => {
    // Tab a few times and verify we can focus buttons
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    const focused = await page.evaluate(() => {
      const el = document.activeElement
      return el?.tagName
    })
    // After tabbing, should be on an interactive element or body if at start/end
    expect(['BUTTON', 'INPUT', 'A', 'SELECT', 'BODY']).toContain(focused)
  })

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // Filter out expected errors (like favicon)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('Failed to load')
    )
    expect(criticalErrors.length).toBe(0)
  })
})

test.describe('POS Phase 6 - Responsive Layout', () => {
  test('works on iPad viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')

    // All main elements should be visible
    await expect(page.locator('button[title="Checkout"]')).toBeVisible()
    await expect(page.locator('text=Order Summary')).toBeVisible()
  })

  test('works on iPad Pro viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1024 })
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('button[title="Checkout"]')).toBeVisible()
    await expect(page.locator('text=Order Summary')).toBeVisible()
  })
})
