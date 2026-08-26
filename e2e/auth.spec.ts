import { test, expect } from '@playwright/test';

test.describe('Authentication flows', () => {
  test('ADMIN login redirects to /admin', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Iniciar sesión'); // assuming link text; adjust if needed
    // Or navigate directly
    await page.goto('/login?redirect=/admin');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'adminpass');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('text=Admin Panel')).toBeVisible(); // adjust selector
  });

  test('CUSTOMER login redirects to /', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'customer@example.com');
    await page.fill('input[name="password"]', 'customerpass');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('Invalid credentials show error toast', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    // Expect toast with error message
    await expect(page.locator('[role="alert"]')).toContainText('Credenciales inválidas');
    // URL should stay on /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('CUSTOMER cannot access /admin', async ({ page }) => {
    // login as customer first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'customer@example.com');
    await page.fill('input[name="password"]', 'customerpass');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    // now try admin
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });

  test('Revoked admin session redirects to login', async ({ page }) => {
    // login as admin
    await page.goto('/login?redirect=/admin');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'adminpass');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/admin');
    // logout (assuming logout endpoint)
    await page.goto('/api/auth/logout', { method: 'POST' });
    // try admin again
    await page.goto('/admin');
    await expect(page).toHaveURL('/login');
  });
});