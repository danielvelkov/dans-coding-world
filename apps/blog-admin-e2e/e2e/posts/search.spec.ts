import { generateRandomString } from '@dans-coding-world/helpers';
import type { Post, User } from '@dans-coding-world/prisma-schema';
import { POST_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { test, expect, Page } from '../fixtures/authFixture';
import postsJson from '../fixtures/posts/search-dataset.json' with { type: 'json' };

async function clearAndType(page: Page, text: string) {
  const input = page
    .locator('search')
    .getByRole('searchbox', { name: /search by/i });
  await input.clear();
  await input.fill(text);
}

async function checkIfSearchedCorrectly(
  page: Page,
  posts: Post[],
  searchTerm: string,
  user: User,
) {
  const field = 'publishedAt';
  const sorted = [...posts].sort((prev, next) => {
    const prevDate = new Date(prev[field] as Date).getTime();
    const nextDate = new Date(next[field] as Date).getTime();
    return nextDate - prevDate;
  });

  const isAdmin = user.role === 'ADMIN';
  let filtered = [];

  if (isAdmin)
    filtered = sorted.filter(
      (p) =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.content.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  else
    filtered = sorted.filter(
      (p) =>
        p.authorId === user.id &&
        (p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.content.toLowerCase().includes(searchTerm.toLowerCase())),
    );

  for (let i = 0; i < filtered.length; i++) {
    const row = page.getByLabel(new RegExp(`row entry #${i + 1}`, 'i'));
    await expect(row).toContainText(filtered[i].title);
  }
}

// TODO - authenticated users required for filter testing to work
test.describe.skip('Posts - search', () => {
  let seededPosts: Post[];
  let loggedInUser: User;

  test.beforeAll(async ({ db, users }) => {
    if (!users.current?.length)
      users.current = await db.seedUsers({
        users: null,
        options: { clearExisting: true, useDefaults: true },
      });

    const admin = users.current.find((u) => u.role === 'ADMIN');
    if (!admin) throw new Error('Missing test user');

    seededPosts = await db.seedPosts({
      posts: postsJson.map((p) => ({ ...p, authorId: admin.id })),
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPosts || !seededPosts.length) {
      throw new Error('Missing post fixtures');
    }
  });

  test('does not allow typing past a certain limit', async ({ page }) => {
    const longSearchString = generateRandomString(
      POST_CONSTRAINTS.MAX_TITLE_LENGTH + 20,
    );
    const input = page
      .locator('search')
      .getByRole('searchbox', { name: /search by/i });

    await input.fill(longSearchString);

    await expect(input).not.toHaveValue(longSearchString);
    await expect(input).toHaveValue(
      longSearchString.substring(0, POST_CONSTRAINTS.MAX_TITLE_LENGTH),
    );
  });

  test.describe('Logged in as ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      // log in as ADMIN
      await page.goto('/posts');
    });
    test('finds all posts that contain search term in title or content (case insensitive)', async ({
      page,
    }) => {
      const commonTerm = 'javascript';

      for (const searchTerm of [commonTerm, commonTerm.toUpperCase()]) {
        await clearAndType(page, searchTerm);
        // await checkIfSearchedCorrectly(
        //   page,
        //   seededPosts,
        //   commonTerm,
        //   loggedInUser,
        // );
      }
    });

    test.skip('search applies to all users posts', () => {});
    test('applies search when navigating to page through URL', async ({
      page,
    }) => {
      const searchTerm = 'guide';

      await page.goto(`/posts?searchQuery=${searchTerm}`);

      await expect(
        page.locator('search').getByRole('searchbox', { name: /search by/i }),
      ).toHaveValue(searchTerm);

      //   await checkIfSearchedCorrectly(
      //     page,
      //     seededPosts,
      //     searchTerm,
      //     loggedInUser,
      //   );
    });
  });

  test.describe('Logged in as AUTHOR/MOD', () => {
    test.beforeEach(async ({ page }) => {
      // log in as AUTHOR/MOD
      await page.goto('/posts');
    });
    test.skip("search applies to only the user's posts", () => {});
  });
});
