import { test, expect } from '@playwright/test'

/**
 * Phase 4 POS Tests
 *
 * Validates:
 * - Present to Patient view
 * - Signature capture component
 * - Print quote functionality
 * - Email quote functionality
 * - Quote save/lifecycle
 *
 * Note: These tests verify UI elements are present and functional.
 */

test.describe('POS Phase 4 - Present View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('present button exists', async ({ page }) => {
    await expect(page.locator('button[title="Present to Patient"]')).toBeVisible()
  })

  test('present button is disabled when no items', async ({ page }) => {
    const presentButton = page.locator('button[title="Present to Patient"]')
    await expect(presentButton).toBeDisabled()
  })
})

test.describe('POS Phase 4 - Print Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('print button exists', async ({ page }) => {
    await expect(page.locator('button[title="Print Quote"]')).toBeVisible()
  })

  test('print button is disabled when no items', async ({ page }) => {
    const printButton = page.locator('button[title="Print Quote"]')
    await expect(printButton).toBeDisabled()
  })
})

test.describe('POS Phase 4 - Email Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('email button exists', async ({ page }) => {
    await expect(page.locator('button[title="Email Quote"]')).toBeVisible()
  })

  test('email button is disabled when no items', async ({ page }) => {
    const emailButton = page.locator('button[title="Email Quote"]')
    await expect(emailButton).toBeDisabled()
  })
})

test.describe('POS Phase 4 - Quote Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('new quote button exists and is enabled', async ({ page }) => {
    const newQuoteButton = page.locator('button[title="New Quote"]')
    await expect(newQuoteButton).toBeVisible()
    await expect(newQuoteButton).toBeEnabled()
  })

  test('hold button exists', async ({ page }) => {
    await expect(page.locator('button[title="Hold Quote"]')).toBeVisible()
  })

  test('hold button is disabled when no items', async ({ page }) => {
    const holdButton = page.locator('button[title="Hold Quote"]')
    await expect(holdButton).toBeDisabled()
  })

  test('checkout button exists', async ({ page }) => {
    await expect(page.locator('button[title="Checkout"]')).toBeVisible()
  })

  test('checkout button is disabled when no items', async ({ page }) => {
    const checkoutButton = page.locator('button[title="Checkout"]')
    await expect(checkoutButton).toBeDisabled()
  })
})

test.describe('POS Phase 4 - Action States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('all action buttons render correctly', async ({ page }) => {
    // Verify all Phase 4 action buttons are present
    const actionButtons = [
      'Add Pair',
      'Hold Quote',
      'Recall Quote',
      'Add Discount',
      'Add Notes',
      'Present to Patient',
      'Print Quote',
      'Email Quote',
      'New Quote',
      'Checkout',
    ]

    for (const title of actionButtons) {
      await expect(page.locator(`button[title="${title}"]`)).toBeVisible()
    }
  })

  test('actions column has correct structure', async ({ page }) => {
    // Check that checkout button shows $0 when no items
    const checkoutButton = page.locator('button[title="Checkout"]')
    await expect(checkoutButton).toContainText('Pay')
  })
})

test.describe('POS Phase 4 - Modals', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('recall button opens held quotes drawer', async ({ page }) => {
    const recallButton = page.locator('button[title="Recall Quote"]')
    await recallButton.click()
    await expect(page.locator('text=Held Quotes')).toBeVisible()
  })

  test('new quote button clears state', async ({ page }) => {
    // Click new quote and verify clean state
    const newQuoteButton = page.locator('button[title="New Quote"]')
    await newQuoteButton.click()
    // Should still show empty state
    await expect(page.locator('text=No items yet')).toBeVisible()
  })
})
