/**
 * VSP Matrix Display Test
 * Verifies that the lens matrix displays correctly in the browser
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const VSP_DIR = './public/uploads/insurance-docs/vsp'

test.describe('VSP Pricer Matrix Display', () => {
  test('displays lens matrix after processing PDFs', async ({ page }) => {
    // Navigate to VSP pricer
    await page.goto('/vsp-pricer')
    await expect(page.locator('h1')).toContainText('VSP Pricer')

    // Get test PDF paths
    const authPath = path.join(VSP_DIR, 'cust_christopher_lutz_1769268251567_CL_vspauth.pdf')
    const lensPath = path.join(VSP_DIR, 'cust_christopher_lutz_1769268274347_CL_vsplens.pdf')

    // Verify files exist
    expect(fs.existsSync(authPath)).toBe(true)
    expect(fs.existsSync(lensPath)).toBe(true)

    // Upload files via file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([authPath, lensPath])

    // Wait for pending files to appear
    await expect(page.locator('text=Assign each file')).toBeVisible({ timeout: 5000 })

    // Screenshot the pending state
    await page.screenshot({ path: 'test-results/vsp-pending-files.png', fullPage: true })

    // Assign first file as Auth
    const authButton = page.locator('button:has-text("Auth Form")').first()
    await authButton.click()

    // Assign second file as Enhancement
    const enhancementButton = page.locator('button:has-text("Enhancement")').first()
    await enhancementButton.click()

    // Click Extract button
    const extractButton = page.locator('button:has-text("Extract & Generate")')
    await expect(extractButton).toBeEnabled({ timeout: 5000 })
    await extractButton.click()

    // Wait for extraction to complete (loading state then results)
    await expect(page.locator('text=Extracting benefits')).toBeVisible({ timeout: 10000 })

    // Wait for results - look for the matrix header
    await expect(page.locator('text=Lens + Material Matrix')).toBeVisible({ timeout: 60000 })

    // Find the matrix section specifically
    const matrixSection = page.locator('text=Lens + Material Matrix').locator('..')

    // Verify matrix table exists - look for the table after the matrix header
    const matrixTable = page.locator('table').filter({ has: page.locator('th:has-text("Material")') })
    await expect(matrixTable).toBeVisible()

    // Verify column headers in matrix table
    await expect(matrixTable.locator('th:has-text("SV")')).toBeVisible()
    await expect(matrixTable.locator('th:has-text("Standard")')).toBeVisible()
    await expect(matrixTable.locator('th:has-text("Premium")')).toBeVisible()
    await expect(matrixTable.locator('th:has-text("Custom")')).toBeVisible()

    // Verify matrix has material rows
    await expect(matrixTable.locator('text=CR-39')).toBeVisible()
    await expect(matrixTable.locator('text=Polycarbonate')).toBeVisible()
    await expect(matrixTable.locator('text=Trivex')).toBeVisible()
    await expect(matrixTable.locator('text=1.67')).toBeVisible()
    await expect(matrixTable.locator('text=1.74')).toBeVisible()

    // Verify we see dollar amounts in the matrix
    const dollarCells = matrixTable.locator('td:has-text("$")')
    const cellCount = await dollarCells.count()
    expect(cellCount).toBeGreaterThanOrEqual(25) // 5 materials × 5 columns minimum

    // Screenshot the final result with matrix visible
    await page.screenshot({ path: 'test-results/vsp-matrix-display.png', fullPage: true })

    console.log('✓ Matrix display test passed!')
    console.log('  - Lens + Material Matrix header visible')
    console.log('  - All material rows visible (CR-39, Poly, Trivex, 1.67, 1.74)')
    console.log('  - All lens type columns visible (SV, Standard, Premium, Custom)')
    console.log(`  - ${cellCount} price cells with dollar amounts`)
  })
})
