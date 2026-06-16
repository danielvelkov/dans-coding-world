import { test, expect } from '@playwright/test';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';

test.describe('Posts page - loading state', () => {
  test.beforeAll(async () => {
    //TODO - login
  });
  test('shows "Loading..." message while fetching rows', async ({ page }) => {
    await page.route(`**${API_ENDPOINTS.POSTS.LIST}**`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return route.fulfill({
        json: [],
      });
    });
    await page.goto('/posts');
    await expect(page.locator('table')).toContainText(/loading posts/i);
  });
});
