import { test, expect } from '@playwright/test';

test.describe('Leaderboard Page', () => {
  test('should load leaderboard page correctly', async ({ page }) => {
    await page.goto('/leaderboard');
    
    // Check page elements
    await expect(page.getByRole('heading', { name: 'FIA Leaderboard' })).toBeVisible();
    await expect(page.getByText('Top fingerers and receivers')).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    await page.goto('/leaderboard');
    
    // Check filter section
    await expect(page.getByText('Filters')).toBeVisible();
    
    // Check input fields
    await expect(page.getByPlaceholder('From block (optional)')).toBeVisible();
    await expect(page.getByPlaceholder('To block (optional)')).toBeVisible();
    await expect(page.getByPlaceholder('Limit (default: 50)')).toBeVisible();
    
    // Check buttons
    await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  });

  test('should handle filter form submission', async ({ page }) => {
    await page.goto('/leaderboard');
    
    // Fill in filter values
    await page.getByPlaceholder('From block (optional)').fill('1000');
    await page.getByPlaceholder('To block (optional)').fill('2000');
    await page.getByPlaceholder('Limit (default: 50)').fill('25');
    
    // Click apply filters
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    
    // The form should maintain the values
    await expect(page.getByPlaceholder('From block (optional)')).toHaveValue('1000');
    await expect(page.getByPlaceholder('To block (optional)')).toHaveValue('2000');
    await expect(page.getByPlaceholder('Limit (default: 50)')).toHaveValue('25');
  });

  test('should validate filter inputs', async ({ page }) => {
    await page.goto('/leaderboard');
    
    // Test negative limit
    await page.getByPlaceholder('Limit (default: 50)').fill('-10');
    await page.getByRole('button', { name: 'Apply Filters' }).click();
    
    // Should not accept negative values (or reset to minimum)
    const limitValue = await page.getByPlaceholder('Limit (default: 50)').inputValue();
    expect(parseInt(limitValue) >= 1 || limitValue === '').toBe(true);
  });

  test('should display leaderboard table when data is loaded', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/leaderboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            address: '0x1234567890123456789012345678901234567890',
            given: '1000.0',
            received: '500.0'
          },
          {
            address: '0x0987654321098765432109876543210987654321',
            given: '800.0',
            received: '600.0'
          }
        ])
      });
    });

    await page.goto('/leaderboard');
    
    // Wait for data to load and check table headers
    await expect(page.getByText('Rank')).toBeVisible();
    await expect(page.getByText('Address')).toBeVisible();
    await expect(page.getByText('Given')).toBeVisible();
    await expect(page.getByText('Received')).toBeVisible();
    await expect(page.getByText('Total')).toBeVisible();
    
    // Check that data is displayed
    await expect(page.getByText('0x1234567890123456789012345678901234567890')).toBeVisible();
    await expect(page.getByText('0x0987654321098765432109876543210987654321')).toBeVisible();
  });

  test('should handle empty leaderboard data', async ({ page }) => {
    // Mock empty API response
    await page.route('**/api/leaderboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/leaderboard');
    
    // Should show empty state message
    await expect(page.getByText('No leaderboard data available')).toBeVisible();
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/leaderboard*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    await page.goto('/leaderboard');
    
    // Should show error message
    await expect(page.getByText(/Failed to fetch leaderboard|Error:/)).toBeVisible();
  });

  test('should trigger CSV export', async ({ page }) => {
    // Mock the API response with data
    await page.route('**/api/leaderboard*', async route => {
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

    await page.goto('/leaderboard');
    
    // Wait for data to load
    await expect(page.getByText('0x1234567890123456789012345678901234567890')).toBeVisible();
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.getByRole('button', { name: 'Export CSV' }).click();
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Check that download was triggered
    expect(download.suggestedFilename()).toMatch(/leaderboard.*\.csv/);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/leaderboard');
    
    // Check that key elements are still visible on mobile
    await expect(page.getByRole('heading', { name: 'FIA Leaderboard' })).toBeVisible();
    await expect(page.getByText('Filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply Filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  });
});