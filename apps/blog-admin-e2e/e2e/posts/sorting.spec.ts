import type { Post } from '@dans-coding-world/prisma-schema';
import { test, expect } from '../fixtures/authFixture';
import type { Page } from '../fixtures/authFixture';
import posts from '../fixtures/posts/sorting-dataset.json' with { type: 'json' };
import { selectPostSorting, SORT_LABELS } from '../helpers/sorting.helper';

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
}

test.describe('Posts - sorting', () => {
  let seededPosts: Post[] = [];

  test.beforeAll(async ({ db, users }) => {
    if (!users.current?.length)
      users.current = await db.seedUsers({
        users: null,
        options: { clearExisting: true, useDefaults: true },
      });

    const admin = users.current.find((u) => u.role === 'ADMIN');
    if (!admin) throw new Error('Missing test user');

    seededPosts = await db.seedPosts({
      posts: posts.map((p) => ({ ...p, authorId: admin.id })),
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPosts || !seededPosts.length) {
      throw new Error('Missing post fixtures');
    }

    // TODO - login as admin
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/posts');
  });

  test('sorts posts by "Published (desc)" by default', async ({ page }) => {
    const table = page.getByRole('table');
    const sortElement = table.getByLabel(/sort by\:/i);
    await expect(sortElement).toHaveValue(/desc/i);
    await expect(sortElement).toContainText(SORT_LABELS[0]);

    await checkIfSortedCorrectly(page, seededPosts, 'publishedAt', 'desc');
  });

  test('sorts posts correctly', async ({ page }) => {
    for (const label of SORT_LABELS) {
      let field: 'publishedAt' | 'updatedAt';
      let order: 'asc' | 'desc';

      field = label.includes('Published') ? 'publishedAt' : 'updatedAt';
      order = label.includes('desc') ? 'desc' : 'asc';

      await selectPostSorting(page, label);
      await checkIfSortedCorrectly(page, seededPosts, field, order);
    }
  });
});
