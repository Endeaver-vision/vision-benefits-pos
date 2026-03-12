import { test, expect } from '@playwright/test'

test.describe('EyeMed Pricer - Phase 1', () => {
  test('page loads with upload button', async ({ page }) => {
    await page.goto('/eyemed-pricer')

    // Check page title
    await expect(page.locator('text=EyeMed Pricer')).toBeVisible()

    // Check upload UI exists
    await expect(page.locator('text=Upload EyeMed Authorization')).toBeVisible()
    await expect(page.locator('text=Choose PDF File')).toBeVisible()

    // Take screenshot for verification
    await page.screenshot({ path: 'e2e/screenshots/eyemed-pricer-upload.png' })
  })

  test('dashboard has link to EyeMed Pricer', async ({ page }) => {
    await page.goto('/dashboard')

    // Check link exists
    await expect(page.locator('text=EyeMed Pricer')).toBeVisible()

    // Click and verify navigation
    await page.click('text=EyeMed Pricer')
    await expect(page).toHaveURL(/eyemed-pricer/)
  })
})
