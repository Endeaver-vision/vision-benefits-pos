import { test, expect } from '@playwright/test'

/**
 * Visual/Styling Tests
 * Tests that pages render correctly with proper styling
 * Catches issues like invisible text, wrong colors, missing elements
 */

test.describe('Visual Styling Tests', () => {
  // Login helper
  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login')
    await page.getByLabel(/username/i).fill('caritch')
    await page.getByLabel(/password/i).fill('Vision2020')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/quote-builder|dashboard/, { timeout: 15000 })
  }

  test.describe('Public Pages', () => {
    test('Home page should render with dark theme', async ({ page }) => {
      await page.goto('/')

      // Should have dark background
      const body = page.locator('body')
      await expect(body).toBeVisible()

      // Check for gradient background
      const hasGradient = await page.evaluate(() => {
        const el = document.querySelector('div')
        const style = window.getComputedStyle(el!)
        return style.backgroundImage.includes('gradient') || style.background.includes('gradient')
      })

      test.info().annotations.push({
        type: hasGradient ? 'PASS' : 'GAP',
        description: `Home page has gradient background: ${hasGradient}`
      })

      // Text should be visible (white on dark)
      await expect(page.getByRole('heading')).toBeVisible()
    })

    test('Login page should have visible form elements', async ({ page }) => {
      await page.goto('/login')

      // All form elements should be visible
      await expect(page.getByLabel(/username/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

      // Labels should be visible (not gray on dark)
      const usernameLabel = page.getByText('Username')
      await expect(usernameLabel).toBeVisible()

      // Check if text has sufficient contrast
      const labelColor = await usernameLabel.evaluate((el) => {
        return window.getComputedStyle(el).color
      })

      test.info().annotations.push({
        type: 'INFO',
        description: `Username label color: ${labelColor}`
      })
    })
  })

  test.describe('Protected Pages - Dark Theme Check', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('Dashboard should render properly', async ({ page }) => {
      await page.goto('/dashboard')

      // Should not redirect to login
      await expect(page).not.toHaveURL(/login/)

      // Check for main content
      await expect(page.locator('main')).toBeVisible()

      // Check for KPI cards or dashboard elements
      const cards = page.locator('[class*="card"], [class*="Card"]')
      const cardCount = await cards.count()

      test.info().annotations.push({
        type: 'INFO',
        description: `Dashboard has ${cardCount} card elements`
      })
    })

    test('Quote Builder should have visible step indicators', async ({ page }) => {
      // Already at quote-builder after login
      await expect(page).toHaveURL(/quote-builder/)

      // Look for step indicators or navigation
      const steps = page.locator('text=/step|customer|exam|eyeglass|contact|review/i')
      const stepCount = await steps.count()

      expect(stepCount, 'Should have visible step indicators').toBeGreaterThan(0)
    })

    test('Customers page should render table correctly', async ({ page }) => {
      await page.goto('/customers')

      await page.waitForTimeout(2000)

      // Should have customer list or search
      const customerElements = page.locator('text=/customer|search|name|email/i')
      const count = await customerElements.count()

      expect(count, 'Customers page should have customer-related elements').toBeGreaterThan(0)
    })

    test('POS page should render product categories', async ({ page }) => {
      await page.goto('/pos')

      await page.waitForTimeout(2000)

      // Should have category tabs or product sections
      const categories = page.locator('text=/exam|frame|lens|contact/i')
      const count = await categories.count()

      expect(count, 'POS should have category elements').toBeGreaterThan(0)
    })

    test('Inventory page should render stock information', async ({ page }) => {
      await page.goto('/inventory')

      await page.waitForTimeout(2000)

      // Should have inventory-related content
      const inventoryElements = page.locator('text=/inventory|stock|product|quantity/i')
      const count = await inventoryElements.count()

      expect(count, 'Inventory should have stock-related elements').toBeGreaterThan(0)
    })
  })

  test.describe('Text Visibility Checks', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('CRITICAL: No gray text on dark backgrounds', async ({ page }) => {
      await page.goto('/quote-builder')

      // Find all text elements and check for problematic colors
      const problematicElements = await page.evaluate(() => {
        const problems: string[] = []
        const elements = document.querySelectorAll('*')

        elements.forEach((el) => {
          const style = window.getComputedStyle(el)
          const color = style.color
          const bgColor = style.backgroundColor

          // Check for gray text (rgb values close together, all < 150)
          const colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
          if (colorMatch) {
            const r = parseInt(colorMatch[1])
            const g = parseInt(colorMatch[2])
            const b = parseInt(colorMatch[3])

            // Gray colors that would be invisible on dark bg
            const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20
            const isDark = r < 150 && g < 150 && b < 150

            if (isGray && isDark) {
              const text = (el as HTMLElement).innerText?.slice(0, 50)
              if (text && text.trim()) {
                problems.push(`Gray text found: "${text}" with color ${color}`)
              }
            }
          }
        })

        return problems.slice(0, 10) // Return first 10 problems
      })

      if (problematicElements.length > 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: `Found ${problematicElements.length} elements with potentially invisible text`
        })

        for (const problem of problematicElements) {
          test.info().annotations.push({
            type: 'DETAIL',
            description: problem
          })
        }
      }
    })

    test('CRITICAL: Check for white/light backgrounds on dark theme pages', async ({ page }) => {
      await page.goto('/quote-builder')

      const whiteBackgrounds = await page.evaluate(() => {
        const problems: string[] = []
        const elements = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="bg-white"], [class*="bg-gray"]')

        elements.forEach((el) => {
          const style = window.getComputedStyle(el)
          const bgColor = style.backgroundColor

          const colorMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
          if (colorMatch) {
            const r = parseInt(colorMatch[1])
            const g = parseInt(colorMatch[2])
            const b = parseInt(colorMatch[3])

            // Check for bright white or light gray backgrounds
            if (r > 240 && g > 240 && b > 240) {
              const classes = (el as HTMLElement).className
              problems.push(`White background found: ${classes.slice(0, 100)}`)
            }
          }
        })

        return problems.slice(0, 10)
      })

      if (whiteBackgrounds.length > 0) {
        test.info().annotations.push({
          type: 'GAP',
          description: `Found ${whiteBackgrounds.length} elements with white backgrounds on dark theme page`
        })
      }
    })
  })

  test.describe('Button Visibility', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('CRITICAL: All buttons should have visible text', async ({ page }) => {
      await page.goto('/quote-builder')

      const buttons = page.locator('button')
      const buttonCount = await buttons.count()

      const invisibleButtons: string[] = []

      for (let i = 0; i < Math.min(buttonCount, 20); i++) {
        const button = buttons.nth(i)

        if (await button.isVisible()) {
          const text = await button.textContent()
          const hasIcon = await button.locator('svg').count() > 0

          // Button should have text or icon
          if (!text?.trim() && !hasIcon) {
            const classes = await button.getAttribute('class')
            invisibleButtons.push(`Button with no visible content: ${classes?.slice(0, 50)}`)
          }
        }
      }

      if (invisibleButtons.length > 0) {
        test.info().annotations.push({
          type: 'CRITICAL_GAP',
          description: `Found ${invisibleButtons.length} buttons with no visible text/icon`
        })
      }
    })

    test('Buttons should be clickable and responsive', async ({ page }) => {
      await page.goto('/quote-builder')

      // Find primary action buttons
      const primaryButtons = page.locator('button:not([disabled])').first()

      if (await primaryButtons.isVisible()) {
        // Check hover state changes
        await primaryButtons.hover()

        // Button should still be visible after hover
        await expect(primaryButtons).toBeVisible()
      }
    })
  })

  test.describe('Card Styling', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('Cards should have glassmorphism styling', async ({ page }) => {
      await page.goto('/dashboard')

      const hasGlassmorphism = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="card"], [class*="Card"]')
        let glassCount = 0

        cards.forEach((card) => {
          const style = window.getComputedStyle(card)
          const hasBlur = style.backdropFilter.includes('blur') || style.webkitBackdropFilter?.includes('blur')
          const hasTransparency = style.backgroundColor.includes('rgba') || style.background.includes('rgba')

          if (hasBlur || hasTransparency) {
            glassCount++
          }
        })

        return { total: cards.length, glass: glassCount }
      })

      test.info().annotations.push({
        type: 'INFO',
        description: `Cards: ${hasGlassmorphism.glass}/${hasGlassmorphism.total} have glassmorphism`
      })

      if (hasGlassmorphism.total > 0 && hasGlassmorphism.glass === 0) {
        test.info().annotations.push({
          type: 'GAP',
          description: 'No cards have glassmorphism styling'
        })
      }
    })
  })

  test.describe('Page-by-Page Render Check', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    const pagesToCheck = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/quote-builder', name: 'Quote Builder' },
      { path: '/customers', name: 'Customers' },
      { path: '/pos', name: 'POS' },
      { path: '/inventory', name: 'Inventory' },
      { path: '/pricing', name: 'Pricing' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/admin/users', name: 'Admin Users' },
      { path: '/admin/locations', name: 'Admin Locations' },
    ]

    for (const pageInfo of pagesToCheck) {
      test(`${pageInfo.name} should render without errors`, async ({ page }) => {
        // Collect console errors
        const consoleErrors: string[] = []
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text())
          }
        })

        await page.goto(pageInfo.path)
        await page.waitForTimeout(2000)

        // Should not have critical errors
        const criticalErrors = consoleErrors.filter(e =>
          !e.includes('Warning:') && !e.includes('DevTools')
        )

        if (criticalErrors.length > 0) {
          test.info().annotations.push({
            type: 'ERROR',
            description: `Console errors on ${pageInfo.name}: ${criticalErrors.slice(0, 3).join('; ')}`
          })
        }

        // Page should have content
        const mainContent = page.locator('main, [role="main"], .container')
        await expect(mainContent.first()).toBeVisible({ timeout: 5000 })
      })
    }
  })

  test.describe('Form Input Visibility', () => {
    test('Login form inputs should have visible placeholder text', async ({ page }) => {
      await page.goto('/login')

      const usernameInput = page.getByLabel(/username/i)
      const passwordInput = page.getByLabel(/password/i)

      // Check placeholder visibility
      const usernamePlaceholder = await usernameInput.getAttribute('placeholder')
      const passwordPlaceholder = await passwordInput.getAttribute('placeholder')

      expect(usernamePlaceholder).toBeTruthy()
      expect(passwordPlaceholder).toBeTruthy()
    })

    test('Customer search input should be visible', async ({ page }) => {
      await login(page)
      await page.goto('/customers')

      await page.waitForTimeout(2000)

      // Look for search input
      const searchInput = page.getByPlaceholder(/search/i)
        .or(page.getByRole('textbox'))

      await expect(searchInput.first()).toBeVisible()
    })
  })
})
