import { test, expect } from '@playwright/test'
import path from 'path'

test('View VSP Pricer format', async ({ page }) => {
  // Go to customers, find someone, then go to VSP pricer
  await page.goto('/customers')
  await page.waitForLoadState('networkidle')

  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
  await expect(searchInput).toBeVisible({ timeout: 10000 })
  await searchInput.fill('Bonnie Gregory')
  await page.waitForTimeout(1500)

  await page.locator('text=Bonnie').first().click()
  await page.waitForURL(/\/customers\//, { timeout: 10000 })
  await page.waitForLoadState('networkidle')

  // Click VSP Pricer button
  const vspButton = page.locator('a:has-text("VSP"), button:has-text("VSP")').first()
  await expect(vspButton).toBeVisible({ timeout: 10000 })
  await vspButton.click()

  await page.waitForURL(/\/vsp-pricer/, { timeout: 10000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Upload a VSP PDF to see the price list format
  const fileInput = page.locator('input[type="file"]')
  const pdfPath = path.resolve('/Users/cmac/let/vision-pos/Reference-Docs/VSP Only/CH_Auth.pdf')
  await fileInput.setInputFiles(pdfPath)
  
  // Wait for price list to generate
  await expect(page.locator('text=Patient Price List').first()).toBeVisible({ timeout: 90000 })
  await page.waitForTimeout(3000)

  // Take screenshot of the VSP pricer price list
  await page.screenshot({ path: 'e2e/screenshots/vsp-pricer-format.png', fullPage: true })
  
  console.log('VSP Pricer screenshot saved')
})
