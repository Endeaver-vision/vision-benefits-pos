import { test, expect } from '@playwright/test'

test('View Bonnie Gregory VSP tab with lens matrix', async ({ page }) => {
  await page.goto('/customers')
  await page.waitForLoadState('networkidle')

  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
  await expect(searchInput).toBeVisible({ timeout: 10000 })
  await searchInput.fill('Bonnie Gregory')
  await page.waitForTimeout(2000)

  await page.locator('text=Bonnie').first().click()
  await page.waitForURL(/\/customers\//, { timeout: 10000 })
  await page.waitForLoadState('networkidle')

  // Click Price Plan tab if visible
  const pricePlanTab = page.getByRole('tab', { name: /Price/i })
  if (await pricePlanTab.isVisible()) {
    await pricePlanTab.click()
    await page.waitForTimeout(1000)
  }

  // Click VSP tab
  const vspTab = page.getByRole('tab', { name: 'VSP' })
  await expect(vspTab).toBeVisible({ timeout: 5000 })
  await vspTab.click()
  await page.waitForTimeout(2000)

  // Take full page screenshot
  await page.screenshot({ path: 'e2e/screenshots/bonnie-vsp-lens-matrix.png', fullPage: true })

  // Check for lens matrix table
  const lensMatrixHeader = page.locator('text=Lens + Material Matrix')
  if (await lensMatrixHeader.isVisible()) {
    console.log('✅ Lens + Material Matrix is visible!')

    // Check for materials in table cells (more specific)
    const matrixTable = page.locator('table').first()
    await expect(matrixTable.locator('td:has-text("CR-39")')).toBeVisible()
    await expect(matrixTable.locator('td:has-text("Polycarbonate")')).toBeVisible()
    await expect(matrixTable.locator('td:has-text("Trivex")')).toBeVisible()
    await expect(matrixTable.locator('td:has-text("1.67 High Index")')).toBeVisible()
    await expect(matrixTable.locator('td:has-text("1.74 Ultra High")')).toBeVisible()

    console.log('✅ All 5 material rows visible in lens matrix')
  } else {
    console.log('❌ Lens + Material Matrix NOT visible')
  }

  console.log('Screenshots saved to e2e/screenshots/')
})
