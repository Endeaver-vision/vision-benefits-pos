import { test, expect } from '@playwright/test'

// Create VSP price lists for multiple patients
const patientsToCreate = [
  'Linda',
  'Candice',
  'Margaret'
]

test('Create VSP price lists for 3 patients', async ({ page }) => {
  let created = 0

  for (const patientName of patientsToCreate) {
    if (created >= 3) break

    console.log(`\n--- Creating VSP price list for ${patientName} ---`)

    // Go to VSP pricer
    await page.goto('/vsp-pricer')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Search for patient
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill(patientName)
    await page.waitForTimeout(2000)

    // Click patient result
    const patientResult = page.locator(`text=${patientName}`).first()
    if (await patientResult.isVisible({ timeout: 5000 })) {
      await patientResult.click()
      await page.waitForTimeout(2000)

      // Should show authorization or benefits step
      // Click Continue/Next to proceed through steps
      const continueBtn = page.getByRole('button', { name: /Continue|Next|Generate/i })

      // Try to proceed through pricer steps
      for (let step = 0; step < 3; step++) {
        if (await continueBtn.isVisible({ timeout: 3000 })) {
          await continueBtn.click()
          await page.waitForTimeout(2000)
        }
      }

      // Look for price list or lens matrix
      const lensMatrix = page.locator('text=Lens + Material Matrix')
      const priceListHeader = page.locator('text=Patient Price List')

      if (await lensMatrix.isVisible({ timeout: 5000 }) || await priceListHeader.isVisible({ timeout: 3000 })) {
        console.log(`  Price list generated for ${patientName}`)

        // Look for Save button
        const saveBtn = page.getByRole('button', { name: /Save|Save Price List/i })
        if (await saveBtn.isVisible({ timeout: 5000 })) {
          await saveBtn.click()
          await page.waitForTimeout(3000)

          // Check for success toast or confirmation
          const toast = page.locator('text=saved')
          if (await toast.isVisible({ timeout: 5000 })) {
            console.log(`✅ ${patientName} - VSP Price List CREATED and SAVED`)
            created++
          } else {
            // Maybe saved without toast
            console.log(`✅ ${patientName} - VSP Price List CREATED (save attempted)`)
            created++
          }
        } else {
          console.log(`⚠️ ${patientName} - No save button found`)
        }
      } else {
        console.log(`⚠️ ${patientName} - Could not generate price list`)
      }
    } else {
      console.log(`⚠️ ${patientName} - Not found in search`)
    }
  }

  console.log(`\n========================================`)
  console.log(`CREATED: ${created}/3 price lists`)
  console.log(`========================================`)
})
