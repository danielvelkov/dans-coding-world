/* eslint-disable playwright/no-conditional-in-test */
import type { Post, User } from '@dans-coding-world/prisma-schema';
import { range, chunk, shuffle } from '@dans-coding-world/helpers';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { test, expect } from '../fixtures/dbFixture';
import {
  goToPage,
  clickNextPage,
  clickPrevPage,
  selectRowEntriesPerPage,
} from '../helpers/pagination.helper';
import postJson from '../fixtures/posts/pagination-template.json' with { type: 'json' };
import {
  checkIfLoggedIn,
  loginAsRandomUser,
} from '../helpers/user-login.helper';

test.describe('Posts page - pagination', () => {
  let users: User[] = [];
  let seededPosts: Post[];

  test.beforeAll(async ({ db }) => {
    users = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    const admin = users.find((u) => u.role === 'ADMIN');
    if (!admin) throw new Error('Missing test user');

    const numOfTestPosts = Math.floor(Math.random() * (50 - 30 + 1)) + 30;

    const postTemplate = postJson[0];

    const postsToSeed = range(numOfTestPosts)
      .reverse()
      .map((i) => {
        const dateWithOffset = postTemplate.publishedAt
          ? new Date(postTemplate.publishedAt)
          : postTemplate.publishedAt;
        (dateWithOffset as Date)?.setUTCDate(
          (dateWithOffset as Date).getUTCDate() + i,
        );
        return {
          ...postTemplate,
          title: postTemplate.title + i.toString(),
          content: postTemplate.content + i.toString(),
          publishedAt: dateWithOffset,
          authorId: admin.id,
        };
      });

    seededPosts = await db.seedPosts({
      posts: postsToSeed,
      options: {
        useDefaults: false,
        clearExisting: true,
      },
    });

    if (!seededPosts || !seededPosts.length) {
      throw new Error('Missing post fixtures');
    }

    // Sort by default order: publishedAt desc
    seededPosts.sort((prev, next) => {
      const prevDate = new Date(prev.publishedAt as Date);
      const nextDate = new Date(next.publishedAt as Date);
      return nextDate.getTime() - prevDate.getTime();
    });
  });

  test.beforeEach(async ({ page }) => {
    await loginAsRandomUser(
      page,
      users.filter((u) => u.role === 'ADMIN'),
    );
    expect(await checkIfLoggedIn(page)).toBe(true);
  });

  test.describe('Element', () => {
    test('shows up when there are more results than the default page size', async ({
      page,
    }) => {
      await page.route(`**${API_ENDPOINTS.POSTS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockPostsResponse({
            length: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE * 2,
            pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
          }),
        }),
      );

      await page.goto('/posts');
      await expect(page.getByLabel('pagination')).toBeVisible();
    });

    test('is not displayed when results fit on 1 page', async ({ page }) => {
      const numOfTestPosts = 4;
      await page.route(`**${API_ENDPOINTS.POSTS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockPostsResponse({
            length: numOfTestPosts,
            pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
          }),
        }),
      );

      await page.goto('/posts');
      await expect(page.getByLabel(/expand details/i)).toHaveCount(
        numOfTestPosts,
      );
      await expect(page.getByLabel('pagination')).toBeHidden();
    });

    test('displays correct number of page buttons', async ({ page }) => {
      const expectedPages = 4;
      const pageSize = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE;

      await page.route(`**${API_ENDPOINTS.POSTS.LIST}**`, (route) =>
        route.fulfill({
          json: generateMockPostsResponse({
            length: expectedPages * pageSize,
            pageSize,
          }),
        }),
      );

      await page.goto('/posts');

      const pagination = page.getByLabel('pagination');
      for (let i = 1; i <= expectedPages; i++) {
        await expect(
          pagination.getByRole('button', { name: `page ${i}`, exact: true }),
        ).toBeVisible();
      }
    });
  });

  test.describe('Selection', () => {
    // tests by default run on parallel workers...
    // Each worker reruns test.beforeAll() causing sync issues with the API
    // Reruns also happen every time a test fails or with test parallelization and sharding

    // NOT NEEDED IF "workers: 1" in playwright.config
    // this makes the tests run in serial mode (one after another)
    // test.describe.configure({ mode: 'serial' });

    // TODO: flaky
    test('navigates to next page of results on clicking "next"', async ({
      page,
    }) => {
      test.setTimeout(60_000);
      const pagesWithPostsArray = chunk(
        seededPosts,
        PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithPostsArray.length;

      for (let i = 0; i < numOfPages; i++) {
        for (const post of pagesWithPostsArray[i]) {
          await expect(page.getByText(post.title)).toBeVisible();
        }
        if (i < numOfPages - 1) {
          await clickNextPage(page);
        }
      }
    });

    test('disables "next" button if on last page of results', async ({
      page,
    }) => {
      const lastPage = Math.ceil(
        seededPosts.length / PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
      );
      await goToPage(page, lastPage);

      await expect(page.getByLabel('next page')).toBeDisabled();
      await expect(page.getByLabel('prev page')).toBeEnabled();
    });

    test('navigates to previous page on clicking "prev"', async ({ page }) => {
      const pagesWithPostsArray = chunk(
        seededPosts,
        PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithPostsArray.length;

      await goToPage(page, numOfPages);

      for (let i = numOfPages - 1; i >= 0; i--) {
        for (const post of pagesWithPostsArray[i]) {
          await expect(page.getByText(post.title)).toBeVisible();
        }
        if (i > 0) {
          await clickPrevPage(page);
        }
      }
    });

    test('disables "prev" button if on first page of results', async ({
      page,
    }) => {
      await goToPage(page, 1);

      await expect(page.getByLabel('prev page')).toBeDisabled();
      await expect(page.getByLabel('next page')).toBeEnabled();
    });

    test('navigating to a random page displays the right results', async ({
      page,
    }) => {
      const pagesWithPostsArray = chunk(
        seededPosts,
        PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
      );
      const numOfPages = pagesWithPostsArray.length;
      const randomPages = shuffle(range(numOfPages));

      for (const randomPage of randomPages) {
        await goToPage(page, randomPage);
        for (const post of pagesWithPostsArray[randomPage - 1]) {
          await expect(page.getByText(post.title)).toBeVisible();
        }
      }
    });

    test.describe('with different entries per page selected', () => {
      test('shows the right amount of posts', async ({ page }) => {
        for (const pageSize of PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          await expect(page.getByLabel(/expand details/i)).toHaveCount(
            pageSize,
          );
        }
      });

      test('show correct row entry numbering', async ({ page }) => {
        // this test is slow so the function call below triples timeout
        test.slow();
        for (const pageSize of PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          const expectedPages = Math.ceil(seededPosts.length / pageSize);
          for (let pageIndex = 1; pageIndex <= expectedPages; pageIndex++) {
            const pagination = page.getByLabel('pagination');
            await pagination
              .getByRole('button', { name: `page ${pageIndex}`, exact: true })
              .click();

            const start = (pageIndex - 1) * pageSize + 1;
            const end =
              pageIndex === expectedPages
                ? seededPosts.length
                : pageIndex * pageSize;
            await expect(
              page.getByText(
                `Showing ${start} - ${end} of ${seededPosts.length} entries`,
              ),
            ).toBeVisible();

            for (const entryIndex of Array.from({ length: pageSize }).map(
              (_, i) => i + 1,
            )) {
              const rowEntryIndex = (pageIndex - 1) * pageSize + entryIndex;
              if (rowEntryIndex > seededPosts.length) break;
              await expect(
                page.getByLabel(`Row entry #${rowEntryIndex}`, { exact: true }),
              ).toBeVisible();
            }
          }
        }
      });

      test('displays correct number of pagination buttons', async ({
        page,
      }) => {
        for (const pageSize of PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS) {
          await selectRowEntriesPerPage(page, pageSize);
          const expectedPages = Math.ceil(seededPosts.length / pageSize);
          const pagination = page.getByLabel('pagination');

          for (let i = 1; i <= expectedPages; i++) {
            await expect(
              pagination.getByRole('button', {
                name: `page ${i}`,
                exact: true,
              }),
            ).toBeVisible();
          }
        }
      });
      for (const pageSize of PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS) {
        test(`shows correct results for page size ${pageSize}`, async ({
          page,
        }) => {
          await selectRowEntriesPerPage(page, pageSize);

          const pagesWithPostsArray = chunk(seededPosts, pageSize);
          const numOfPages = pagesWithPostsArray.length;

          for (let pageIndex = 1; pageIndex <= numOfPages; pageIndex++) {
            await goToPage(page, pageIndex);

            for (const post of pagesWithPostsArray[pageIndex - 1]) {
              await expect(
                page.getByText(post.title, { exact: true }),
              ).toBeVisible();
            }
          }
        });
      }
    });
  });
});
