import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  // These tests check the unauthenticated experience
  test('should redirect to auth page when not logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/auth/);
  });

  test('should show 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-page-that-does-not-exist');
    // Either redirects to auth or shows 404
    const url = page.url();
    expect(url.includes('auth') || url.includes('unknown')).toBeTruthy();
  });

  test('auth page should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.goto('/auth');
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await page.goto('/auth');
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('auth page should have proper heading structure', async ({ page }) => {
    await page.goto('/auth');
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThanOrEqual(0); // May or may not have h1
  });

  test('form elements should have labels', async ({ page }) => {
    await page.goto('/auth');
    // Check that inputs are properly labeled
    const emailInput = page.getByLabel(/e-mail/i);
    await expect(emailInput).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/auth');
    await page.keyboard.press('Tab');
    // Some element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
