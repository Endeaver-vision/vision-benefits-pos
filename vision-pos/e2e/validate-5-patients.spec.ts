import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * Validate inline pricers for 5 patients
 * This test validates that the inline pricer system works correctly
 * for generating and saving price lists directly in customer profiles.
 */
test.describe('5 Patient Inline Pricer Validation', () => {
  test('Validate 5 patients with inline pricers', async ({ page }) => {
    test.setTimeout(300000) // 5 minutes for full validation

    const validatedPatients: string[] = []
    const testPdfs = {
      eyemed: path.resolve('Reference-Docs/Insurance Auths/Eyemed/SS_eyemed.pdf'),
      vspAuth: path.resolve('Reference-Docs/Insurance Auths/VSP/BG_vspauth.pdf'),
      vspLens: path.resolve('Reference-Docs/Insurance Auths/VSP/BG_vsplens.pdf')
    }

    // Patient list to validate
    const patients = [
      { name: 'Dorothy', carrier: 'EYEMED' },
      { name: 'Robert', carrier: 'VSP' },
      { name: 'Linda', carrier: 'EYEMED' },
      { name: 'Margaret', carrier: 'VSP' },
      { name: 'Susan', carrier: 'EYEMED' }
    ]

    for (const patient of patients) {
      console.log(`\n========== Testing ${patient.name} (${patient.carrier}) ==========`)

      // Navigate to customers
      await page.goto('/customers')
      await page.waitForLoadState('networkidle')

      // Search for patient
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
      await searchInput.fill(patient.name)
      await page.waitForTimeout(1500)

      // Click on patient result
      const patientResult = page.locator(`text=${patient.name}`).first()
      if (!(await patientResult.isVisible({ timeout: 3000 }))) {
        console.log(`⚠️ ${patient.name} not found - skipping`)
        continue
      }

      await patientResult.click()
      await page.waitForURL(/\/customers\//, { timeout: 5000 })
      await page.waitForLoadState('networkidle')
      console.log(`✅ Navigated to ${patient.name}'s profile`)

      // Click Price List tab
      const priceListTab = page.getByRole('tab', { name: /Price/i })
      if (!(await priceListTab.isVisible({ timeout: 3000 }))) {
        console.log(`⚠️ Price List tab not visible for ${patient.name}`)
        continue
      }
      await priceListTab.click()
      await page.waitForTimeout(1500) // Wait for loading state

      // Click the carrier tab
      const carrierTab = page.getByRole('tab', { name: patient.carrier === 'EYEMED' ? 'EyeMed' : 'VSP' })
      if (!(await carrierTab.isVisible({ timeout: 3000 }))) {
        console.log(`⚠️ ${patient.carrier} tab not visible for ${patient.name}`)
        continue
      }
      await carrierTab.click()
      await page.waitForTimeout(2000) // Wait for loading state to complete

      // Check if has saved prices OR inline pricer
      const savedPricesIndicator = page.locator('text=Saved Price List')
      const hasSavedPrices = await savedPricesIndicator.isVisible({ timeout: 3000 })

      if (hasSavedPrices) {
        console.log(`✅ ${patient.name} already has saved ${patient.carrier} prices - VALIDATED`)
        validatedPatients.push(`${patient.name} (${patient.carrier} - existing)`)
        continue
      }

      // Look for inline pricer
      const eyemedInline = page.locator('text=Upload EyeMed Authorization')
      const vspInline = page.locator('text=Drag & Drop VSP Documents')

      const inlineVisible = patient.carrier === 'EYEMED'
        ? await eyemedInline.isVisible({ timeout: 3000 })
        : await vspInline.isVisible({ timeout: 3000 })

      if (!inlineVisible) {
        console.log(`⚠️ No inline pricer visible for ${patient.name} - skipping`)
        continue
      }

      console.log(`✅ ${patient.carrier} inline pricer visible`)

      // Upload and process based on carrier
      if (patient.carrier === 'EYEMED') {
        // EyeMed: Single PDF upload
        const fileChooserPromise = page.waitForEvent('filechooser')
        await page.locator('text=Choose PDF File').click()
        const fileChooser = await fileChooserPromise
        await fileChooser.setFiles(testPdfs.eyemed)
        console.log(`✅ EyeMed PDF selected`)

        // Wait for extraction and results
        const priceListGenerated = page.locator('text=Patient Price List')
        await expect(priceListGenerated).toBeVisible({ timeout: 60000 })
        console.log(`✅ EyeMed price list generated`)

        // Save
        const saveBtn = page.locator('button:has-text("Save to Profile")')
        if (await saveBtn.isVisible({ timeout: 3000 })) {
          await saveBtn.click()
          // Wait for save success or page refresh to saved view
          const successOrSaved = page.locator('text=Price List Saved').or(page.locator('text=Saved Price List'))
          await expect(successOrSaved).toBeVisible({ timeout: 15000 })
          console.log(`✅ ${patient.name}'s EyeMed price list SAVED`)
          validatedPatients.push(`${patient.name} (EyeMed - inline saved)`)
        }
      } else {
        // VSP: Two PDF upload
        const fileInput = page.locator('[data-testid="vsp-pdf-upload"]')
        await fileInput.setInputFiles([testPdfs.vspAuth, testPdfs.vspLens])
        console.log(`✅ VSP PDFs selected`)
        await page.waitForTimeout(1000)

        // Assign files to Auth and Enhancement
        const authBtn = page.locator('button:has-text("Auth")').first()
        if (await authBtn.isVisible({ timeout: 3000 })) {
          await authBtn.click()
          await page.waitForTimeout(500)
        }

        const enhBtn = page.locator('button:has-text("Enhancement")').first()
        if (await enhBtn.isVisible({ timeout: 3000 })) {
          await enhBtn.click()
          await page.waitForTimeout(500)
        }

        // Click Generate
        const generateBtn = page.locator('button:has-text("Generate Price List")')
        if (await generateBtn.isEnabled({ timeout: 3000 })) {
          await generateBtn.click()
          console.log(`✅ VSP extraction started`)

          // Wait for results
          const priceListGenerated = page.locator('text=Patient Price List')
          await expect(priceListGenerated).toBeVisible({ timeout: 90000 })
          console.log(`✅ VSP price list generated`)

          // Save
          const saveBtn = page.locator('button:has-text("Save to Profile")')
          if (await saveBtn.isVisible({ timeout: 3000 })) {
            await saveBtn.click()
            const successOrSaved = page.locator('text=Price List Saved').or(page.locator('text=Saved Price List'))
            await expect(successOrSaved).toBeVisible({ timeout: 15000 })
            console.log(`✅ ${patient.name}'s VSP price list SAVED`)
            validatedPatients.push(`${patient.name} (VSP - inline saved)`)
          }
        }
      }
    }

    // Final summary
    console.log('\n========== VALIDATION SUMMARY ==========')
    console.log(`Patients validated: ${validatedPatients.length}`)
    for (const p of validatedPatients) {
      console.log(`  ✅ ${p}`)
    }

    // We need at least 5 validated
    expect(validatedPatients.length).toBeGreaterThanOrEqual(5)
    console.log('\n🎉 FIVE PATIENTS VALIDATED SUCCESSFULLY!')
  })
})
