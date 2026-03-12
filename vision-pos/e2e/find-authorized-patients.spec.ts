import { test, expect } from '@playwright/test'

// Look for patients with insurance authorizations
test('Find patients with insurance authorizations', async ({ page }) => {
  const patientsToCheck = [
    'Bonnie',
    'Angela',
    'Linda',
    'Candice',
    'Margaret',
    'Dorothy',
    'Robert',
    'James',
    'Melinda',
    'Patricia',
    'Jennifer',
    'Michael',
    'William',
    'Elizabeth'
  ]

  const patientsWithAuth: string[] = []

  for (const patientName of patientsToCheck) {
    console.log(`Checking ${patientName}...`)

    await page.goto('/customers')
    await page.waitForLoadState('networkidle')

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill(patientName)
    await page.waitForTimeout(1500)

    const patientResult = page.locator(`text=${patientName}`).first()
    if (await patientResult.isVisible({ timeout: 3000 })) {
      await patientResult.click()
      await page.waitForURL(/\/customers\//, { timeout: 5000 })
      await page.waitForLoadState('networkidle')

      // Look for insurance badge or carrier info
      const vspBadge = page.locator('text=VSP').first()
      const eyemedBadge = page.locator('text=EYEMED, text=EyeMed').first()
      const insuranceBadge = page.locator('.bg-blue-600, .bg-emerald-600').first()

      const hasVsp = await vspBadge.isVisible({ timeout: 2000 })
      const hasEyemed = await eyemedBadge.isVisible({ timeout: 1000 })
      const hasInsurance = hasVsp || hasEyemed

      if (hasInsurance) {
        const carrier = hasVsp ? 'VSP' : 'EyeMed'
        console.log(`  ✅ ${patientName} has ${carrier} insurance`)
        patientsWithAuth.push(`${patientName} (${carrier})`)
      } else {
        console.log(`  ⚠️ ${patientName} - no insurance badge`)
      }
    } else {
      console.log(`  ⚠️ ${patientName} - not found`)
    }
  }

  console.log(`\n=== PATIENTS WITH INSURANCE: ${patientsWithAuth.length} ===`)
  patientsWithAuth.forEach(p => console.log(`  ${p}`))
})
