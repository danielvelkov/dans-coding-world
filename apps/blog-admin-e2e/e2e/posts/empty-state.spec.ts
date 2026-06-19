import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { test, expect } from '@playwright/test';
test.describe('Posts page - empty state', () => {
  test.beforeAll(async () => {
    //TODO - login
  });
  test('shows call to action message when no table rows', async ({ page }) => {
    await page.route(`**${API_ENDPOINTS.POSTS.LIST}**`, (route) =>
      route.fulfill({
        json: generateMockPostsResponse({
          length: 0,
          pageSize: 10,
        }),
      }),
    );

    await page.goto('/posts');
    await expect(page.locator('table')).toContainText(/no posts/i);
  });
});
