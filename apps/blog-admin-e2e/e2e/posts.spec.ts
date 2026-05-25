import { test, expect } from '@playwright/test';

test.describe('Posts page', () => {
  test.skip('should redirect to login page if not logged in', async ({
    page,
  }) => {
    await page.goto('/posts');
    expect(page.url()).toMatch(/\/login$/);
  });

  test.describe('Authenticated User - general', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/posts');
    });

    test('contains "Posts" heading', async ({ page }) => {
      // Expect h2 to contain a substring.
      expect(await page.locator('h2').innerText()).toContain('Posts');
    });
  });
});
