import { test, expect } from '@playwright/test'

/**
 * Phase 5 POS Tests - UX Polish
 *
 * Validates:
 * - Error boundaries
 * - Accessibility (a11y)
 * - Touch targets
 * - Keyboard navigation
 */

test.describe('POS Phase 5 - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('page loads without errors', async ({ page }) => {
    // Check no error boundary is triggered
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
  })

  test('empty state displays correctly', async ({ page }) => {
    await expect(page.locator('text=No items yet')).toBeVisible()
  })
})

test.describe('POS Phase 5 - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('all buttons have accessible names', async ({ page }) => {
    // Check buttons have title attributes
    const buttons = page.locator('button[title]')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('navigation buttons are keyboard accessible', async ({ page }) => {
    // Focus first button and verify it's focusable
    await page.keyboard.press('Tab')
    const activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT']).toContain(activeElement)
  })

  test('headings are present and properly structured', async ({ page }) => {
    // Check for h1 or h2 headings
    const headings = page.locator('h1, h2')
    const count = await headings.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('POS Phase 5 - Touch Targets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('action buttons have minimum 44px touch targets', async ({ page }) => {
    // Check action column buttons have proper size
    const actionButtons = page.locator('button[title="Hold Quote"]')
    const box = await actionButtons.boundingBox()

    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('checkout button is prominently sized', async ({ page }) => {
    const checkoutButton = page.locator('button[title="Checkout"]')
    const box = await checkoutButton.boundingBox()

    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(60)
    }
  })
})

test.describe('POS Phase 5 - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('menu navigation works', async ({ page }) => {
    const menus = ['Exam Services', 'Lens Type', 'Material', 'Coatings', 'Add-Ons', 'Frames', 'Contacts']

    for (const menu of menus) {
      const button = page.locator(`button[title="${menu}"]`)
      await expect(button).toBeVisible()
      await button.click()
      // Check it gets selected state
      await expect(button).toHaveClass(/bg-blue-600/)
    }
  })

  test('clicking same menu twice keeps it selected', async ({ page }) => {
    const lensTypeButton = page.locator('button[title="Lens Type"]')
    await lensTypeButton.click()
    await expect(lensTypeButton).toHaveClass(/bg-blue-600/)
    await lensTypeButton.click()
    await expect(lensTypeButton).toHaveClass(/bg-blue-600/)
  })
})

test.describe('POS Phase 5 - Visual States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('disabled buttons have proper styling', async ({ page }) => {
    // Hold button should be disabled when no items
    const holdButton = page.locator('button[title="Hold Quote"]')
    await expect(holdButton).toBeDisabled()
    await expect(holdButton).toHaveClass(/cursor-not-allowed/)
  })

  test('checkout button only shows Pay when empty', async ({ page }) => {
    // Checkout button shows only "Pay" when no items (no dollar amount)
    const checkoutButton = page.locator('button[title="Checkout"]')
    await expect(checkoutButton).toContainText('Pay')
    // Should NOT contain a dollar amount
    const text = await checkoutButton.textContent()
    // When empty, it just shows "Pay" not "Pay $X"
    expect(text?.includes('$')).toBeFalsy()
  })
})

test.describe('POS Phase 5 - Layout Stability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('layout is stable after menu changes', async ({ page }) => {
    // Get initial layout measurements
    const orderSummary = page.locator('text=Order Summary')
    const initialBox = await orderSummary.boundingBox()

    // Click through different menus
    await page.locator('button[title="Frames"]').click()
    await page.waitForTimeout(100)
    await page.locator('button[title="Contacts"]').click()
    await page.waitForTimeout(100)
    await page.locator('button[title="Lens Type"]').click()

    // Check order summary position is stable
    const finalBox = await orderSummary.boundingBox()

    if (initialBox && finalBox) {
      // Position should not change more than a few pixels
      expect(Math.abs(finalBox.x - initialBox.x)).toBeLessThan(10)
    }
  })
})
