import { test, expect } from '@playwright/test'
import path from 'path'

const EYEMED_PDFS = [
  // Patient 1 - already validated in previous test
  { file: 'SS_eyemed.pdf', expectedName: 'Steven Soto' },
  // Patient 2-5
  { file: 'AP_eyemed.pdf', expectedName: null },
  { file: 'GB_eyemed.pdf', expectedName: null },
  { file: 'ER-eyemed.pdf', expectedName: null },
  { file: 'DD-INS.pdf', expectedName: null },
]

test.describe('EyeMed Pricer - Phase 4: Validate 5 Patients', () => {
  for (let i = 0; i < EYEMED_PDFS.length; i++) {
    const pdf = EYEMED_PDFS[i]

    test(`Patient ${i + 1}: ${pdf.file}`, async ({ page }) => {
      // Navigate to the pricer page
      await page.goto('/eyemed-pricer')

      // Verify upload UI is visible
      await expect(page.locator('text=Upload EyeMed Authorization')).toBeVisible()

      // Upload the PDF
      const fileInput = page.locator('input[type="file"]')
      const pdfPath = path.resolve(`/Users/cmac/let/vision-pos/Reference-Docs/Insurance Auths/Eyemed/${pdf.file}`)
      await fileInput.setInputFiles(pdfPath)

      // Wait for processing
      await page.waitForTimeout(500)

      // Wait for completion - patient header should appear
      await expect(page.locator('text=Patient Price List')).toBeVisible({ timeout: 90000 })

      // Take full page screenshot for validation
      await page.screenshot({
        path: `e2e/screenshots/eyemed-validation-patient-${i + 1}.png`,
        fullPage: true
      })

      // Verify key elements are present
      await expect(page.locator('th:has-text("Retail")')).toBeVisible()
      await expect(page.locator('th:has-text("Patient Cost")')).toBeVisible()
      await expect(page.locator('text=EXAM SERVICES')).toBeVisible()
      await expect(page.locator('text=LENS TYPE')).toBeVisible()

      // Log extracted patient info
      const patientName = await page.locator('.text-xl.font-bold.text-white').first().textContent()
      const planName = await page.locator('.text-white\\/70').first().textContent()
      console.log(`✅ Patient ${i + 1}: ${patientName} - ${planName}`)
    })
  }
})
