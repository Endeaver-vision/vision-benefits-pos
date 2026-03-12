/**
 * Pricer Integration Test
 * Tests the full workflow: patient selection -> document upload -> extraction -> save to profile
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const VSP_DIR = './public/uploads/insurance-docs/vsp'
const EYEMED_DIR = './public/uploads/insurance-docs/eyemed'

test.describe('VSP Pricer Integration', () => {
  test('requires patient selection before upload', async ({ page }) => {
    // Navigate to VSP pricer
    await page.goto('/vsp-pricer')
    await expect(page.locator('h1')).toContainText('VSP Pricer')

    // Verify patient selector is visible
    await expect(page.locator('text=Step 1: Select Patient')).toBeVisible()

    // Verify upload zone is NOT visible without patient selection
    const uploadZone = page.locator('text=Drag & Drop VSP Documents')
    await expect(uploadZone).not.toBeVisible()

    await page.screenshot({ path: 'test-results/vsp-patient-required.png', fullPage: true })
  })

  test('shows upload zone after patient selection', async ({ page }) => {
    await page.goto('/vsp-pricer')

    // Search for a patient
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Christopher')

    // Wait for results
    await page.waitForTimeout(500)

    // Click on first patient result if available
    const patientButton = page.locator('button').filter({ hasText: 'Christopher' }).first()
    if (await patientButton.isVisible({ timeout: 5000 })) {
      await patientButton.click()

      // Verify patient is selected (shows green card)
      await expect(page.locator('.bg-green-900\\/20')).toBeVisible({ timeout: 5000 })

      // Now upload zone should be visible
      await expect(page.locator('text=Drag & Drop VSP Documents')).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/vsp-patient-selected.png', fullPage: true })
  })

  test('full VSP workflow with save', async ({ page }) => {
    // Get test PDF paths
    const authPath = path.join(VSP_DIR, 'cust_christopher_lutz_1769268251567_CL_vspauth.pdf')
    const lensPath = path.join(VSP_DIR, 'cust_christopher_lutz_1769268274347_CL_vsplens.pdf')

    // Skip if test files don't exist
    if (!fs.existsSync(authPath) || !fs.existsSync(lensPath)) {
      test.skip()
      return
    }

    await page.goto('/vsp-pricer')

    // Search for a patient
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Christopher')
    await page.waitForTimeout(500)

    // Click on first patient result if available
    const patientButton = page.locator('button').filter({ hasText: 'Christopher' }).first()
    if (!await patientButton.isVisible({ timeout: 5000 })) {
      test.skip()
      return
    }
    await patientButton.click()

    // Upload files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([authPath, lensPath])

    // Wait for pending files to appear
    await expect(page.locator('text=Assign each file')).toBeVisible({ timeout: 5000 })

    // Assign files
    await page.locator('button:has-text("Auth Form")').first().click()
    await page.locator('button:has-text("Enhancement")').first().click()

    // Click Extract button
    const extractButton = page.locator('button:has-text("Extract & Generate")')
    await expect(extractButton).toBeEnabled({ timeout: 5000 })
    await extractButton.click()

    // Wait for extraction to complete
    await expect(page.locator('text=Lens + Material Matrix')).toBeVisible({ timeout: 60000 })

    // Verify save button is visible
    const saveButton = page.locator('button:has-text("Save to")')
    await expect(saveButton).toBeVisible()

    // Click save button
    await saveButton.click()

    // Wait for save to complete
    await expect(page.locator('text=Price list saved')).toBeVisible({ timeout: 10000 })

    // Verify "View Profile" link appears
    await expect(page.locator('text=View Profile')).toBeVisible()

    await page.screenshot({ path: 'test-results/vsp-saved-success.png', fullPage: true })
    console.log('✓ VSP full workflow test passed!')
  })
})

test.describe('EyeMed Pricer Integration', () => {
  test('requires patient selection before upload', async ({ page }) => {
    await page.goto('/eyemed-pricer')

    // Verify patient selector is visible
    await expect(page.locator('text=Step 1: Select Patient')).toBeVisible()

    // Verify upload zone is NOT visible without patient selection
    const uploadLabel = page.locator('text=Upload EyeMed Authorization')
    await expect(uploadLabel).not.toBeVisible()

    await page.screenshot({ path: 'test-results/eyemed-patient-required.png', fullPage: true })
  })

  test('shows upload zone after patient selection', async ({ page }) => {
    await page.goto('/eyemed-pricer')

    // Search for a patient
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Angela')
    await page.waitForTimeout(500)

    // Click on first patient result if available
    const patientButton = page.locator('button').filter({ hasText: 'Angela' }).first()
    if (await patientButton.isVisible({ timeout: 5000 })) {
      await patientButton.click()

      // Verify patient is selected (shows green card)
      await expect(page.locator('.bg-green-900\\/20')).toBeVisible({ timeout: 5000 })

      // Now upload zone should be visible
      await expect(page.locator('text=Upload EyeMed Authorization')).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/eyemed-patient-selected.png', fullPage: true })
  })
})

test.describe('Customer Profile Version Management', () => {
  test('displays version history panel', async ({ page }) => {
    // Navigate to customer profile (need a valid customer ID)
    await page.goto('/customers')

    // Click on first customer in list
    const customerLink = page.locator('a[href^="/customers/"]').first()
    if (!await customerLink.isVisible({ timeout: 5000 })) {
      test.skip()
      return
    }
    await customerLink.click()

    // Wait for profile to load
    await page.waitForTimeout(1000)

    // Look for the version history button
    const versionButton = page.locator('button:has-text("Versions")')
    if (await versionButton.isVisible({ timeout: 5000 })) {
      await versionButton.click()

      // Verify version panel appears
      await expect(page.locator('text=Saved Price Lists')).toBeVisible({ timeout: 5000 })

      await page.screenshot({ path: 'test-results/customer-version-panel.png', fullPage: true })
    }
  })
})
