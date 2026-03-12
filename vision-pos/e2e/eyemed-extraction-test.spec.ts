import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('EyeMed Pricer - Phase 2 & 3', () => {
  test('extracts benefits and calculates prices from real EyeMed PDF', async ({ page }) => {
    // Navigate to the pricer page
    await page.goto('/eyemed-pricer')

    // Verify upload UI is visible
    await expect(page.locator('text=Upload EyeMed Authorization')).toBeVisible()

    // Screenshot before upload
    await page.screenshot({ path: 'e2e/screenshots/eyemed-pricer-01-before.png' })

    // Get the file input and upload a real EyeMed PDF
    const fileInput = page.locator('input[type="file"]')
    const pdfPath = path.resolve('/Users/cmac/let/vision-pos/Reference-Docs/Insurance Auths/Eyemed/SS_eyemed.pdf')
    await fileInput.setInputFiles(pdfPath)

    // Wait for extraction to start (might be reading or extracting)
    await page.waitForTimeout(500) // Brief wait for state transition
    await page.screenshot({ path: 'e2e/screenshots/eyemed-pricer-02-processing.png' })

    // Wait for completion - patient name should appear when done
    await expect(page.locator('[class*="text-xl"][class*="font-bold"]').first()).toBeVisible({ timeout: 60000 })

    // Screenshot after extraction - full page to see price list
    await page.screenshot({ path: 'e2e/screenshots/eyemed-pricer-03-results.png', fullPage: true })

    // Phase 3: Verify pricing table is displayed
    await expect(page.locator('text=Patient Price List')).toBeVisible()
    await expect(page.locator('text=Routine Vision Exam')).toBeVisible()
    await expect(page.locator('text=LENS TYPE')).toBeVisible()
    await expect(page.locator('text=LENS MATERIAL')).toBeVisible()
    await expect(page.locator('text=AR COATINGS')).toBeVisible()

    // Verify price columns exist (Retail and Patient Cost)
    await expect(page.locator('th:has-text("Retail")')).toBeVisible()
    await expect(page.locator('th:has-text("Patient Cost")')).toBeVisible()

    // Click "Show raw JSON" to see full extraction
    await page.click('text=Show raw JSON')
    await page.screenshot({ path: 'e2e/screenshots/eyemed-pricer-04-raw-json.png', fullPage: true })

    console.log('✅ Phase 2 & 3 test passed! Benefits extracted and prices calculated.')
  })
})
