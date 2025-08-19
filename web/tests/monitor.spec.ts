import { test, expect } from '@playwright/test';

test.describe('Monitor Page', () => {
  test('should load monitor page correctly', async ({ page }) => {
    await page.goto('/monitor');
    
    // Check page heading
    await expect(page.getByRole('heading', { name: 'Real-time Event Monitor' })).toBeVisible();
    await expect(page.getByText('Live fingering events from the blockchain')).toBeVisible();
  });

  test('should display events when data is loaded', async ({ page }) => {
    // Mock events API response
    await page.route('**/api/events*', async route => {
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
          },
          {
            id: 2,
            blockNumber: 12346,
            txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
            from: '0x3333333333333333333333333333333333333333',
            to: '0x4444444444444444444444444444444444444444',
            amount: '2000000000000000000',
            timestamp: Date.now() / 1000 - 3600
          }
        ])
      });
    });

    await page.goto('/monitor');
    
    // Check table headers
    await expect(page.getByText('Block')).toBeVisible();
    await expect(page.getByText('Transaction')).toBeVisible();
    await expect(page.getByText('From')).toBeVisible();
    await expect(page.getByText('To')).toBeVisible();
    await expect(page.getByText('Amount')).toBeVisible();
    await expect(page.getByText('Time')).toBeVisible();
    
    // Check event data
    await expect(page.getByText('12345')).toBeVisible();
    await expect(page.getByText('12346')).toBeVisible();
    await expect(page.getByText('0x1111...1111')).toBeVisible();
    await expect(page.getByText('0x2222...2222')).toBeVisible();
    await expect(page.getByText('0x3333...3333')).toBeVisible();
    await expect(page.getByText('0x4444...4444')).toBeVisible();
  });

  test('should handle empty events list', async ({ page }) => {
    // Mock empty API response
    await page.route('**/api/events*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/monitor');
    
    // Should show empty state message
    await expect(page.getByText('No events found')).toBeVisible();
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/events*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.goto('/monitor');
    
    // Should show error message
    await expect(page.getByText(/Failed to fetch events|Error:/)).toBeVisible();
  });

  test('should display loading state initially', async ({ page }) => {
    // Delay the API response to test loading state
    await page.route('**/api/events*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/monitor');
    
    // Should show loading state
    await expect(page.getByText('Loading events...')).toBeVisible();
  });

  test('should format amounts correctly', async ({ page }) => {
    // Mock events with different amount sizes
    await page.route('**/api/events*', async route => {
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
            amount: '1000000000000000000000000', // 1M tokens
            timestamp: Date.now() / 1000
          },
          {
            id: 2,
            blockNumber: 12346,
            txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
            from: '0x3333333333333333333333333333333333333333',
            to: '0x4444444444444444444444444444444444444444',
            amount: '1000000000000000000', // 1 token
            timestamp: Date.now() / 1000
          }
        ])
      });
    });

    await page.goto('/monitor');
    
    // Should format large amounts
    await expect(page.getByText(/1\.0M|1,000K/)).toBeVisible();
    
    // Should format normal amounts
    await expect(page.getByText('1.0')).toBeVisible();
  });

  test('should format transaction hashes correctly', async ({ page }) => {
    // Mock events API response
    await page.route('**/api/events*', async route => {
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

    await page.goto('/monitor');
    
    // Should display truncated transaction hash
    await expect(page.getByText('0xabcd...7890')).toBeVisible();
  });

  test('should format timestamps correctly', async ({ page }) => {
    const now = Date.now() / 1000;
    
    // Mock events with different timestamps
    await page.route('**/api/events*', async route => {
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
            timestamp: now - 60 // 1 minute ago
          },
          {
            id: 2,
            blockNumber: 12346,
            txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
            from: '0x3333333333333333333333333333333333333333',
            to: '0x4444444444444444444444444444444444444444',
            amount: '2000000000000000000',
            timestamp: now - 3600 // 1 hour ago
          }
        ])
      });
    });

    await page.goto('/monitor');
    
    // Should show relative time
    await expect(page.getByText(/ago|min|hour/)).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mock API response
    await page.route('**/api/events*', async route => {
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

    await page.goto('/monitor');
    
    // Check that key elements are still visible on mobile
    await expect(page.getByRole('heading', { name: 'Real-time Event Monitor' })).toBeVisible();
    
    // Table should be scrollable or responsive
    await expect(page.getByText('12345')).toBeVisible();
  });

  test('should refresh data automatically', async ({ page }) => {
    let requestCount = 0;
    
    // Mock API with counter
    await page.route('**/api/events*', async route => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: requestCount,
            blockNumber: 12345 + requestCount,
            txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            from: '0x1111111111111111111111111111111111111111',
            to: '0x2222222222222222222222222222222222222222',
            amount: '1000000000000000000',
            timestamp: Date.now() / 1000
          }
        ])
      });
    });

    await page.goto('/monitor');
    
    // Wait for initial load
    await expect(page.getByText('12346')).toBeVisible();
    
    // Wait a bit more to see if automatic refresh happens
    await page.waitForTimeout(11000); // Slightly more than the 10s refresh interval
    
    // Should have made at least 2 requests (initial + refresh)
    expect(requestCount).toBeGreaterThan(1);
  });
});