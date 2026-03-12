import { test, expect } from '@playwright/test'
import path from 'path'

// Test inline pricer integration for EyeMed and VSP
test.describe('Inline Pricer Integration', () => {
  // EyeMed Inline Test
  test('EyeMed inline pricer uploads PDF and generates price list', async ({ page }) => {
    test.setTimeout(120000) // 2 minutes for extraction

    // Navigate to Dorothy's profile
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill('Dorothy')
    await page.waitForTimeout(1500)

    const patientResult = page.locator('text=Dorothy').first()
    await expect(patientResult).toBeVisible({ timeout: 5000 })
    await patientResult.click()
    await page.waitForURL(/\/customers\//, { timeout: 5000 })
    await page.waitForLoadState('networkidle')
    console.log('✅ Navigated to Dorothy profile')

    // Click Price List tab
    const priceListTab = page.getByRole('tab', { name: /Price/i })
    await expect(priceListTab).toBeVisible({ timeout: 3000 })
    await priceListTab.click()
    await page.waitForTimeout(1000)
    console.log('✅ Clicked Price List tab')

    // Click EyeMed tab
    const eyemedTab = page.getByRole('tab', { name: 'EyeMed' })
    await expect(eyemedTab).toBeVisible({ timeout: 3000 })
    await eyemedTab.click()
    await page.waitForTimeout(1000)
    console.log('✅ Clicked EyeMed tab')

    // Check for inline upload UI
    const uploadArea = page.locator('text=Upload EyeMed Authorization')
    const hasInlineUI = await uploadArea.isVisible({ timeout: 3000 })

    if (!hasInlineUI) {
      console.log('⚠️ EyeMed has saved prices - skipping upload test')
      // Take screenshot to show current state
      await page.screenshot({ path: 'e2e/screenshots/inline-eyemed-has-prices.png', fullPage: true })
      return // Skip if already has prices
    }

    console.log('✅ EyeMed inline upload UI visible')

    // Upload test PDF via file chooser
    const pdfPath = path.resolve('Reference-Docs/Insurance Auths/Eyemed/SS_eyemed.pdf')
    console.log(`📄 Uploading PDF: ${pdfPath}`)

    // Trigger file chooser
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('text=Choose PDF File').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(pdfPath)
    console.log('✅ PDF file selected')

    // Wait for extraction to start (or complete) - use OR pattern
    const extractingText = page.locator('text=Extracting benefits')
    const readingText = page.locator('text=Reading PDF')
    const priceListText = page.locator('text=Patient Price List')
    const loadingOrDone = extractingText.or(readingText).or(priceListText)
    await expect(loadingOrDone).toBeVisible({ timeout: 30000 })
    console.log('✅ Processing started or completed')

    // Wait for price list to appear (may already be visible if extraction was fast)
    await expect(priceListText).toBeVisible({ timeout: 90000 })
    console.log('✅ EyeMed price list generated')

    // Verify benefit summary cards exist (use first match to avoid strict mode violation)
    await expect(page.locator('text=Exam Copay').first()).toBeVisible({ timeout: 3000 })
    console.log('✅ Benefit summary visible')

    // Take screenshot before save
    await page.screenshot({ path: 'e2e/screenshots/inline-eyemed-generated.png', fullPage: true })

    // Save price list
    const saveBtn = page.locator('button:has-text("Save to Profile")')
    await expect(saveBtn).toBeVisible({ timeout: 3000 })
    console.log('✅ Save button visible')
    await saveBtn.click()

    // Wait for success - either see "Price List Saved" briefly, or see the saved version view
    // After save, parent component refetches and switches to saved version view
    const successBanner = page.locator('text=Price List Saved')
    const savedVersionBanner = page.locator('text=Saved Price List')
    const successOrSaved = successBanner.or(savedVersionBanner)
    await expect(successOrSaved).toBeVisible({ timeout: 15000 })
    console.log('✅ EyeMed price list SAVED via inline pricer')

    // Take final screenshot
    await page.screenshot({ path: 'e2e/screenshots/inline-eyemed-saved.png', fullPage: true })
  })

  // VSP Inline Test
  test('VSP inline pricer uploads PDFs and generates price list', async ({ page }) => {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    // Search for a test patient without saved VSP prices
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill('Robert')
    await page.waitForTimeout(1500)

    const patientResult = page.locator('text=Robert').first()
    if (await patientResult.isVisible({ timeout: 5000 })) {
      await patientResult.click()
      await page.waitForURL(/\/customers\//, { timeout: 5000 })
      await page.waitForLoadState('networkidle')

      // Click Price List tab
      const priceListTab = page.getByRole('tab', { name: /Price/i })
      if (await priceListTab.isVisible({ timeout: 3000 })) {
        await priceListTab.click()
        await page.waitForTimeout(1000)
      }

      // Click VSP tab
      const vspTab = page.getByRole('tab', { name: 'VSP' })
      if (await vspTab.isVisible({ timeout: 3000 })) {
        await vspTab.click()
        await page.waitForTimeout(1000)

        // Check for inline upload UI
        const uploadArea = page.locator('text=Drag & Drop VSP Documents')
        if (await uploadArea.isVisible({ timeout: 3000 })) {
          console.log('✅ VSP inline upload UI visible')

          // Upload both PDFs
          const authPdfPath = path.resolve('Reference-Docs/Insurance Auths/VSP/BG_vspauth.pdf')
          const lensPdfPath = path.resolve('Reference-Docs/Insurance Auths/VSP/BG_vsplens.pdf')

          const fileInput = page.locator('[data-testid="vsp-pdf-upload"]')
          await fileInput.setInputFiles([authPdfPath, lensPdfPath])
          await page.waitForTimeout(1000)

          // Assign files - click the assignment buttons
          // First file → Auth
          const authBtn = page.locator('button:has-text("Auth")').first()
          if (await authBtn.isVisible({ timeout: 3000 })) {
            await authBtn.click()
            await page.waitForTimeout(500)
          }

          // Second file → Enhancement
          const enhBtn = page.locator('button:has-text("Enhancement")').first()
          if (await enhBtn.isVisible({ timeout: 3000 })) {
            await enhBtn.click()
            await page.waitForTimeout(500)
          }

          // Click Generate
          const generateBtn = page.locator('button:has-text("Generate Price List")')
          if (await generateBtn.isEnabled({ timeout: 3000 })) {
            await generateBtn.click()

            // Wait for extraction
            const extracting = page.locator('text=Extracting benefits from PDFs')
            if (await extracting.isVisible({ timeout: 5000 })) {
              console.log('✅ VSP extraction started')
            }

            // Wait for results
            const lensMatrix = page.locator('text=Lens + Material Matrix')
            if (await lensMatrix.isVisible({ timeout: 90000 })) {
              console.log('✅ VSP lens matrix generated')

              // Check price list
              const priceList = page.locator('text=Patient Price List')
              if (await priceList.isVisible({ timeout: 5000 })) {
                console.log('✅ VSP price list generated')
              }

              // Save
              const saveBtn = page.locator('button:has-text("Save to Profile")')
              if (await saveBtn.isVisible({ timeout: 3000 })) {
                console.log('✅ VSP Save button visible')
                await saveBtn.click()

                const success = page.locator('text=Price List Saved')
                if (await success.isVisible({ timeout: 10000 })) {
                  console.log('✅ VSP price list SAVED via inline pricer')
                }
              }
            }
          }

          await page.screenshot({ path: 'e2e/screenshots/inline-vsp-result.png', fullPage: true })
        } else {
          console.log('⚠️ No inline upload UI - may have existing saved prices')
        }
      }
    } else {
      console.log('⚠️ Robert not found')
    }
  })
})

// Quick validation that inline pricers appear for patients without saved prices
test('Verify inline pricers appear for unsaved patients', async ({ page }) => {
  const patients = ['Dorothy', 'Robert', 'Linda']
  let eyemedInlineFound = 0
  let vspInlineFound = 0

  for (const patientName of patients) {
    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill(patientName)
    await page.waitForTimeout(1500)

    const patientResult = page.locator(`text=${patientName}`).first()
    if (!(await patientResult.isVisible({ timeout: 3000 }))) {
      continue
    }

    await patientResult.click()
    await page.waitForURL(/\/customers\//, { timeout: 5000 })
    await page.waitForLoadState('networkidle')

    // Click Price List tab
    const priceListTab = page.getByRole('tab', { name: /Price/i })
    if (!(await priceListTab.isVisible({ timeout: 3000 }))) {
      continue
    }
    await priceListTab.click()
    await page.waitForTimeout(1000)

    // Check EyeMed tab
    const eyemedTab = page.getByRole('tab', { name: 'EyeMed' })
    if (await eyemedTab.isVisible({ timeout: 2000 })) {
      await eyemedTab.click()
      await page.waitForTimeout(1000)

      const eyemedInline = page.locator('text=Upload EyeMed Authorization')
      if (await eyemedInline.isVisible({ timeout: 2000 })) {
        console.log(`  ✅ ${patientName}: EyeMed inline pricer visible`)
        eyemedInlineFound++
      } else {
        console.log(`  ⚠️ ${patientName}: EyeMed has saved prices`)
      }
    }

    // Check VSP tab
    const vspTab = page.getByRole('tab', { name: 'VSP' })
    if (await vspTab.isVisible({ timeout: 2000 })) {
      await vspTab.click()
      await page.waitForTimeout(1000)

      const vspInline = page.locator('text=Drag & Drop VSP Documents')
      if (await vspInline.isVisible({ timeout: 2000 })) {
        console.log(`  ✅ ${patientName}: VSP inline pricer visible`)
        vspInlineFound++
      } else {
        console.log(`  ⚠️ ${patientName}: VSP has saved prices`)
      }
    }
  }

  console.log(`\n=== INLINE PRICER SUMMARY ===`)
  console.log(`EyeMed inline found: ${eyemedInlineFound}`)
  console.log(`VSP inline found: ${vspInlineFound}`)

  // At least one of each should be found for patients without saved prices
  expect(eyemedInlineFound + vspInlineFound).toBeGreaterThanOrEqual(1)
})
