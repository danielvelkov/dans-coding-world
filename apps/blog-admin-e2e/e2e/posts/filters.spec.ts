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
import { selectPostFilter } from '../helpers/posts-actions.helper';
import { waitOutLoader } from '../helpers/loading.helper';

async function checkIfFilteredCorrectly(
  page: Page,
  posts: Post[],
  user: User,
  statusFilter: PostStatus[],
  visibilityFilter: PostVisibility[],
) {
  const isAdmin = user.role === 'ADMIN';

  const field = 'publishedAt';
  const sorted = [...posts].sort((prev, next) => {
    const prevDate = new Date(prev[field] as Date).getTime();
    const nextDate = new Date(next[field] as Date).getTime();
    return nextDate - prevDate;
  });

  const filtered = sorted.filter(
    (p) =>
      (isAdmin || p.authorId === user.id) &&
      statusFilter.includes(p.status) &&
      visibilityFilter.includes(p.visibility),
  );

  const numOfItemsToCheck =
    filtered.length > PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
      ? PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
      : filtered.length;

  try {
    for (let i = 0; i < numOfItemsToCheck; i++) {
      const row = page.getByLabel(new RegExp(`row entry #${i + 1}`, 'i'));
      await expect(row).toContainText(filtered[i].title);
    }
    return true;
  } catch (error) {
    return false;
  }
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

    const admin = users.find((u) => u.role === 'ADMIN');
    if (!admin) throw new Error('Missing test user');

    seededPosts = await db.seedPosts({
      posts: postsJson,
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPosts || !seededPosts.length) {
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
        const filterElement = page.getByLabel(/filter by:/i);
        const options = await filterElement.getByRole('option').all();
        for (const option of options)
          await expect(option).toHaveAttribute('selected');

        expect(
          await checkIfFilteredCorrectly(
            page,
            seededPosts,
            loggedInUser,
            ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
            ['MEMBERS_ONLY', 'PUBLIC'],
          ),
        ).toBe(true);
      });

      for (const [categoryName, categoryOptions] of [
        ['Status', Object.values(PostStatusEnum)],
        ['Visibility', Object.values(PostVisibilityEnum)],
      ]) {
        test(`disables option selection if its the last of category ${categoryName}`, async ({
          page,
        }) => {
          test.slow();
          for (const optionValue of categoryOptions) {
            await selectPostFilter(page, [optionValue]);

            const filterElement = page.getByLabel(/filter by:/i);
            const options = await filterElement.getByRole('option').all();

            for (const option of options) {
              const value = await option.getAttribute('value');
              const expectedDisabled = value === optionValue;

              if (expectedDisabled)
                await expect(option).toHaveAttribute('disabled');
              else await expect(option).not.toHaveAttribute('disabled');
            }
          }
        });
      }

      test('selecting a STATUS option deselects other STATUS options', async ({
        page,
      }) => {
        test.slow();

        const statuses = Object.values(PostStatusEnum);

        for (const status of statuses) {
          await selectPostFilter(page, [status]);

          const filterElement = page.getByLabel(/filter by:/i);
          const options = await filterElement.getByRole('option').all();

          for (const option of options) {
            const value = await option.getAttribute('value');
            const expectedSelected =
              value === status || !statuses.includes(value as PostStatus);
            if (expectedSelected)
              await expect(option).toHaveAttribute('selected');
            else await expect(option).not.toHaveAttribute('selected');
          }
        }
      });

      test('selecting a VISIBILITY option deselects other VISIBILITY options', async ({
        page,
      }) => {
        test.slow();

        const visibilities = Object.values(PostVisibilityEnum);

        for (const visibility of visibilities) {
          await selectPostFilter(page, [visibility]);

          const filterElement = page.getByLabel(/filter by:/i);
          const options = await filterElement.getByRole('option').all();

          for (const option of options) {
            const value = await option.getAttribute('value');
            const expectedSelected =
              value === visibility ||
              !visibilities.includes(value as PostVisibility);
            if (expectedSelected)
              await expect(option).toHaveAttribute('selected');
            else await expect(option).not.toHaveAttribute('selected');
          }
        }
      });

      test('filters all user posts correctly', async ({ page }) => {
        test.slow();

        const allStatuses = Object.values(PostStatusEnum);
        const allVisibilities = Object.values(PostVisibilityEnum);

        const randomlySetStatusFilter = [];
        const randomlySetVisibilityFilter = [];

        for (const status of allStatuses) {
          if (Math.random() > 0.3) {
            randomlySetStatusFilter.push(status);
          }
        }
        if (!randomlySetStatusFilter.length)
          randomlySetStatusFilter.push(allStatuses[0]);

        for (const visibility of allVisibilities) {
          if (Math.random() > 0.3) {
            randomlySetVisibilityFilter.push(visibility);
          }
        }
        if (!randomlySetVisibilityFilter.length)
          randomlySetVisibilityFilter.push(allVisibilities[0]);

        await selectPostFilter(page, [
          ...randomlySetStatusFilter,
          ...randomlySetVisibilityFilter,
        ]);

        expect(
          await checkIfFilteredCorrectly(
            page,
            seededPosts,
            loggedInUser,
            randomlySetStatusFilter as PostStatus[],
            randomlySetVisibilityFilter as PostVisibility[],
          ),
        ).toBe(true);
      });

      test('shows DRAFT/ARCHIVED posts by other users when filtering', async ({
        page,
      }) => {
        await selectPostFilter(page, ['Draft', 'Archived']);

        const otherAuthorPosts = seededPosts.filter(
          (p) => p.authorId !== loggedInUser.id && p.status === 'ARCHIVED',
        );
        expect(otherAuthorPosts.length).toBeGreaterThan(0);
        await expect(
          page.getByText(otherAuthorPosts[0].title),
        ).toBeInViewport();
      });
    });
    test.describe('Logged in as AUTHOR/MOD', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/posts');
        // TODO - login as mod
      });
      // test.skip("filters only user's posts correctly", async ({ page }) => {});
      // test.skip('does not show DRAFT/ARCHIVED posts by other users when filtering', async () => {});
    });
  });

  // TODO
  test.describe('by user', () => {
    test.describe('Logged in as AUTHOR/MOD', () => {
      // test.skip('does not show "filter by user" combobox', async ({
      //   page,
      // }) => {});
      // test(`shows FORBIDDEN page and message when trying to apply
      // filtering by user when logged in as AUTHOR`, async () => {});
    });
    test.describe('Logged in as ADMIN', () => {
      // test.skip('shows "filter by user" combobox field in control row of "Author" column', async () => {});
      // test.skip('clicking combobox loads all users and shows searchbox', async () => {});
      // test.skip('searching and selecting user through searchbox filters posts by this author', async () => {});
      // test.skip('selecting "clear user" next to searchbox removes user filtering ', async () => {});
    });
  });
});
