import type { Post, User } from '@dans-coding-world/prisma-schema';
import { test, expect } from '../fixtures/dbFixture';
import type { Page } from '../fixtures/dbFixture';
import posts from '../fixtures/posts/sorting-dataset.json' with { type: 'json' };
import {
  selectPostSorting,
  SORT_LABELS,
} from '../helpers/posts-actions.helper';
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { waitOutLoader } from '../helpers/loading.helper';

async function checkIfSortedCorrectly(
  page: Page,
  posts: Post[],
  field: 'publishedAt' | 'updatedAt',
  order: 'asc' | 'desc',
) {
  const sorted = [...posts].sort((prev, next) => {
    const prevDate = new Date(prev[field] as Date).getTime();
    const nextDate = new Date(next[field] as Date).getTime();
    return order === 'desc' ? nextDate - prevDate : prevDate - nextDate;
  });

  for (let i = 0; i < sorted.length; i++) {
    const row = page.getByLabel(new RegExp(`row entry #${i + 1}`, 'i'));
    await expect(row).toContainText(sorted[i].title);
  }
  return true;
}

test.describe('Posts - sorting', () => {
  let seededPosts: Post[] = [];
  let users: User[] = [];

  test.beforeAll(async ({ db }) => {
    const seededUsers = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    seededPosts = await db.seedPosts({
      posts,
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPosts || !seededPosts.length) {
      throw new Error('Missing post fixtures');
    }

    users = seededUsers;
  });

  test.beforeEach(async ({ page }) => {
    await loginAsRandomUser(
      page,
      users.filter((u) => u.role === 'ADMIN'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
    await page.goto('/posts');
    await waitOutLoader(page);
  });

  test('sorts posts by "Published (desc)" by default', async ({ page }) => {
    const table = page.getByRole('table');
    const sortElement = table.getByLabel(/sort by:/i);
    await expect(sortElement).toHaveValue(/desc/i);
    await expect(sortElement).toContainText(SORT_LABELS[0]);

    await checkIfSortedCorrectly(page, seededPosts, 'publishedAt', 'desc');
  });

  test.describe('post sorting', () => {
    test('sorts by Published asc', async ({ page }) => {
      await selectPostSorting(page, 'Published (asc)');
      expect(
        await checkIfSortedCorrectly(page, seededPosts, 'publishedAt', 'asc'),
      ).toBeTruthy();
    });

    test('sorts by Published desc', async ({ page }) => {
      await selectPostSorting(page, 'Published (desc)');
      expect(
        await checkIfSortedCorrectly(page, seededPosts, 'publishedAt', 'desc'),
      ).toBeTruthy();
    });

    test('sorts by Updated asc', async ({ page }) => {
      await selectPostSorting(page, 'Modified (asc)');
      expect(
        await checkIfSortedCorrectly(page, seededPosts, 'updatedAt', 'asc'),
      ).toBeTruthy();
    });

    test('sorts by Updated desc', async ({ page }) => {
      await selectPostSorting(page, 'Modified (desc)');
      expect(
        await checkIfSortedCorrectly(page, seededPosts, 'updatedAt', 'desc'),
      ).toBeTruthy();
    });
  });
});
