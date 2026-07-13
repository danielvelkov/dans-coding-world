import { generateRandomString } from '@dans-coding-world/helpers';
import type {
  Post,
  PostStatus,
  User,
  PostVisibility,
} from '@dans-coding-world/prisma-schema';
import { POST_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { test, expect, Page } from '../fixtures/dbFixture';
import postsJson from '../fixtures/posts/search-dataset.json' with { type: 'json' };
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { waitOutLoader } from '../helpers/loading.helper';
import {
  searchForPost,
  selectPostFilter,
} from '../helpers/posts-actions.helper';

async function checkIfSearchedCorrectly(
  page: Page,
  posts: Post[],
  searchTerm: string,
  user: User,
  statusFilters: PostStatus[] = ['PUBLISHED', 'ARCHIVED', 'DRAFT'],
  visibilityFilters: PostVisibility[] = ['MEMBERS_ONLY', 'PUBLIC'],
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

  filtered = filtered.filter(
    (p) =>
      statusFilters.includes(p.status) ||
      visibilityFilters.includes(p.visibility),
  );

  try {
    for (let i = 0; i < filtered.length; i++) {
      const row = page.getByLabel(new RegExp(`row entry #${i + 1}`, 'i'));
      await expect(row).toContainText(filtered[i].title);
    }
    return true;
  } catch (error) {
    return false;
  }
}

test.describe('Posts - search', () => {
  let seededPosts: Post[];
  let users: User[];
  let loggedInUser: User;

  test.beforeAll(async ({ db }) => {
    const seededUsers = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    const admin = seededUsers.find((u) => u.role === 'ADMIN');
    if (!admin) throw new Error('Missing test user');

    users = seededUsers;

    seededPosts = await db.seedPosts({
      posts: postsJson,
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPosts || !seededPosts.length) {
      throw new Error('Missing post fixtures');
    }
  });

  test.describe('Input element', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsRandomUser(
        page,
        users.filter((u) => u.role !== 'USER'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/posts');
      await waitOutLoader(page);
    });

    test('does not allow typing past a certain limit', async ({ page }) => {
      const longSearchString = generateRandomString(
        POST_CONSTRAINTS.MAX_TITLE_LENGTH + 20,
      );
      const input = page
        .locator('search')
        .getByRole('textbox', { name: /search by/i });

      await input.fill(longSearchString);

      await expect(input).not.toHaveValue(longSearchString);
      await expect(input).toHaveValue(
        longSearchString.substring(0, POST_CONSTRAINTS.MAX_TITLE_LENGTH),
      );
    });
  });

  test.describe('Logged in as ADMIN', () => {
    test.beforeEach(async ({ page }) => {
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'ADMIN'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/posts');
    });

    test('finds all posts that contain search term in title or content (case insensitive)', async ({
      page,
    }) => {
      test.slow();
      const commonTerm = 'javascript';

      for (const searchTerm of [commonTerm, commonTerm.toUpperCase()]) {
        await searchForPost(page, searchTerm);
        expect(
          await checkIfSearchedCorrectly(
            page,
            seededPosts,
            commonTerm,
            loggedInUser,
          ),
        ).toBe(true);
      }
    });

    test('applies search when navigating to page through URL', async ({
      page,
    }) => {
      const searchTerm = 'guide';

      await page.goto(`/posts?searchQuery=${searchTerm}`);

      await page.waitForLoadState();

      await expect(
        page.locator('search').getByRole('textbox', { name: /search by/i }),
      ).toHaveValue(searchTerm);

      expect(
        await checkIfSearchedCorrectly(
          page,
          seededPosts,
          searchTerm,
          loggedInUser,
        ),
      ).toBe(true);
    });
  });

  test.describe('Logged in as AUTHOR', () => {
    test.beforeEach(async ({ page }) => {
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'AUTHOR'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test("search applies only to the user's posts", async ({ page }) => {
      const searchTerm = 'the';

      await page.goto(`/posts?searchQuery=${searchTerm}`);

      await page.waitForLoadState();

      await expect(
        page.locator('search').getByRole('textbox', { name: /search by/i }),
      ).toHaveValue(searchTerm);

      expect(
        await checkIfSearchedCorrectly(
          page,
          seededPosts.filter((p) => p.authorId === loggedInUser.id),
          searchTerm,
          loggedInUser,
        ),
      ).toBe(true);
    });

    test(`does not leak other users' draft posts when searching 
      and filtering by DRAFT post status`, async ({ page }) => {
      test.slow();
      const commonSearchTerm = 'part';
      const postsWithSearchTerm = seededPosts.filter((p) =>
        p.title.toLowerCase().includes(commonSearchTerm),
      );
      const uniqueAuthorIds = new Set(
        postsWithSearchTerm.map((p) => p.authorId),
      );
      expect([...uniqueAuthorIds].length).toBeGreaterThan(1);

      const privatePostsByOtherAuthors = postsWithSearchTerm.filter(
        (p) => p.status === 'DRAFT' && p.authorId !== loggedInUser.id,
      );
      expect(privatePostsByOtherAuthors.length).toBeGreaterThan(0);

      await selectPostFilter(page, ['Draft', 'Public', 'Members-only']);
      await searchForPost(page, commonSearchTerm);
      expect(
        await checkIfSearchedCorrectly(
          page,
          postsWithSearchTerm,
          commonSearchTerm,
          loggedInUser,
        ),
      ).toBe(true);
      for (const unexpected of postsWithSearchTerm.filter(
        (p) => p.authorId !== loggedInUser.id,
      )) {
        await expect(page.getByText(unexpected.title)).not.toBeInViewport();
      }
    });
  });
});
