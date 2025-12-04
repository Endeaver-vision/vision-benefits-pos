import { test, expect } from '@playwright/test'

/**
 * Authentication Tests
 * Tests login flow, session management, and protected routes
 */

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login')

      await expect(page.getByRole('heading', { name: /Vision Benefits POS/i })).toBeVisible()
      await expect(page.getByLabel(/username/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should have visible text on dark background', async ({ page }) => {
      await page.goto('/login')

      // Check that text elements are visible (not invisible due to color issues)
      const heading = page.getByRole('heading', { name: /Vision Benefits POS/i })
      await expect(heading).toBeVisible()

      // Check input labels are visible
      await expect(page.getByText('Username')).toBeVisible()
      await expect(page.getByText('Password')).toBeVisible()
    })

    test('should show error for empty credentials', async ({ page }) => {
      await page.goto('/login')

      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText(/please fill in all fields/i)).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel(/username/i).fill('wronguser')
      await page.getByLabel(/password/i).fill('wrongpass')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10000 })
    })

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel(/username/i).fill('caritch')
      await page.getByLabel(/password/i).fill('Vision2020')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should redirect to quote-builder after successful login
      await expect(page).toHaveURL(/quote-builder/, { timeout: 15000 })
    })

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/login')

      const passwordInput = page.getByLabel(/password/i)
      await passwordInput.fill('testpassword')

      // Initially should be password type
      await expect(passwordInput).toHaveAttribute('type', 'password')

      // Click toggle button
      await page.getByRole('button', { name: '' }).first().click() // Eye icon button

      // Should now be text type
      await expect(passwordInput).toHaveAttribute('type', 'text')
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard')

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 })
    })

    test('should redirect to login when accessing quote-builder without auth', async ({ page }) => {
      await page.goto('/quote-builder')

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 })
    })

    test('should redirect to login when accessing customers without auth', async ({ page }) => {
      await page.goto('/customers')

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 })
    })

    test('should redirect to login when accessing pos without auth', async ({ page }) => {
      await page.goto('/pos')

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 })
    })
  })

  test.describe('Session Management', () => {
    test('should maintain session after login', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.getByLabel(/username/i).fill('caritch')
      await page.getByLabel(/password/i).fill('Vision2020')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page).toHaveURL(/quote-builder/, { timeout: 15000 })

      // Navigate to another page
      await page.goto('/dashboard')

      // Should not be redirected to login
      await expect(page).not.toHaveURL(/login/)
    })

    test('should show user info in navigation after login', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel(/username/i).fill('caritch')
      await page.getByLabel(/password/i).fill('Vision2020')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page).toHaveURL(/quote-builder/, { timeout: 15000 })

      // User dropdown should be visible
      await expect(page.getByRole('button', { name: /caritch/i })).toBeVisible({ timeout: 5000 })
    })
  })
})
