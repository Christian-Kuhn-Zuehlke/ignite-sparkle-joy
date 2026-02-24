import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('auth page should look correct', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Visual snapshot (will create baseline on first run)
    await expect(page).toHaveScreenshot('auth-page.png', {
      maxDiffPixels: 100, // Allow small differences
    });
  });

  test('auth page should look correct on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('auth-page-mobile.png', {
      maxDiffPixels: 100,
    });
  });
});

test.describe('Performance', () => {
  test('auth page should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have console errors on auth page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors (like failed auth requests)
    const criticalErrors = errors.filter(e => 
      !e.includes('Failed to fetch') && 
      !e.includes('401') &&
      !e.includes('PGRST')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
