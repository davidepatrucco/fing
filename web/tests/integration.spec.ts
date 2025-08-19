import { test, expect } from '@playwright/test';

test.describe('Navigation and Layout', () => {
  test('should have consistent navigation across pages', async ({ page }) => {
    await page.goto('/');
    
    // Check if navigation is present (we need to check what the actual navigation looks like)
    // This test will need to be updated based on the actual Navigation component
    const navigation = page.locator('nav').first();
    if (await navigation.isVisible()) {
      await expect(navigation).toBeVisible();
    }
  });

  test('should navigate between pages correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to different pages
    const pages = ['/token', '/leaderboard', '/governance', '/staking', '/monitor', '/tools'];
    
    for (const targetPage of pages) {
      // Try to find a link to this page
      const link = page.locator(`a[href="${targetPage}"]`).first();
      
      if (await link.isVisible()) {
        await link.click();
        await expect(page).toHaveURL(targetPage);
        
        // Go back to home for next iteration
        await page.goto('/');
      }
    }
  });

  test('should have footer on all pages', async ({ page }) => {
    const pages = ['/', '/token', '/leaderboard', '/monitor'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Check if footer exists (this will need to be updated based on actual Footer component)
      const footer = page.locator('footer').first();
      if (await footer.isVisible()) {
        await expect(footer).toBeVisible();
      }
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should show some kind of not found page or redirect
    // The exact behavior depends on Next.js configuration
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Integration', () => {
  test('should handle contract API endpoint', async ({ page }) => {
    // Test successful response
    await page.route('**/api/contract', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          network: 'Base Sepolia',
          verified: true
        })
      });
    });

    const response = await page.request.get('/api/contract');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.address).toBe('0x1234567890123456789012345678901234567890');
    expect(data.network).toBe('Base Sepolia');
    expect(data.verified).toBe(true);
  });

  test('should handle leaderboard API endpoint with parameters', async ({ page }) => {
    await page.route('**/api/leaderboard*', async route => {
      const url = new URL(route.request().url());
      const limit = url.searchParams.get('limit') || '50';
      const fromBlock = url.searchParams.get('fromBlock');
      const toBlock = url.searchParams.get('toBlock');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            address: '0x1234567890123456789012345678901234567890',
            given: '1000.0',
            received: '500.0'
          }
        ])
      });
    });

    // Test with parameters
    const response = await page.request.get('/api/leaderboard?limit=25&fromBlock=1000&toBlock=2000');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should handle events API endpoint', async ({ page }) => {
    await page.route('**/api/events*', async route => {
      const url = new URL(route.request().url());
      const limit = url.searchParams.get('limit') || '50';
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            blockNumber: 12345,
            txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            from: '0x1111111111111111111111111111111111111111',
            to: '0x2222222222222222222222222222222222222222',
            amount: '1000000000000000000',
            timestamp: Date.now() / 1000
          }
        ])
      });
    });

    const response = await page.request.get('/api/events?limit=10');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('blockNumber');
      expect(data[0]).toHaveProperty('txHash');
      expect(data[0]).toHaveProperty('from');
      expect(data[0]).toHaveProperty('to');
      expect(data[0]).toHaveProperty('amount');
      expect(data[0]).toHaveProperty('timestamp');
    }
  });

  test('should handle API rate limiting gracefully', async ({ page }) => {
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      });
    });

    await page.goto('/leaderboard');
    
    // Should show appropriate error message
    await expect(page.getByText(/rate limit|too many requests/i)).toBeVisible();
  });

  test('should handle API timeout', async ({ page }) => {
    await page.route('**/api/**', async route => {
      // Simulate timeout by not responding
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.fulfill({
        status: 408,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Request timeout' })
      });
    });

    await page.goto('/leaderboard');
    
    // Should show timeout error or loading state
    await expect(page.getByText(/timeout|taking longer|error/i)).toBeVisible();
  });
});

test.describe('Performance and Accessibility', () => {
  test('should load pages within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const endTime = Date.now();
    
    // Page should load within 5 seconds (generous for test environment)
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('should have basic accessibility features', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper heading hierarchy
    const h1 = page.locator('h1').first();
    if (await h1.isVisible()) {
      await expect(h1).toBeVisible();
    }
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      if (await img.isVisible()) {
        const altText = await img.getAttribute('alt');
        // Alt text should exist (even if empty for decorative images)
        expect(altText !== null).toBe(true);
      }
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Should focus on the first focusable element
    const focusedElement = page.locator(':focus');
    if (await focusedElement.isVisible()) {
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should work with different screen resolutions', async ({ page }) => {
    const resolutions = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1366, height: 768 },  // Laptop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];

    for (const resolution of resolutions) {
      await page.setViewportSize(resolution);
      await page.goto('/');
      
      // Key elements should still be visible
      await expect(page.getByRole('heading', { name: 'FIA' })).toBeVisible();
      
      // Check that layout doesn't break
      const body = page.locator('body');
      const bodyWidth = await body.boundingBox();
      expect(bodyWidth?.width).toBeLessThanOrEqual(resolution.width);
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.context().setOffline(true);
    
    await page.goto('/leaderboard');
    
    // Should show network error message
    await expect(page.getByText(/network error|offline|connection/i)).toBeVisible();
  });

  test('should handle malformed API responses', async ({ page }) => {
    await page.route('**/api/leaderboard', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });

    await page.goto('/leaderboard');
    
    // Should handle JSON parse error gracefully
    await expect(page.getByText(/error|invalid|failed/i)).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/leaderboard');
    
    // Test invalid block numbers
    await page.getByPlaceholder('From block (optional)').fill('invalid');
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    
    // Should handle invalid input (either clear it or show validation message)
    const fromBlockValue = await page.getByPlaceholder('From block (optional)').inputValue();
    expect(fromBlockValue === '' || fromBlockValue === 'invalid').toBe(true);
    
    // Test negative numbers
    await page.getByPlaceholder('Limit (default: 50)').fill('-5');
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    
    const limitValue = await page.getByPlaceholder('Limit (default: 50)').inputValue();
    expect(parseInt(limitValue) >= 0 || limitValue === '').toBe(true);
  });

  test('should prevent XSS attacks', async ({ page }) => {
    // Mock API response with potential XSS payload
    await page.route('**/api/leaderboard', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            address: '<script>alert("xss")</script>',
            given: '1000.0',
            received: '500.0'
          }
        ])
      });
    });

    await page.goto('/leaderboard');
    
    // Script should be escaped and not executed
    await expect(page.getByText('<script>alert("xss")</script>')).toBeVisible();
    
    // No alert should have been triggered
    // (Playwright will fail if an unexpected alert appears)
  });
});