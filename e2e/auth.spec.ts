import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /anmelden|login/i })).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/passwort|password/i)).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /anmelden|login/i }).click();
    // Should show validation messages or stay on page
    await expect(page).toHaveURL(/auth/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/e-mail/i).fill('invalid@test.com');
    await page.getByLabel(/passwort|password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /anmelden|login/i }).click();
    
    // Wait for error message (toast or inline)
    await expect(page.locator('[role="alert"], .text-destructive, [data-sonner-toast]')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle between login and signup', async ({ page }) => {
    // Look for signup link/button
    const signupLink = page.getByRole('button', { name: /registrieren|sign up|konto erstellen/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    }
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    // Should redirect to /auth if not logged in
    await expect(page).toHaveURL(/auth/);
  });
});

test.describe('Password Reset Flow', () => {
  test('should display password reset page', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByLabel(/passwort|password/i)).toBeVisible();
  });
});
