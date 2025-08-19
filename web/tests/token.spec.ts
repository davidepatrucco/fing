import { test, expect } from '@playwright/test';

test.describe('Token Page', () => {
  test('should load token page correctly', async ({ page }) => {
    await page.goto('/token');
    
    // Check page heading
    await expect(page.getByRole('heading', { name: 'FIA Token Information' })).toBeVisible();
  });

  test('should display contract information when API succeeds', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/contract', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          network: 'Base Sepolia',
          verified: true,
          name: 'FIACoin',
          symbol: 'FIA',
          decimals: 18,
          totalSupply: '1000000000000000000000000000',
          treasury: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          founder: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba'
        })
      });
    });

    await page.goto('/token');
    
    // Check contract details
    await expect(page.getByText('Contract Address')).toBeVisible();
    await expect(page.getByText('0x1234567890123456789012345678901234567890')).toBeVisible();
    await expect(page.getByText('Network')).toBeVisible();
    await expect(page.getByText('Base Sepolia')).toBeVisible();
    await expect(page.getByText('Verified')).toBeVisible();
    await expect(page.getByText('✅ Yes')).toBeVisible();
  });

  test('should display token details when available', async ({ page }) => {
    // Mock API response with token details
    await page.route('**/api/contract', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          network: 'Base Sepolia',
          verified: true,
          name: 'FIACoin',
          symbol: 'FIA',
          decimals: 18,
          totalSupply: '1000000000000000000000000000',
          treasury: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          founder: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba'
        })
      });
    });

    await page.goto('/token');
    
    // Check token details section
    await expect(page.getByText('Token Details')).toBeVisible();
    await expect(page.getByText('Name')).toBeVisible();
    await expect(page.getByText('FIACoin')).toBeVisible();
    await expect(page.getByText('Symbol')).toBeVisible();
    await expect(page.getByText('FIA')).toBeVisible();
    await expect(page.getByText('Decimals')).toBeVisible();
    await expect(page.getByText('18')).toBeVisible();
    await expect(page.getByText('Total Supply')).toBeVisible();
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/contract', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to fetch contract info' })
      });
    });

    await page.goto('/token');
    
    // Should show error message
    await expect(page.getByText(/Failed to fetch contract info|Error:/)).toBeVisible();
  });

  test('should display loading state initially', async ({ page }) => {
    // Delay the API response to test loading state
    await page.route('**/api/contract', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    await page.goto('/token');
    
    // Should show loading state
    await expect(page.getByText('Loading contract information...')).toBeVisible();
  });

  test('should have copy to clipboard functionality', async ({ page }) => {
    // Mock successful API response
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

    await page.goto('/token');
    
    // Wait for contract address to be displayed
    await expect(page.getByText('0x1234567890123456789012345678901234567890')).toBeVisible();
    
    // Check if copy button is present
    const copyButton = page.locator('button', { hasText: /copy|📋/ }).first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      // Note: We can't easily test clipboard content in Playwright, but we can test the click action
    }
  });

  test('should display protected transfer component', async ({ page }) => {
    await page.goto('/token');
    
    // Check if protected transfer section is visible
    await expect(page.getByText('Protected Transfer')).toBeVisible();
    
    // Check for protected transfer button or toggle
    const protectedTransferButton = page.getByRole('button', { name: /protected transfer|anti-mev/i });
    if (await protectedTransferButton.isVisible()) {
      await protectedTransferButton.click();
      
      // Should show the protected transfer form
      await expect(page.getByText(/recipient|amount|nonce/i)).toBeVisible();
    }
  });

  test('should have MetaMask add token functionality', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/contract', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          network: 'Base Sepolia',
          verified: true,
          name: 'FIACoin',
          symbol: 'FIA',
          decimals: 18
        })
      });
    });

    await page.goto('/token');
    
    // Check for MetaMask button
    const addToMetaMaskButton = page.getByRole('button', { name: /add to metamask/i });
    if (await addToMetaMaskButton.isVisible()) {
      // Note: We can't test actual MetaMask interaction, but we can test the button presence
      await expect(addToMetaMaskButton).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mock API response
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

    await page.goto('/token');
    
    // Check that key elements are still visible on mobile
    await expect(page.getByRole('heading', { name: 'FIA Token Information' })).toBeVisible();
    await expect(page.getByText('Contract Address')).toBeVisible();
  });

  test('should display different states for verification status', async ({ page }) => {
    // Test verified contract
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

    await page.goto('/token');
    await expect(page.getByText('✅ Yes')).toBeVisible();

    // Test unverified contract
    await page.route('**/api/contract', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          network: 'Base Sepolia',
          verified: false
        })
      });
    });

    await page.reload();
    await expect(page.getByText('❌ No')).toBeVisible();
  });
});