/* eslint-disable playwright/expect-expect */
/* eslint-disable playwright/no-conditional-expect */
/* eslint-disable playwright/no-conditional-in-test */
import type {
  Post,
  PostStatus,
  PostVisibility,
  User,
} from '@dans-coding-world/prisma-schema';
import {
  PostStatusEnum,
  PostVisibilityEnum,
} from '@dans-coding-world/prisma-schema';
import { test, expect } from '../fixtures/dbFixture';
import type { Page } from '../fixtures/dbFixture';
import postsJson from '../fixtures/posts/filters-dataset.json' with { type: 'json' };
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { randomSelect } from '@dans-coding-world/helpers';
import { selectPostFilter } from '../helpers/posts-actions.helper';
import { waitOutLoader } from '../helpers/loading.helper';
import { generateMockUsersResponse } from '@dans-coding-world/shared-user-testing';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { sortObjectsByStringProp } from '@dans-coding-world/helpers';
import {
  goToPage,
  selectRowEntriesPerPage,
} from '../helpers/pagination.helper';

const STATUSES = Object.values(PostStatusEnum);
const VISIBILITIES = Object.values(PostVisibilityEnum);

async function assertFilteredCorrectly(
  page: Page,
  posts: Post[],
  user: User,
  statusFilter: PostStatus[],
  visibilityFilter: PostVisibility[],
) {
  const isAdmin = user.role === 'ADMIN';

  const filtered = [...posts]
    .sort((a, b) => {
      return (
        new Date(b.publishedAt as Date).getTime() -
        new Date(a.publishedAt as Date).getTime()
      );
    })
    .filter(
      (p) =>
        (isAdmin || p.authorId === user.id) &&
        statusFilter.includes(p.status) &&
        visibilityFilter.includes(p.visibility),
    );

  const numOfItemsToCheck = Math.min(
    filtered.length,
    PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
  );

  for (let i = 0; i < numOfItemsToCheck; i++) {
    const row = page.getByLabel(new RegExp(`row entry #${i + 1}$`, 'i'));
    await expect(row).toContainText(filtered[i].title);
  }
}

/** Randomly picks at least one value from each category. */
function buildRandomFilters<T>(values: T[]): T[] {
  const picked = values.filter(() => Math.random() > 0.3);
  return picked.length ? picked : [values[0]];
}

