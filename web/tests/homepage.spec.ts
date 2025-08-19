import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/FIA - Finger In Ass Coin/);
    
    // Check hero section
    await expect(page.getByRole('heading', { name: 'FIA' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Finger In Ass Coin' })).toBeVisible();
    
    // Check main description
    await expect(page.getByText('The ultimate meme token on Base Sepolia')).toBeVisible();
  });

  test('should display stats section correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check stats are visible
    await expect(page.getByText('1B')).toBeVisible();
    await expect(page.getByText('Total Supply')).toBeVisible();
    await expect(page.getByText('Base')).toBeVisible();
    await expect(page.getByText('Network (Sepolia)')).toBeVisible();
    await expect(page.getByText('1%')).toBeVisible();
    await expect(page.getByText('Transaction Fee')).toBeVisible();
    await expect(page.getByText('Live')).toBeVisible();
    await expect(page.getByText('Event Monitor')).toBeVisible();
  });

  test('should display features section correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check features heading
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();
    
    // Check feature cards
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Real-time Monitor' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Developer Tools' })).toBeVisible();
    
    // Check feature descriptions
    await expect(page.getByText('Track the biggest fingerers and receivers')).toBeVisible();
    await expect(page.getByText('Watch fingering events happen live')).toBeVisible();
    await expect(page.getByText('Deploy your own instance, run airdrops')).toBeVisible();
  });

  test('should navigate to token page from CTA button', async ({ page }) => {
    await page.goto('/');
    
    // Click "View Token Details" button
    await page.getByRole('link', { name: 'View Token Details' }).click();
    
    // Should navigate to token page
    await expect(page).toHaveURL('/token');
  });

  test('should navigate to leaderboard from CTA button', async ({ page }) => {
    await page.goto('/');
    
    // Click "See Leaderboard" button
    await page.getByRole('link', { name: 'See Leaderboard' }).click();
    
    // Should navigate to leaderboard page
    await expect(page).toHaveURL('/leaderboard');
  });

  test('should navigate to pages from feature cards', async ({ page }) => {
    await page.goto('/');
    
    // Test leaderboard feature card link
    await page.getByRole('link', { name: 'View Rankings →' }).click();
    await expect(page).toHaveURL('/leaderboard');
    
    // Go back and test monitor feature card link
    await page.goto('/');
    await page.getByRole('link', { name: 'Live Feed →' }).click();
    await expect(page).toHaveURL('/monitor');
    
    // Go back and test tools feature card link
    await page.goto('/');
    await page.getByRole('link', { name: 'Explore Tools →' }).click();
    await expect(page).toHaveURL('/tools');
  });

  test('should have recent events section', async ({ page }) => {
    await page.goto('/');
    
    // Check recent events section
    await expect(page.getByRole('heading', { name: 'Recent Fingering Activity' })).toBeVisible();
    await expect(page.getByText('Live events from the blockchain will appear here')).toBeVisible();
    
    // Check watch live events button
    const watchLiveButton = page.getByRole('link', { name: 'Watch Live Events' });
    await expect(watchLiveButton).toBeVisible();
    
    // Test navigation
    await watchLiveButton.click();
    await expect(page).toHaveURL('/monitor');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that key elements are still visible on mobile
    await expect(page.getByRole('heading', { name: 'FIA' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Finger In Ass Coin' })).toBeVisible();
    await expect(page.getByText('The ultimate meme token on Base Sepolia')).toBeVisible();
    
    // Check that buttons are still accessible
    await expect(page.getByRole('link', { name: 'View Token Details' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'See Leaderboard' })).toBeVisible();
  });
});