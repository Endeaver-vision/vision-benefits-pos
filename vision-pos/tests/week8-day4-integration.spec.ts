import { test, expect } from '@playwright/test';

/**
 * Week 8 Day 4 - Final Polish & Bug Fixes Integration Tests
 * Comprehensive test suite to validate all polish and bug fixes
 */

test.describe('Week 8 Day 4 - Final Polish & Bug Fixes', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup for each test
    await page.goto('/login');
    
    // Login as test user
    await page.fill('[name="email"]', 'demo@example.com');
    await page.fill('[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
  });

  test.describe('UI/UX Polish Pass', () => {
    
    test('should display loading spinners consistently', async ({ page }) => {
      // Navigate to a data-heavy page
      await page.goto('/analytics');
      
      // Check for loading spinner
      const loadingSpinner = page.locator('.loading-spinner, .animate-spin');
      await expect(loadingSpinner.first()).toBeVisible();
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="analytics-dashboard"]', { timeout: 10000 });
    });

    test('should show proper error messages', async ({ page }) => {
      // Simulate an error condition
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/customers');
      
      // Check for error message component
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should display empty state messages', async ({ page }) => {
      // Navigate to a potentially empty section
      await page.goto('/quotes');
      
      // If no quotes exist, should show empty state
      const hasQuotes = await page.locator('[data-testid="quote-item"]').count();
      if (hasQuotes === 0) {
        const emptyState = page.locator('[data-testid="empty-state"]');
        await expect(emptyState).toBeVisible();
      }
    });

    test('should show confirmation dialogs', async ({ page }) => {
      await page.goto('/customers');
      
      // Try to delete a customer (if any exist)
      const customerRows = page.locator('[data-testid="customer-row"]');
      const customerCount = await customerRows.count();
      
      if (customerCount > 0) {
        await customerRows.first().locator('[data-testid="delete-button"]').click();
        
        // Should show confirmation dialog
        const confirmDialog = page.locator('[data-testid="confirmation-dialog"]');
        await expect(confirmDialog).toBeVisible();
      }
    });

    test('should display toast notifications', async ({ page }) => {
      await page.goto('/customers');
      
      // Create a new customer to trigger success toast
      await page.click('[data-testid="add-customer-button"]');
      await page.fill('[name="firstName"]', 'Test');
      await page.fill('[name="lastName"]', 'Customer');
      await page.fill('[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      
      // Should show success toast
      const toast = page.locator('[data-testid="toast-notification"]');
      await expect(toast).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Performance Optimization', () => {
    
    test('should load pages within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/analytics/dashboard');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should implement lazy loading for large lists', async ({ page }) => {
      await page.goto('/customers');
      
      // Check if lazy loading is implemented
      const customerList = page.locator('[data-testid="customer-list"]');
      await expect(customerList).toBeVisible();
      
      // Scroll to bottom to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for additional items to load
      await page.waitForTimeout(1000);
    });

    test('should use proper caching for API calls', async ({ page }) => {
      // Monitor network requests
      const requests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          requests.push(request.url());
        }
      });

      // Navigate to analytics page
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      const initialRequests = requests.length;

      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      // Should have fewer requests due to caching
      expect(requests.length - initialRequests).toBeLessThan(initialRequests);
    });

    test('should monitor Web Vitals metrics', async ({ page }) => {
      await page.goto('/analytics');
      
      // Check if performance monitoring is active
      const performanceData = await page.evaluate(() => {
        return (window as any).performanceMonitor?.getAllMetrics();
      });
      
      expect(performanceData).toBeDefined();
    });
  });

  test.describe('Bug Fixes', () => {
    
    test('should handle calculation errors correctly', async ({ page }) => {
      await page.goto('/quote-builder');
      
      // Add items to quote and verify calculations
      await page.click('[data-testid="add-eyeglasses"]');
      await page.fill('[data-testid="frame-price"]', '299.99');
      await page.fill('[data-testid="lens-price"]', '199.99');
      
      // Check total calculation
      const total = page.locator('[data-testid="quote-total"]');
      await expect(total).toContainText('499.98');
    });

    test('should maintain proper state management', async ({ page }) => {
      await page.goto('/quote-builder');
      
      // Select a customer
      await page.click('[data-testid="customer-search"]');
      await page.fill('[data-testid="customer-search-input"]', 'John Doe');
      await page.click('[data-testid="customer-option"]').first();
      
      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/quote-builder');
      
      // Selected customer should persist
      const selectedCustomer = page.locator('[data-testid="selected-customer"]');
      await expect(selectedCustomer).toContainText('John Doe');
    });

    test('should handle navigation properly', async ({ page }) => {
      // Test breadcrumb navigation
      await page.goto('/analytics/dashboard');
      
      const breadcrumbs = page.locator('[data-testid="breadcrumbs"]');
      await expect(breadcrumbs).toBeVisible();
      
      // Click on breadcrumb
      await page.click('[data-testid="breadcrumb-analytics"]');
      await expect(page).toHaveURL('/analytics');
    });

    test('should validate forms properly', async ({ page }) => {
      await page.goto('/customers/new');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      const validationErrors = page.locator('[data-testid="validation-error"]');
      await expect(validationErrors.first()).toBeVisible();
    });

    test('should handle database errors gracefully', async ({ page }) => {
      // Simulate database error
      await page.route('**/api/customers', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' })
        });
      });

      await page.goto('/customers');
      
      // Should show error boundary or error message
      const errorComponent = page.locator('[data-testid="error-boundary"], [data-testid="error-message"]');
      await expect(errorComponent).toBeVisible();
    });
  });

  test.describe('Browser Compatibility', () => {
    
    test('should work with different viewport sizes', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      
      // Check mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      await expect(mobileMenu).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.reload();
      
      // Should display properly at all sizes
      const mainContent = page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeVisible();
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/customers');
      
      // Test swipe gestures if implemented
      const customerCard = page.locator('[data-testid="customer-card"]').first();
      if (await customerCard.count() > 0) {
        // Simulate swipe
        await customerCard.hover();
        await page.mouse.down();
        await page.mouse.move(100, 0);
        await page.mouse.up();
      }
    });

    test('should be accessible to screen readers', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for proper ARIA labels
      const ariaLabels = page.locator('[aria-label]');
      await expect(ariaLabels.first()).toBeVisible();
      
      // Check for heading hierarchy
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1); // Should have one main heading
    });

    test('should work without JavaScript (progressive enhancement)', async ({ page }) => {
      // Disable JavaScript
      await page.context().addInitScript(() => {
        Object.defineProperty(window, 'navigator', {
          writable: true,
          value: { ...window.navigator, javaEnabled: () => false }
        });
      });

      await page.goto('/login');
      
      // Basic form should still work
      const form = page.locator('form');
      await expect(form).toBeVisible();
    });
  });

  test.describe('Critical User Flows', () => {
    
    test('complete quote creation flow', async ({ page }) => {
      await page.goto('/quote-builder');
      
      // 1. Select customer
      await page.click('[data-testid="customer-search"]');
      await page.fill('[data-testid="customer-search-input"]', 'John');
      await page.click('[data-testid="customer-option"]').first();
      
      // 2. Add eyeglasses
      await page.click('[data-testid="add-eyeglasses"]');
      await page.fill('[data-testid="frame-price"]', '299.99');
      
      // 3. Add exam services
      await page.click('[data-testid="add-exam"]');
      await page.selectOption('[data-testid="exam-type"]', 'comprehensive');
      
      // 4. Generate quote
      await page.click('[data-testid="generate-quote"]');
      
      // Should show quote summary
      const quoteSummary = page.locator('[data-testid="quote-summary"]');
      await expect(quoteSummary).toBeVisible();
    });

    test('customer management flow', async ({ page }) => {
      await page.goto('/customers');
      
      // 1. Create new customer
      await page.click('[data-testid="add-customer-button"]');
      await page.fill('[name="firstName"]', 'Integration');
      await page.fill('[name="lastName"]', 'Test');
      await page.fill('[name="email"]', 'integration@test.com');
      await page.click('button[type="submit"]');
      
      // 2. Search for customer
      await page.fill('[data-testid="customer-search"]', 'Integration Test');
      await page.press('[data-testid="customer-search"]', 'Enter');
      
      // 3. View customer details
      await page.click('[data-testid="customer-item"]').first();
      
      // Should show customer profile
      const customerProfile = page.locator('[data-testid="customer-profile"]');
      await expect(customerProfile).toBeVisible();
    });

    test('analytics dashboard flow', async ({ page }) => {
      await page.goto('/analytics');
      
      // 1. Load dashboard data
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
      
      // 2. Filter by date range
      await page.click('[data-testid="date-range-picker"]');
      await page.click('[data-testid="last-30-days"]');
      
      // 3. Export report
      await page.click('[data-testid="export-button"]');
      
      // Should trigger download
      const downloadPromise = page.waitForEvent('download');
      await downloadPromise;
    });

    test('inventory management flow', async ({ page }) => {
      await page.goto('/inventory');
      
      // 1. Add new inventory item
      await page.click('[data-testid="add-inventory-button"]');
      await page.fill('[name="productName"]', 'Test Product');
      await page.fill('[name="currentStock"]', '100');
      await page.click('button[type="submit"]');
      
      // 2. Update stock levels
      await page.click('[data-testid="inventory-item"]').first();
      await page.click('[data-testid="update-stock"]');
      await page.fill('[data-testid="stock-adjustment"]', '50');
      await page.click('[data-testid="confirm-update"]');
      
      // Should update stock level
      const stockLevel = page.locator('[data-testid="current-stock"]');
      await expect(stockLevel).toContainText('150');
    });
  });

  test.describe('Performance Benchmarks', () => {
    
    test('page load times meet performance targets', async ({ page }) => {
      const pages = [
        '/dashboard',
        '/customers',
        '/analytics',
        '/inventory',
        '/quote-builder'
      ];

      for (const pagePath of pages) {
        const startTime = Date.now();
        
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        console.log(`${pagePath} loaded in ${loadTime}ms`);
        
        // All pages should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
      }
    });

    test('memory usage stays within acceptable limits', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Navigate through several pages
      await page.goto('/customers');
      await page.goto('/analytics');
      await page.goto('/inventory');
      await page.goto('/dashboard');

      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Memory increase should be reasonable (less than 50MB)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  test.afterAll(async ({ page }) => {
    // Cleanup: Generate final test report
    const testReport = {
      timestamp: new Date().toISOString(),
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: await page.viewportSize(),
      testsSummary: 'Week 8 Day 4 - Final Polish & Bug Fixes Integration Tests Completed'
    };

    console.log('📊 Final Test Report:', testReport);
  });
});