test.describe('Posts - filtering', () => {
  let users: User[] = [];
  let seededPosts: Post[] = [];
  let loggedInUser: User;

  test.beforeAll(async ({ db }) => {
    users = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    if (!users.find((u) => u.role === 'ADMIN')) {
      throw new Error('Missing ADMIN user in seed data');
    }

    seededPosts = await db.seedPosts({
      posts: postsJson,
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPosts.length) {
      throw new Error('Missing post fixtures');
    }
  });

  test.describe('by Status/Visibility', () => {
    test.describe('Logged in as ADMIN', () => {
      test.beforeEach(async ({ page }) => {
        loggedInUser = await loginAsRandomUser(
          page,
          users.filter((u) => u.role === 'ADMIN'),
        );
        expect(await checkIfLoggedIn(page)).toBe(true);
        await page.goto('/posts');
        await waitOutLoader(page);
      });

      test('all status/visibility filters are selected by default', async ({
        page,
      }) => {
        const options = await page
          .getByLabel(/filter by:/i)
          .getByRole('option')
          .all();

        for (const option of options) {
          await expect(option).toHaveAttribute('selected');
        }

        await assertFilteredCorrectly(
          page,
          seededPosts,
          loggedInUser,
          STATUSES,
          VISIBILITIES,
        );
      });

      for (const [categoryName, categoryOptions] of [
        ['Status', STATUSES],
        ['Visibility', VISIBILITIES],
      ] as const) {
        test(`disables the last remaining option in category: ${categoryName}`, async ({
          page,
        }) => {
          test.slow();

          for (const optionValue of categoryOptions) {
            await selectPostFilter(page, [optionValue]);

            const options = await page
              .getByLabel(/filter by:/i)
              .getByRole('option')
              .all();

            for (const option of options) {
              const value = await option.getAttribute('value');
              if (value === optionValue) {
                await expect(option).toHaveAttribute('disabled');
              } else {
                await expect(option).not.toHaveAttribute('disabled');
              }
            }
          }
        });
      }

      test('selecting a STATUS option deselects other STATUS options', async ({
        page,
      }) => {
        test.slow();

        for (const status of STATUSES) {
          await selectPostFilter(page, [status]);

          const options = await page
            .getByLabel(/filter by:/i)
            .getByRole('option')
            .all();

          for (const option of options) {
            const value = await option.getAttribute('value');
            const shouldBeSelected =
              value === status || !STATUSES.includes(value as PostStatus);

            if (shouldBeSelected) {
              await expect(option).toHaveAttribute('selected');
            } else {
              await expect(option).not.toHaveAttribute('selected');
            }
          }
        }
      });

      test('selecting a VISIBILITY option deselects other VISIBILITY options', async ({
        page,
      }) => {
        test.slow();

        for (const visibility of VISIBILITIES) {
          await selectPostFilter(page, [visibility]);

          const options = await page
            .getByLabel(/filter by:/i)
            .getByRole('option')
            .all();

          for (const option of options) {
            const value = await option.getAttribute('value');
            const shouldBeSelected =
              value === visibility ||
              !VISIBILITIES.includes(value as PostVisibility);

            if (shouldBeSelected) {
              await expect(option).toHaveAttribute('selected');
            } else {
              await expect(option).not.toHaveAttribute('selected');
            }
          }
        }
      });

      test('filters posts correctly with a random combination of statuses and visibilities', async ({
        page,
      }) => {
        test.slow();

        const statusFilter = buildRandomFilters(STATUSES) as PostStatus[];
        const visibilityFilter = buildRandomFilters(
          VISIBILITIES,
        ) as PostVisibility[];

        await selectPostFilter(page, [...statusFilter, ...visibilityFilter]);

        await assertFilteredCorrectly(
          page,
          seededPosts,
          loggedInUser,
          statusFilter,
          visibilityFilter,
        );
      });

      test('ADMIN sees DRAFT/ARCHIVED posts authored by other users', async ({
        page,
      }) => {
        await selectPostFilter(page, [
          PostStatusEnum.DRAFT,
          PostStatusEnum.ARCHIVED,
        ]);

        const otherAuthorArchivedPosts = seededPosts.filter(
          (p) =>
            p.authorId !== loggedInUser.id &&
            (p.status === PostStatusEnum.DRAFT ||
              p.status === PostStatusEnum.ARCHIVED),
        );
        expect(otherAuthorArchivedPosts.length).toBeGreaterThan(0);

        await expect(
          page.getByText(otherAuthorArchivedPosts[0].title),
        ).toBeInViewport();
      });

      test('will reset to first page on selecting post filter', async ({
        page,
      }) => {
        expect(seededPosts.length).toBeGreaterThan(
          PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
        );
        await goToPage(page, 2);
        await expect(page).toHaveURL(
          new RegExp(`pageOffset=${PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE}`),
        );
        await selectPostFilter(page, ['DRAFT']);
        await waitOutLoader(page);
        await expect(page).not.toHaveURL(
          new RegExp(`pageOffset=${PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE}`),
        );
        const expectedPosts = seededPosts
          .filter((p) => p.status === 'DRAFT')
          .slice(0, PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE);
        await assertFilteredCorrectly(
          page,
          expectedPosts,
          loggedInUser,
          ['DRAFT'],
          VISIBILITIES,
        );
      });
    });

    test.describe('Logged in as AUTHOR/MOD', () => {
      test.beforeEach(async ({ page }) => {
        loggedInUser = await loginAsRandomUser(
          page,
          users.filter((u) => u.role === 'AUTHOR'),
        );
        expect(await checkIfLoggedIn(page)).toBe(true);
        await page.goto('/posts');
        await waitOutLoader(page);
      });

      test("filters only the logged-in user's posts", async ({ page }) => {
        test.slow();

        const statusFilter = buildRandomFilters(STATUSES) as PostStatus[];
        const visibilityFilter = buildRandomFilters(
          VISIBILITIES,
        ) as PostVisibility[];

        await selectPostFilter(page, [...statusFilter, ...visibilityFilter]);

        await assertFilteredCorrectly(
          page,
          seededPosts,
          loggedInUser,
          statusFilter,
          visibilityFilter,
        );
      });

      test('does not show DRAFT/ARCHIVED posts authored by other users', async ({
        page,
      }) => {
        await selectPostFilter(page, [
          PostStatusEnum.DRAFT,
          PostStatusEnum.ARCHIVED,
        ]);

        const otherAuthorArchivedPosts = seededPosts.filter(
          (p) =>
            p.authorId !== loggedInUser.id &&
            p.status === PostStatusEnum.ARCHIVED,
        );
        expect(otherAuthorArchivedPosts.length).toBeGreaterThan(0);

        for (const hiddenPost of otherAuthorArchivedPosts)
          await expect(page.getByText(hiddenPost.title)).not.toBeInViewport();
      });
    });
  });

  test.describe('by User (Author filter)', () => {
    test.describe('Logged in as AUTHOR/MOD', () => {
      test.beforeEach(async ({ page }) => {
        loggedInUser = await loginAsRandomUser(
          page,
          users.filter((u) => u.role === 'AUTHOR'),
        );
        expect(await checkIfLoggedIn(page)).toBe(true);
        await page.reload();
      });

      test('author search box is not shown to non-admin users', async ({
        page,
      }) => {
        await expect(
          page.getByRole('searchbox', { name: 'Search for:' }),
        ).not.toBeInViewport();
      });

      test("URL-injected userId filter does not leak another user's private posts", async ({
        page,
      }) => {
        const admin = users.find((u) => u.role === 'ADMIN');
        if (!admin) throw new Error('Missing ADMIN user');

        const adminPrivatePosts = seededPosts.filter(
          (p) =>
            p.authorId === admin.id &&
            (p.status === PostStatusEnum.DRAFT ||
              p.status === PostStatusEnum.ARCHIVED),
        );
        expect(adminPrivatePosts.length).toBeGreaterThan(0);

        await page.goto(
          `/posts?filterBy[status][0]=DRAFT&filterBy[userId]=${admin.id}`,
        );
        await waitOutLoader(page, 'Loading.*posts');

        for (const post of adminPrivatePosts) {
          await expect(page.getByText(post.title)).not.toBeInViewport();
        }
      });
    });

    test.describe('Logged in as ADMIN', () => {
      let seededUsersWithNewAdditions: User[] = [];

      test.beforeAll(async ({ db }) => {
        const mockUsersResponse = generateMockUsersResponse({
          length: PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE + 5,
        });
        if (!mockUsersResponse.data?.items.length) {
          throw new Error('Missing user fixtures');
        }

        const mockUsers = mockUsersResponse.data.items;
        const extraUsers = await db.seedUsers({
          users: mockUsers.map((u, i) => ({
            ...u,
            id: users.length + 10 + i,
          })),
          options: { clearExisting: false, useDefaults: false },
        });

        seededUsersWithNewAdditions = [...users, ...extraUsers].sort(
          sortObjectsByStringProp('username', 'asc'),
        );
      });

      test.beforeEach(async ({ page }) => {
        loggedInUser = await loginAsRandomUser(
          page,
          users.filter((u) => u.role === 'ADMIN'),
        );
        expect(await checkIfLoggedIn(page)).toBe(true);
        await page.reload();
      });

      test('author search box is shown to admin users', async ({ page }) => {
        await expect(
          page.getByRole('searchbox', { name: 'Search for:' }),
        ).toBeInViewport();
      });

      test('clicking searchbox loads and displays the first page of users', async ({
        page,
      }) => {
        const search = page.getByRole('searchbox', { name: 'Search for:' });
        const listbox = page.getByTestId('dropdown-search-listbox');

        await expect(listbox).not.toBeInViewport();
        await search.click();
        await expect(listbox).toBeInViewport();

        const expectedCount = Math.min(
          seededUsersWithNewAdditions.length,
          PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
        );
        const options = await listbox.getByRole('option').all();
        expect(options).toHaveLength(expectedCount);

        for (let i = 0; i < expectedCount; i++) {
          await expect(
            page.getByRole('option', {
              name: seededUsersWithNewAdditions[i].username,
            }),
          ).toBeAttached();
        }
      });

      test('shows loading indicator while fetching users', async ({ page }) => {
        await page.route(`**${API_ENDPOINTS.USERS.LIST}**`, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          await route.fulfill({ json: [] });
        });

        await page.getByRole('searchbox', { name: 'Search for:' }).click();

        await expect(page.getByTestId('dropdown-search-listbox')).toContainText(
          /searching/i,
        );
      });

      test('scrolling to the last option triggers loading the next page', async ({
        page,
      }) => {
        expect(seededUsersWithNewAdditions.length).toBeGreaterThan(
          PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
        );

        await page.getByRole('searchbox', { name: 'Search for:' }).click();

        const listbox = page.getByTestId('dropdown-search-listbox');
        const initialOptions = await listbox.getByRole('option').all();
        expect(initialOptions).toHaveLength(
          PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
        );

        // Scroll inside the dropdown container to trigger IntersectionObserver
        await listbox.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(300);

        const expectedCount = Math.min(
          seededUsersWithNewAdditions.length,
          PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE * 2,
        );
        const updatedOptions = await listbox.getByRole('option').all();
        expect(updatedOptions).toHaveLength(expectedCount);
      });

      test('selecting a user from the dropdown filters posts by that author', async ({
        page,
      }) => {
        test.slow();

        await selectRowEntriesPerPage(
          page,
          PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS.at(-1)!,
        );

        const randomPost = randomSelect(seededPosts);
        const postAuthor = seededUsersWithNewAdditions.find(
          (u) => u.id === randomPost.authorId,
        );
        if (!postAuthor)
          throw new Error('Post author not found in seeded users');

        const search = page.getByRole('searchbox', { name: 'Search for:' });
        await search.click();
        await search.fill(postAuthor.username);
        await page
          .getByTestId('dropdown-search-listbox')
          .getByRole('option', { name: postAuthor.username })
          .click();

        const postsByAuthor = seededPosts.filter(
          (p) => p.authorId === postAuthor.id,
        );
        await assertFilteredCorrectly(
          page,
          postsByAuthor,
          loggedInUser,
          STATUSES,
          VISIBILITIES,
        );
      });

      test('clearing the author filter restores unfiltered post list', async ({
        page,
      }) => {
        test.slow();

        await selectRowEntriesPerPage(
          page,
          PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS.at(-1)!,
        );

        const randomPost = randomSelect(seededPosts);
        const postAuthor = seededUsersWithNewAdditions.find(
          (u) => u.id === randomPost.authorId,
        );
        if (!postAuthor)
          throw new Error('Post author not found in seeded users');

        // Apply author filter
        const search = page.getByRole('searchbox', { name: 'Search for:' });
        await search.click();
        await search.fill(postAuthor.username);
        await page
          .getByTestId('dropdown-search-listbox')
          .getByRole('option', { name: postAuthor.username })
          .click();

        const postsByAuthor = seededPosts.filter(
          (p) => p.authorId === postAuthor.id,
        );
        await assertFilteredCorrectly(
          page,
          postsByAuthor,
          loggedInUser,
          STATUSES,
          VISIBILITIES,
        );

        // Clear the filter
        await page.getByTitle(/clear author filter/i).click();

        // Should no longer match the filtered-by-author view
        // and should now show all posts
        await assertFilteredCorrectly(
          page,
          seededPosts,
          loggedInUser,
          STATUSES,
          VISIBILITIES,
        );
      });

      test('will reset to first page on selecting filtering by author', async ({
        page,
      }) => {
        test.slow();
        const randomPost = randomSelect(seededPosts);
        const postAuthor = seededUsersWithNewAdditions.find(
          (u) => u.id === randomPost.authorId,
        );
        if (!postAuthor)
          throw new Error('Post author not found in seeded users');
        expect(seededPosts.length).toBeGreaterThan(
          PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
        );

        await goToPage(page, 2);
        await expect(page).toHaveURL(
          new RegExp(`pageOffset=${PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE}`),
        );

        const search = page.getByRole('searchbox', { name: 'Search for:' });
        await search.click();
        await search.fill(postAuthor.username);
        await page
          .getByTestId('dropdown-search-listbox')
          .getByRole('option', { name: postAuthor.username })
          .click();

        const postsByAuthor = seededPosts
          .filter((p) => p.authorId === postAuthor.id)
          .slice(0, PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE);
        await expect(page).not.toHaveURL(
          new RegExp(`pageOffset=${PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE}`),
        );
        await assertFilteredCorrectly(
          page,
          postsByAuthor,
          loggedInUser,
          STATUSES,
          VISIBILITIES,
        );
      });
    });
  });
});
