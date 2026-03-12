import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * EyeMed Pricer - Full Flow Test
 * Correct flow:
 * 1. Go to Dashboard
 * 2. Find customer via customer lookup
 * 3. Go to customer profile
 * 4. Click EyeMed Pricer button (passes customerId)
 * 5. Patient auto-selected, upload PDF
 * 6. Save to profile
 * 7. Navigate back to customer profile price list
 * 8. Verify prices are visible
 */

test.describe('EyeMed Pricer - Save to Profile Flow', () => {
  test('should scan document from customer profile, save, and verify prices', async ({ page }) => {
    // Step 1: Go to customers page
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    // Step 2: Search for a customer
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('Soto')
    await page.waitForTimeout(1000) // Allow search

    // Click on customer in results
    const customerRow = page.locator('text=Soto').first()
    await expect(customerRow).toBeVisible({ timeout: 5000 })
    await customerRow.click()

    // Step 3: Now on customer profile - wait for page load
    await page.waitForURL(/\/customers\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Take screenshot of customer profile
    await page.screenshot({
      path: 'e2e/screenshots/eyemed-step1-customer-profile.png',
      fullPage: true
    })

    // Step 4: Click EyeMed Pricer button
    const eyemedButton = page.locator('a:has-text("EyeMed"), button:has-text("EyeMed Pricer")').first()
    await expect(eyemedButton).toBeVisible({ timeout: 10000 })
    await eyemedButton.click()

    // Should navigate to /eyemed-pricer?customerId=xxx
    await page.waitForURL(/\/eyemed-pricer\?customerId=/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Step 5: Patient should be auto-selected - verify selected state shows
    // Wait for either the selected patient display or the upload area
    await page.waitForTimeout(2000) // Allow patient auto-selection

    // Take screenshot showing patient auto-selected
    await page.screenshot({
      path: 'e2e/screenshots/eyemed-step2-patient-selected.png',
      fullPage: true
    })

    // The upload input should be visible (patient selected means upload is ready)
    const fileInput = page.locator('input[type="file"][data-testid="pdf-upload"]')
    await expect(fileInput).toBeAttached({ timeout: 10000 })

    // Step 6: Upload EyeMed PDF
    const pdfPath = path.resolve('/Users/cmac/let/vision-pos/Reference-Docs/Insurance Auths/Eyemed/SS_eyemed.pdf')
    await fileInput.setInputFiles(pdfPath)

    // Wait for extraction - look for price list table
    await expect(page.locator('text=Patient Price List')).toBeVisible({ timeout: 90000 })

    // Take screenshot of generated price list
    await page.screenshot({
      path: 'e2e/screenshots/eyemed-step3-price-list.png',
      fullPage: true
    })

    // Verify price list content
    await expect(page.locator('th:has-text("Retail")')).toBeVisible()
    await expect(page.locator('th:has-text("Patient Cost")')).toBeVisible()
    await expect(page.locator('text=EXAM SERVICES')).toBeVisible()

    // Step 7: Save to profile
    const saveButton = page.locator('button:has-text("Save to Profile")')
    await expect(saveButton).toBeVisible({ timeout: 5000 })
    await saveButton.click()

    // Wait for save confirmation - look for success message
    await expect(page.locator('text=/Saved Successfully|Price List Saved/i')).toBeVisible({ timeout: 30000 })

    // Take screenshot of save confirmation
    await page.screenshot({
      path: 'e2e/screenshots/eyemed-step4-save-confirmation.png',
      fullPage: true
    })

    // Step 8: Click View Price List to navigate back to profile
    const viewPriceListLink = page.locator('a:has-text("View Price List")')
    await expect(viewPriceListLink).toBeVisible({ timeout: 5000 })
    await viewPriceListLink.click()

    // Should be on customer profile with price-plan tab
    await page.waitForURL(/\/customers\/.*\?tab=price-plan/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Step 9: Verify prices are visible on profile
    await page.waitForTimeout(1000)

    // Take screenshot of profile with saved price list
    await page.screenshot({
      path: 'e2e/screenshots/eyemed-step5-profile-pricelist.png',
      fullPage: true
    })

    // Verify saved price list content is visible - look for "Saved Price List" banner
    await expect(page.locator('text=Saved Price List')).toBeVisible({ timeout: 10000 })

    // Verify we can see the saved items - look for LENS TYPE category or other categories from the pricer
    await expect(page.locator('text=LENS TYPE').first()).toBeVisible({ timeout: 5000 })

    // Verify we can see the EyeMed tab
    await expect(page.getByRole('tab', { name: 'EyeMed' })).toBeVisible()

    // Verify price values are shown (retail and patient cost columns)
    await expect(page.locator('text=You Pay').first()).toBeVisible()
    await expect(page.locator('text=Retail').first()).toBeVisible()

    console.log('✅ EyeMed full flow: customer profile → pricer → save → verify prices on profile')
  })
})
