import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * Validate 5 patients have working price list functionality
 * Tests both saved price list display and full EyeMed pricer flow
 */

test.describe('Five Patient Validation', () => {
  // Patient 1: Andrew Hess - Has saved EyeMed price list
  test('Patient 1: Andrew Hess sees saved EyeMed prices', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('Andrew Hess')
    await page.waitForTimeout(1500)

    await page.locator('text=Andrew').first().click()
    await page.waitForURL(/\/customers\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click Price Plan tab if visible
    const pricePlanTab = page.getByRole('tab', { name: /Price/i })
    if (await pricePlanTab.isVisible()) {
      await pricePlanTab.click()
      await page.waitForTimeout(500)
    }

    // Click EyeMed tab
    const eyemedTab = page.getByRole('tab', { name: 'EyeMed' })
    await expect(eyemedTab).toBeVisible({ timeout: 5000 })
    await eyemedTab.click()
    await page.waitForTimeout(500)

    // Verify saved price list is displayed
    await expect(page.locator('text=Saved Price List')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=LENS TYPE').first()).toBeVisible({ timeout: 5000 })

    console.log('✅ Patient 1: Andrew Hess - VALIDATED')
  })

  // Patient 2: Emilia A'bell - Has saved EyeMed price list
  test('Patient 2: Emilia Abell sees saved EyeMed prices', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('Emilia')
    await page.waitForTimeout(1500)

    await page.locator('text=Emilia').first().click()
    await page.waitForURL(/\/customers\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click Price Plan tab if visible
    const pricePlanTab = page.getByRole('tab', { name: /Price/i })
    if (await pricePlanTab.isVisible()) {
      await pricePlanTab.click()
      await page.waitForTimeout(500)
    }

    // Click EyeMed tab
    const eyemedTab = page.getByRole('tab', { name: 'EyeMed' })
    await expect(eyemedTab).toBeVisible({ timeout: 5000 })
    await eyemedTab.click()
    await page.waitForTimeout(500)

    // Verify saved price list is displayed
    await expect(page.locator('text=Saved Price List')).toBeVisible({ timeout: 10000 })

    console.log('✅ Patient 2: Emilia Abell - VALIDATED')
  })

  // Patient 3: Edwino Burgos - Has saved EyeMed price list
  test('Patient 3: Edwino Burgos sees saved EyeMed prices', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('Edwino')
    await page.waitForTimeout(1500)

    await page.locator('text=Edwino').first().click()
    await page.waitForURL(/\/customers\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click Price Plan tab if visible
    const pricePlanTab = page.getByRole('tab', { name: /Price/i })
    if (await pricePlanTab.isVisible()) {
      await pricePlanTab.click()
      await page.waitForTimeout(500)
    }

    // Click EyeMed tab
    const eyemedTab = page.getByRole('tab', { name: 'EyeMed' })
    await expect(eyemedTab).toBeVisible({ timeout: 5000 })
    await eyemedTab.click()
    await page.waitForTimeout(500)

    // Verify saved price list is displayed
    await expect(page.locator('text=Saved Price List')).toBeVisible({ timeout: 10000 })

    console.log('✅ Patient 3: Edwino Burgos - VALIDATED')
  })

  // Patient 4: Soto - Full flow test (scan, save, verify)
  test('Patient 4: Soto full EyeMed flow', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('Soto')
    await page.waitForTimeout(1000)

    await page.locator('text=Soto').first().click()
    await page.waitForURL(/\/customers\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click EyeMed Pricer button
    const eyemedButton = page.locator('a:has-text("EyeMed"), button:has-text("EyeMed Pricer")').first()
    await expect(eyemedButton).toBeVisible({ timeout: 10000 })
    await eyemedButton.click()

    await page.waitForURL(/\/eyemed-pricer\?customerId=/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Upload PDF
    const fileInput = page.locator('input[type="file"][data-testid="pdf-upload"]')
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const pdfPath = path.resolve('/Users/cmac/let/vision-pos/Reference-Docs/Insurance Auths/Eyemed/SS_eyemed.pdf')
    await fileInput.setInputFiles(pdfPath)

    // Wait for price list
    await expect(page.locator('text=Patient Price List')).toBeVisible({ timeout: 90000 })

    // Save to profile
    const saveButton = page.locator('button:has-text("Save to Profile")')
    await expect(saveButton).toBeVisible({ timeout: 5000 })
    await saveButton.click()

    // Wait for save confirmation
    await expect(page.locator('text=/Saved Successfully|Price List Saved/i')).toBeVisible({ timeout: 30000 })

    // Navigate back to profile
    const viewPriceListLink = page.locator('a:has-text("View Price List")')
    await expect(viewPriceListLink).toBeVisible({ timeout: 5000 })
    await viewPriceListLink.click()

    await page.waitForURL(/\/customers\/.*\?tab=price-plan/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify saved prices are visible
    await expect(page.locator('text=Saved Price List')).toBeVisible({ timeout: 10000 })

    console.log('✅ Patient 4: Soto - VALIDATED (full flow)')
  })

  // Patient 5: Another patient - Full flow
  test('Patient 5: Clayton full EyeMed flow', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('Clayton')
    await page.waitForTimeout(1000)

    await page.locator('text=Clayton').first().click()
    await page.waitForURL(/\/customers\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Click EyeMed Pricer button
    const eyemedButton = page.locator('a:has-text("EyeMed"), button:has-text("EyeMed Pricer")').first()
    await expect(eyemedButton).toBeVisible({ timeout: 10000 })
    await eyemedButton.click()

    await page.waitForURL(/\/eyemed-pricer\?customerId=/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Upload PDF
    const fileInput = page.locator('input[type="file"][data-testid="pdf-upload"]')
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    const pdfPath = path.resolve('/Users/cmac/let/vision-pos/Reference-Docs/Insurance Auths/Eyemed/SS_eyemed.pdf')
    await fileInput.setInputFiles(pdfPath)

    // Wait for price list
    await expect(page.locator('text=Patient Price List')).toBeVisible({ timeout: 90000 })

    // Save to profile
    const saveButton = page.locator('button:has-text("Save to Profile")')
    await expect(saveButton).toBeVisible({ timeout: 5000 })
    await saveButton.click()

    // Wait for save confirmation
    await expect(page.locator('text=/Saved Successfully|Price List Saved/i')).toBeVisible({ timeout: 30000 })

    // Navigate back to profile
    const viewPriceListLink = page.locator('a:has-text("View Price List")')
    await expect(viewPriceListLink).toBeVisible({ timeout: 5000 })
    await viewPriceListLink.click()

    await page.waitForURL(/\/customers\/.*\?tab=price-plan/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify saved prices are visible
    await expect(page.locator('text=Saved Price List')).toBeVisible({ timeout: 10000 })

    console.log('✅ Patient 5: Clayton - VALIDATED (full flow)')
  })
})
