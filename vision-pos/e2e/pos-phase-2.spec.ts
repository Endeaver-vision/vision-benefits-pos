import { test, expect } from '@playwright/test'

/**
 * Phase 2 POS Core Menus Tests
 *
 * Validates:
 * - Navigation buttons exist and are clickable
 * - Patient search works when no patient selected
 * - Order summary integration
 * - Visual states (active nav, disabled buttons)
 *
 * Note: Menu content tests require a patient to be selected.
 * Without a patient, the ProductArea shows CustomerSearch instead of menus.
 */

test.describe('POS Phase 2 - Core Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('all menu navigation buttons are present', async ({ page }) => {
    // All nav buttons should be visible
    await expect(page.locator('button[title="Exam Services"]')).toBeVisible()
    await expect(page.locator('button[title="Lens Type"]')).toBeVisible()
    await expect(page.locator('button[title="Material"]')).toBeVisible()
    await expect(page.locator('button[title="Coatings"]')).toBeVisible()
    await expect(page.locator('button[title="Add-Ons"]')).toBeVisible()
    await expect(page.locator('button[title="Frames"]')).toBeVisible()
    await expect(page.locator('button[title="Contacts"]')).toBeVisible()
  })

  test('clicking nav buttons changes active state', async ({ page }) => {
    // Click each nav button and verify it becomes active
    const navButtons = [
      'Exam Services',
      'Lens Type',
      'Material',
      'Coatings',
      'Add-Ons',
      'Frames',
      'Contacts',
    ]

    for (const buttonTitle of navButtons) {
      const button = page.locator(`button[title="${buttonTitle}"]`)
      await button.click()
      await expect(button).toHaveClass(/bg-blue-600/)
    }
  })

  test('only one nav button is active at a time', async ({ page }) => {
    // Click Lens Type
    const lensButton = page.locator('button[title="Lens Type"]')
    await lensButton.click()
    await expect(lensButton).toHaveClass(/bg-blue-600/)

    // Click Material - Lens Type should no longer be active
    const materialButton = page.locator('button[title="Material"]')
    await materialButton.click()
    await expect(materialButton).toHaveClass(/bg-blue-600/)
    await expect(lensButton).not.toHaveClass(/bg-blue-600/)
  })
})

test.describe('POS Phase 2 - Patient Search (No Patient)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('shows patient search when no patient selected', async ({ page }) => {
    await expect(page.locator('h2:has-text("Select a Patient")')).toBeVisible()
    await expect(page.locator('input[placeholder="Search patients..."]')).toBeVisible()
  })

  test('patient search accepts input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search patients..."]')
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })

  test('patient search shows instruction text', async ({ page }) => {
    await expect(page.locator('text=Search by name, phone, or email to begin')).toBeVisible()
  })

  test('patient banner shows search prompt', async ({ page }) => {
    await expect(page.locator('text=Select a patient to begin')).toBeVisible()
  })
})

test.describe('POS Phase 2 - Order Summary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('order summary header is visible', async ({ page }) => {
    await expect(page.locator('text=Order Summary')).toBeVisible()
  })

  test('order summary shows empty state', async ({ page }) => {
    await expect(page.locator('text=No items yet')).toBeVisible()
    await expect(page.locator('text=Select products from the menu')).toBeVisible()
  })

  test('order summary shows item count badge', async ({ page }) => {
    await expect(page.locator('text=0 items')).toBeVisible()
  })
})

test.describe('POS Phase 2 - Action Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('checkout button is visible and disabled when no items', async ({ page }) => {
    const checkoutButton = page.locator('button[title="Checkout"]')
    await expect(checkoutButton).toBeVisible()
    await expect(checkoutButton).toBeDisabled()
  })

  test('hold button is disabled when no items', async ({ page }) => {
    const holdButton = page.locator('button[title="Hold Quote"]')
    await expect(holdButton).toBeVisible()
    await expect(holdButton).toBeDisabled()
  })

  test('new quote button is always enabled', async ({ page }) => {
    const newQuoteButton = page.locator('button[title="New Quote"]')
    await expect(newQuoteButton).toBeVisible()
    await expect(newQuoteButton).toBeEnabled()
  })

  test('add pair button is disabled when no patient', async ({ page }) => {
    const addPairButton = page.locator('button[title="Add Pair"]')
    await expect(addPairButton).toBeVisible()
    await expect(addPairButton).toBeDisabled()
  })

  test('discount button is disabled when no items', async ({ page }) => {
    const discountButton = page.locator('button[title="Add Discount"]')
    await expect(discountButton).toBeVisible()
    await expect(discountButton).toBeDisabled()
  })

  test('notes button is disabled when no patient', async ({ page }) => {
    const notesButton = page.locator('button[title="Add Notes"]')
    await expect(notesButton).toBeVisible()
    await expect(notesButton).toBeDisabled()
  })

  test('print button is disabled when no items', async ({ page }) => {
    const printButton = page.locator('button[title="Print Quote"]')
    await expect(printButton).toBeVisible()
    await expect(printButton).toBeDisabled()
  })

  test('email button is disabled when no items', async ({ page }) => {
    const emailButton = page.locator('button[title="Email Quote"]')
    await expect(emailButton).toBeVisible()
    await expect(emailButton).toBeDisabled()
  })
})

test.describe('POS Phase 2 - Layout Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos')
    await page.waitForLoadState('networkidle')
  })

  test('4-column layout is rendered', async ({ page }) => {
    // Check main layout container exists
    const mainContainer = page.locator('.h-screen')
    await expect(mainContainer).toBeVisible()

    // Check navigation column (left)
    await expect(page.locator('button[title="Exam Services"]')).toBeVisible()

    // Check order summary column (right)
    await expect(page.locator('text=Order Summary')).toBeVisible()

    // Check checkout button in actions column
    await expect(page.locator('button[title="Checkout"]')).toBeVisible()
  })

  test('navigation column has all menu items', async ({ page }) => {
    const menuItems = [
      { title: 'Exam Services', label: 'Exam' },
      { title: 'Lens Type', label: 'Lens' },
      { title: 'Material', label: 'Mat.' },
      { title: 'Coatings', label: 'Coat' },
      { title: 'Add-Ons', label: 'Add' },
      { title: 'Frames', label: 'Frame' },
      { title: 'Contacts', label: 'CL' },
    ]

    for (const item of menuItems) {
      const button = page.locator(`button[title="${item.title}"]`)
      await expect(button).toBeVisible()
    }
  })

  test('layout fills viewport height', async ({ page }) => {
    const mainContainer = page.locator('.h-screen')
    const boundingBox = await mainContainer.boundingBox()
    const viewportSize = page.viewportSize()

    if (viewportSize && boundingBox) {
      // Should fill most of the viewport
      expect(boundingBox.height).toBeGreaterThanOrEqual(viewportSize.height - 10)
    }
  })
})
