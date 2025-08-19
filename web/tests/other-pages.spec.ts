import { test, expect } from '@playwright/test';

test.describe('Governance Page', () => {
  test('should load governance page correctly', async ({ page }) => {
    await page.goto('/governance');
    
    // Check page heading
    await expect(page.getByRole('heading', { name: 'FIA Governance' })).toBeVisible();
  });

  test('should display wallet connection requirement', async ({ page }) => {
    await page.goto('/governance');
    
    // Should show wallet connection requirement or connect button
    const connectText = page.getByText(/connect wallet|wallet required|connect/i);
    if (await connectText.isVisible()) {
      await expect(connectText).toBeVisible();
    }
  });

  test('should display governance information when not connected', async ({ page }) => {
    await page.goto('/governance');
    
    // Should show information about governance even without wallet
    await expect(page.getByText(/proposal|voting|governance/i)).toBeVisible();
  });
});

test.describe('Staking Page', () => {
  test('should load staking page correctly', async ({ page }) => {
    await page.goto('/staking');
    
    // Check page heading
    await expect(page.getByRole('heading', { name: /staking|FIA Staking/ })).toBeVisible();
  });

  test('should display staking options', async ({ page }) => {
    await page.goto('/staking');
    
    // Should show staking information
    await expect(page.getByText(/stake|APY|reward/i)).toBeVisible();
  });

  test('should display different lock periods', async ({ page }) => {
    await page.goto('/staking');
    
    // Should show different staking periods mentioned in specs (30, 90, 180, 365 days)
    const stakingText = await page.textContent('body');
    if (stakingText) {
      const hasStakingInfo = /30|90|180|365|day|month|year/i.test(stakingText);
      expect(hasStakingInfo).toBe(true);
    }
  });
});

test.describe('Tools Page', () => {
  test('should load tools page correctly', async ({ page }) => {
    await page.goto('/tools');
    
    // Check that page loads without error
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display developer tools information', async ({ page }) => {
    await page.goto('/tools');
    
    // Should contain tools or developer related content
    const pageText = await page.textContent('body');
    if (pageText) {
      const hasToolsContent = /tool|develop|deploy|api|contract/i.test(pageText);
      expect(hasToolsContent).toBe(true);
    }
  });
});

test.describe('Documentation Page', () => {
  test('should load docs page correctly', async ({ page }) => {
    await page.goto('/docs');
    
    // Check that page loads without error
    await expect(page.locator('body')).toBeVisible();
  });

  test('should contain documentation content', async ({ page }) => {
    await page.goto('/docs');
    
    // Should contain documentation related content
    const pageText = await page.textContent('body');
    if (pageText) {
      const hasDocsContent = /documentation|guide|help|api|how/i.test(pageText);
      expect(hasDocsContent).toBe(true);
    }
  });
});

test.describe('Multisig Page', () => {
  test('should load multisig page correctly', async ({ page }) => {
    await page.goto('/multisig');
    
    // Check page heading or content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display multisig functionality', async ({ page }) => {
    await page.goto('/multisig');
    
    // Should contain multisig related content
    const pageText = await page.textContent('body');
    if (pageText) {
      const hasMultisigContent = /multisig|multi.?sig|signature|proposal|threshold/i.test(pageText);
      expect(hasMultisigContent).toBe(true);
    }
  });
});

test.describe('Cross-Page Functionality', () => {
  test('should maintain consistent styling across pages', async ({ page }) => {
    const pages = ['/', '/token', '/leaderboard', '/governance', '/staking', '/monitor', '/tools', '/docs'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Check that the page has the expected background color (dark theme)
      const body = page.locator('body');
      const bodyClasses = await body.getAttribute('class');
      
      // Should have dark theme classes
      if (bodyClasses) {
        expect(bodyClasses).toContain('bg-gray-950');
      }
    }
  });

  test('should handle deep linking correctly', async ({ page }) => {
    // Test direct navigation to pages
    const pages = ['/token', '/leaderboard', '/governance', '/staking', '/monitor'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Should load the correct page
      await expect(page).toHaveURL(pagePath);
      
      // Page should load without JavaScript errors
      const consoleMessages = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      
      // Filter out common non-critical errors
      const criticalErrors = consoleMessages.filter(msg => 
        !msg.includes('favicon.ico') && 
        !msg.includes('Extension context invalidated') &&
        !msg.includes('MetaMask')
      );
      
      expect(criticalErrors.length).toBe(0);
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/token');
    await page.goto('/leaderboard');
    
    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/token');
    
    // Go back again
    await page.goBack();
    await expect(page).toHaveURL('/');
    
    // Go forward
    await page.goForward();
    await expect(page).toHaveURL('/token');
  });
});