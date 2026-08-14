/* eslint-disable playwright/no-conditional-in-test */
import type { Post, User } from '@dans-coding-world/prisma-schema';
import { formatDateTo_DD_MM_YYYY } from '@dans-coding-world/helpers';
import { ERROR_CODES, PAGINATION } from '@dans-coding-world/shared-constants';
import { test, expect, type Page } from '../fixtures/dbFixture';
// TODO: just change to post generators
import postsJson from '../fixtures/posts/filters-dataset.json' with { type: 'json' };
import {
  checkIfLoggedIn,
  login,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { waitOutLoader } from '../helpers/loading.helper';
import { expandPostRow, getPostRow } from '../helpers/posts-actions.helper';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/api-exceptions';

const blogURL = process.env['VITE_PUBLIC_BLOG_URL'];

function getVisiblePostsForUser(
  posts: Post[],
  user: User,
  limit = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
) {
  return [...posts]
    .filter((p) => user.role === 'ADMIN' || p.authorId === user.id)
    .sort(
      (a, b) =>
        new Date(b.publishedAt as Date).getTime() -
        new Date(a.publishedAt as Date).getTime(),
    )
    .slice(0, limit);
}

async function assertRowContainsPostInfo(
  page: Page,
  post: Post,
  rowIndex: number,
  users: User[],
  isAdmin: boolean,
) {
  const row = getPostRow(page, rowIndex);
  const author = users.find((u) => u.id === post.authorId);

  await expect(row).toContainText(post.title);
  await expect(row).toContainText(post.status.toUpperCase());

  if (post.visibility === 'MEMBERS_ONLY') {
    await expect(row).toContainText('Members-only');
  }

  if (post.publishedAt) {
    await expect(row).toContainText(
      formatDateTo_DD_MM_YYYY(new Date(post.publishedAt)),
    );
  } else {
    await expect(row).toContainText('Not published');
  }

  const isRecentlyUpdated =
    new Date(post.createdAt).getTime() !== new Date(post.updatedAt).getTime();
  if (isRecentlyUpdated) {
    await expect(row).toContainText(
      `Updated: ${formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}`,
    );
  }

  if (isAdmin && author) {
    await expect(
      row.getByRole('link', { name: author.username }),
    ).toHaveAttribute('href', `/users?searchQuery=${author.username}`);
  }
  return true;
}

test.describe('Posts page - posts table', () => {
  let users: User[] = [];
  let seededPosts: Post[] = [];

  test.beforeAll(async ({ db }) => {
    users = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    seededPosts = await db.seedPosts({
      posts: postsJson,
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPosts.length) {
      throw new Error('Missing post fixtures');
    }
  });

  test('shows 401 UNAUTHORIZED when not logged in', async ({ page }) => {
    await page.goto('/posts');
    await expect(page.getByText(/401/i)).toBeVisible();
    await expect(page.getByText(/authentication required/i)).toBeVisible();
  });

  test.describe('Authenticated AUTHOR/MOD', () => {
    let loggedInUser: User;

    test.beforeEach(async ({ page }) => {
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'AUTHOR'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/posts');
      await waitOutLoader(page);
    });

    test('contains "Your Posts" heading', async ({ page }) => {
      await expect(page.locator('h2')).toContainText('Your Posts');
    });

    test('each row contains main information about post', async ({ page }) => {
      const visiblePosts = getVisiblePostsForUser(seededPosts, loggedInUser);

      for (let i = 0; i < visiblePosts.length; i++) {
        expect(
          await assertRowContainsPostInfo(
            page,
            visiblePosts[i],
            i,
            users,
            false,
          ),
        ).toBe(true);
      }
    });

    test('clicking "expand row" shows details about row', async ({ page }) => {
      const visiblePosts = getVisiblePostsForUser(seededPosts, loggedInUser);
      const post = visiblePosts[0];

      await expandPostRow(page, 0);

      const expandedRow = page.getByTestId(`row-details-${post.id}`);
      await expect(
        expandedRow.getByRole('heading', { name: /post details/i }),
      ).toBeVisible();
      await expect(
        expandedRow.getByText(new RegExp(`^ID: ${post.id}`, 'i')),
      ).toBeVisible();
      await expect(expandedRow.getByText(post.content)).toBeVisible();
    });

    test(`expanded row details contains "View post" link which 
      opens a new tab with the post in the public blog`, async ({ page }) => {
      const visiblePosts = getVisiblePostsForUser(seededPosts, loggedInUser);
      const post = visiblePosts[0];

      await expandPostRow(page, 0);

      const expandedRow = page.getByTestId(`row-details-${post.id}`);
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        expandedRow.getByRole('link', { name: /view.*post/i }).click(),
      ]);

      await popup.waitForLoadState('domcontentloaded');
      expect(popup.url()).toBe(`${blogURL}/blog/${post.id}`);
    });

    test(`selecting "Edit" link in "Actions" column navigates to post's edit page`, async ({
      page,
    }) => {
      const visiblePosts = getVisiblePostsForUser(seededPosts, loggedInUser);
      const post = visiblePosts[0];

      await getPostRow(page, 0).getByRole('link', { name: /edit/i }).click();
      await expect(page).toHaveURL(new RegExp(`/posts/${post.id}/edit$`));
    });

    test.describe('Post deletion', () => {
      test.afterAll(async ({ db }) => {
        seededPosts = await db.seedPosts({
          posts: postsJson,
          options: { useDefaults: false, clearExisting: true },
        });
      });
      test(`deleting a post optimistically removes it but on failure to delete,
      it shows error and returns post to results`, async ({ page }) => {
        test.slow();
        const visiblePosts = getVisiblePostsForUser(seededPosts, loggedInUser);
        const post = visiblePosts[0];
        const errorMessage = 'Failed to delete post';
        await page.route(
          `**${API_ENDPOINTS.POSTS.BY_ID(post.id)}**`,
          async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await route.fulfill({
              status: 404,
              json: generateErrorResponseByErrorCode(
                ERROR_CODES.SERVER.NOT_FOUND,
                undefined,
                errorMessage,
              ),
            });
          },
        );

        await getPostRow(page, 0)
          .getByRole('button', { name: /delete post/i })
          .click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        await dialog.getByRole('button', { name: /delete post/i }).click();
        await expect(
          getPostRow(page, 0).getByText(post.title),
        ).not.toBeInViewport();

        const error = page.getByTestId('deletion-error-message');
        await error.waitFor({ state: 'visible', timeout: 30000 });

        await expect(error.getByText(errorMessage)).toBeInViewport();
        await expect(page.getByText(post.title)).toBeInViewport();
      });

      test(`clicking "Delete" for a row opens a confirmation dialog, 
      which on confirming successfully removes post`, async ({ page }) => {
        const visiblePosts = getVisiblePostsForUser(seededPosts, loggedInUser);
        const post = visiblePosts[0];

        await getPostRow(page, 0)
          .getByRole('button', { name: /delete post/i })
          .click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        await dialog.getByRole('button', { name: /delete post/i }).click();
        await expect(page.getByText(post.title)).not.toBeInViewport();
      });
    });

    test('does not contain "Author" column or "filter by user" combobox', async ({
      page,
    }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Author' }),
      ).toBeHidden();
      await expect(
        page.getByRole('searchbox', { name: 'Search for:' }),
      ).not.toBeInViewport();
    });
  });

  test.describe('Authenticated ADMIN', () => {
    let loggedInUser: User;

    test.beforeEach(async ({ page }) => {
      loggedInUser = await loginAsRandomUser(
        page,
        users.filter((u) => u.role === 'ADMIN'),
      );
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/posts');
      await waitOutLoader(page);
    });

    test('contains "All Posts" heading', async ({ page }) => {
      await expect(page.locator('h2')).toContainText('All Posts');
    });

    test('contains additional "Author" column', async ({ page }) => {
      await expect(
        page.getByRole('columnheader', { name: 'Author' }),
      ).toBeVisible();
    });

    test(`clicking the link inside row's "Author" column
       navigates to /users?searchQuery={username}`, async ({ page }) => {
      const visiblePosts = getVisiblePostsForUser(seededPosts, loggedInUser);
      const post = visiblePosts[0];
      const author = users.find((u) => u.id === post.authorId);
      if (!author) throw new Error('Post author not found in seeded users');

      await getPostRow(page, 0)
        .getByRole('link', { name: author.username })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/users\\?searchQuery=${author.username}`),
      );
    });

    test.describe('Post details', () => {
      test("shows post content preview of posts that are not the admin's", async ({
        page,
      }) => {
        const otherAuthorPost = seededPosts.find(
          (p) => p.authorId !== loggedInUser.id,
        );
        if (!otherAuthorPost) {
          throw new Error('Missing post authored by another user');
        }

        const visiblePosts = getVisiblePostsForUser(seededPosts, loggedInUser);
        const rowIndex = visiblePosts.findIndex(
          (p) => p.id === otherAuthorPost.id,
        );
        if (rowIndex === -1) {
          throw new Error('Other-author post not visible on first page');
        }

        await expandPostRow(page, rowIndex);

        const expandedRow = page.getByTestId(
          `row-details-${otherAuthorPost.id}`,
        );
        await expect(
          expandedRow.getByRole('heading', { name: /content preview/i }),
        ).toBeVisible();
        await expect(
          expandedRow.getByText(otherAuthorPost.content),
        ).toBeVisible();
      });
    });
  });

  test.describe('Logged in as User', () => {
    test.beforeEach(async ({ page }) => {
      const user = users.find((u) => u.role === 'USER');
      if (!user) throw new Error('Missing fixture');
      await page.goto('/login');
      await login(page, user.email, user.password);
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('shows 403 FORBIDDEN when trying to navigate to page', async ({
      page,
    }) => {
      await page.goto('/posts');
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(page.getByText(/access denied/i)).toBeVisible();
    });
  });
});
