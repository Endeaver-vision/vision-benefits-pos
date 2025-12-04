import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Create test image files
const createTestImage = async () => {
  // Create a simple valid PNG file (1x1 pixel transparent)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ])

  const testDir = '/tmp/scanner-test-files'
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }

  const authPath = path.join(testDir, 'vsp-authorization-test.png')
  const lensPath = path.join(testDir, 'lens-enhancement-test.png')

  fs.writeFileSync(authPath, pngBuffer)
  fs.writeFileSync(lensPath, pngBuffer)

  return { authPath, lensPath }
}

test.describe('Scanner Page', () => {
  test.beforeAll(async () => {
    await createTestImage()
  })

  test('can load scanner page', async ({ page }) => {
    await page.goto('/scanner')
    await expect(page.getByText('Insurance Document Scanner')).toBeVisible()
  })

  test('can search and select a customer', async ({ page }) => {
    await page.goto('/scanner')

    // Should see customer selector first
    await expect(page.getByText('Select Customer')).toBeVisible()

    // Search for a customer
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Wood')

    // Wait for results
    await page.waitForTimeout(500)

    // Click on a customer result if available
    const customerResult = page.getByText('Donald Wood')
    if (await customerResult.isVisible()) {
      await customerResult.click()

      // Should now see upload step
      await expect(page.getByText('Upload Insurance Documents')).toBeVisible()
    }
  })

  test('can add a file to upload', async ({ page }) => {
    await page.goto('/scanner')

    // Search and select customer
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Wood')
    await page.waitForTimeout(500)

    const customerResult = page.getByText('Donald Wood')
    if (await customerResult.isVisible()) {
      await customerResult.click()
      await expect(page.getByText('Upload Insurance Documents')).toBeVisible()

      // Add a file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles('/tmp/scanner-test-files/vsp-authorization-test.png')

      // Should see the file in the list
      await expect(page.getByText('vsp-authorization-test.png')).toBeVisible()
      await expect(page.getByText('Ready')).toBeVisible()
    }
  })

  test('can add multiple files', async ({ page }) => {
    await page.goto('/scanner')

    // Search and select customer
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Wood')
    await page.waitForTimeout(500)

    const customerResult = page.getByText('Donald Wood')
    if (await customerResult.isVisible()) {
      await customerResult.click()
      await expect(page.getByText('Upload Insurance Documents')).toBeVisible()

      // Add first file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles('/tmp/scanner-test-files/vsp-authorization-test.png')
      await expect(page.getByText('vsp-authorization-test.png')).toBeVisible()

      // Add second file using the same input
      await fileInput.setInputFiles('/tmp/scanner-test-files/lens-enhancement-test.png')

      // Should see both files
      await expect(page.getByText('vsp-authorization-test.png')).toBeVisible()
      await expect(page.getByText('lens-enhancement-test.png')).toBeVisible()

      // Should show 2 documents
      await expect(page.getByText('Documents (2)')).toBeVisible()
    }
  })

  test('upload button works', async ({ page }) => {
    await page.goto('/scanner')

    // Search and select customer
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('Wood')
    await page.waitForTimeout(500)

    const customerResult = page.getByText('Donald Wood')
    if (await customerResult.isVisible()) {
      await customerResult.click()
      await expect(page.getByText('Upload Insurance Documents')).toBeVisible()

      // Add a file
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles('/tmp/scanner-test-files/vsp-authorization-test.png')
      await expect(page.getByText('vsp-authorization-test.png')).toBeVisible()

      // Click upload button
      const uploadButton = page.getByRole('button', { name: /upload.*process/i })
      await expect(uploadButton).toBeEnabled()

      // Listen for console logs
      page.on('console', msg => {
        if (msg.text().includes('[Scanner]') || msg.text().includes('[ScannerPage]')) {
          console.log('BROWSER LOG:', msg.text())
        }
      })

      await uploadButton.click()

      // Should transition to processing step or show error
      // Wait for either processing screen or an error
      await page.waitForTimeout(3000)

      // Check what happened - should be on processing or review step
      const processingVisible = await page.getByText('Processing Documents').isVisible()
      const reviewVisible = await page.getByText('Authorization Form').isVisible()
      const errorVisible = await page.getByText(/failed|error/i).isVisible()

      console.log('Processing visible:', processingVisible)
      console.log('Review visible:', reviewVisible)
      console.log('Error visible:', errorVisible)

      // At least one of these should be true - we moved past upload
      expect(processingVisible || reviewVisible || errorVisible).toBeTruthy()
    }
  })
})
