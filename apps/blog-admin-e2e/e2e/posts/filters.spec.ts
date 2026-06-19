import type {
  Post,
  PostStatus,
  PostVisibility,
} from '@dans-coding-world/prisma-schema';
import { test, expect } from '../fixtures/authFixture';
import type { Page } from '../fixtures/authFixture';
import postsJson from '../fixtures/posts/filters-dataset.json' with { type: 'json' };

async function checkIfFilteredCorrectly(
  page: Page,
  posts: Post[],
  statusFilter: PostStatus[],
  visibilityFilter: PostVisibility[],
) {
  const field = 'publishedAt';
  const sorted = [...posts].sort((prev, next) => {
    const prevDate = new Date(prev[field] as Date).getTime();
    const nextDate = new Date(next[field] as Date).getTime();
    return nextDate - prevDate;
  });

  const filtered = sorted.filter(
    (p) =>
      statusFilter.includes(p.status) ||
      visibilityFilter.includes(p.visibility),
  );

  for (let i = 0; i < filtered.length; i++) {
    const row = page.getByLabel(new RegExp(`row entry #${i + 1}`, 'i'));
    await expect(row).toContainText(filtered[i].title);
  }
}

// TODO - authenticated users required for filter testing to work
test.describe.skip('Posts - filtering', () => {
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
      posts: postsJson.map((p) => ({ ...p, authorId: admin.id })),
      options: { useDefaults: false, clearExisting: true },
    });

    if (!seededPosts || !seededPosts.length) {
      throw new Error('Missing post fixtures');
    }
  });

  test.describe('by Status/Visibility', () => {
    // TODO
    test.describe('Logged in as ADMIN', () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/posts');
        // TODO - login as admin
      });
      test('all status/visibility filters are selected by default', async ({
        page,
      }) => {
        const table = page.getByRole('table');
        const filterElement = table.getByLabel(/filter by:/i);
        const options = await filterElement.getByRole('option').all();
        for (const option of options)
          await expect(option).toHaveAttribute('selected');

        await checkIfFilteredCorrectly(
          page,
          seededPosts,
          ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
          ['MEMBERS_ONLY', 'PUBLIC'],
        );
      });
      // test.skip('filters all user posts correctly', async ({ page }) => {});
      // test.skip('shows DRAFT/ARCHIVED posts by other users when filtering', async () => {});
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
