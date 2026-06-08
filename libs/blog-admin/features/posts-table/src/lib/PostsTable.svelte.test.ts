import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { expect, it, describe } from 'vitest';

import PostsTable from './PostsTable.svelte';
import {
  ADMIN_ONLY_COLUMN,
  OMITTED_COLUMN_NAMES,
  POSTS_EMPTY_MESSAGE,
  POSTS_LOADING_MESSAGE,
  TABLE_COLUMNS,
} from './shared.constants.js';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import type { PostVisibility } from '@dans-coding-world/prisma-schema';
import { formatDateTo_DD_MM_YYYY } from '@dans-coding-world/helpers';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

const admin = generateRandomUser({ role: 'ADMIN' });

it('renders successfully', async () => {
  const screen = await render(PostsTable);
  expect(screen).toBeDefined();
});

it('renders as <table> element', async () => {
  const { container } = await render(PostsTable);
  expect((container.firstChild as HTMLElement).tagName).toBe('TABLE');
});

it.each(TABLE_COLUMNS.filter((c) => c !== ADMIN_ONLY_COLUMN))(
  `table contains "%s" column (non-admin viewer)`,
  async (col) => {
    await render(PostsTable);
    const thead = page.getByRole('columnheader', {
      name: !OMITTED_COLUMN_NAMES.includes(col) ? col : '',
    });

    expect(thead).toBeDefined();
  },
);

it('renders additional "Author" column if admin viewer', async () => {
  await render(PostsTable, { viewer: admin });
  expect(
    page.getByRole('columnheader', {
      name: ADMIN_ONLY_COLUMN,
    }),
  ).toBeDefined();
});

it('does not render additional "Author" column if not admin viewer', async () => {
  await render(PostsTable);
  expect(
    page.getByRole('columnheader', {
      name: ADMIN_ONLY_COLUMN,
    }),
  ).not.toBeInTheDocument();
});

it('table displays empty message on no posts passed', async () => {
  await render(PostsTable, { posts: [] });
  expect(page.getByText(POSTS_EMPTY_MESSAGE)).toBeInTheDocument();
});

it('table displays "loading" message on `isLoading` prop set to "true"', async () => {
  await render(PostsTable, { isLoading: true });
  expect(page.getByText(POSTS_LOADING_MESSAGE)).toBeInTheDocument();
});

it('table displays error message on `error` prop populated', async () => {
  const error = new Error('Something went wrong');
  await render(PostsTable, { error });
  expect(page.getByText(new RegExp(error.message))).toBeInTheDocument();
});

describe('Rows', () => {
  const { data } = generateMockPostsResponse({
    length: 2,
    pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
  });
  const posts = data?.items;
  if (!posts) throw new Error('Missing fixtures');

  describe('Row columns', async () => {
    it(`displays each post's title in "Title" column`, async () => {
      await render(PostsTable, { posts });

      for (let i = 0; i < posts?.length; i++)
        expect(
          getTableDataCell(i, TABLE_COLUMNS.indexOf('Title')).getByText(
            posts[i].title,
          ),
        );
    });

    it(`displays each post's status in uppercase "Status/Visibility" column`, async () => {
      await render(PostsTable, { posts });

      for (let i = 0; i < posts?.length; i++)
        expect(
          getTableDataCell(
            i,
            TABLE_COLUMNS.indexOf('Status/Visibility'),
          ).getByText(posts[i].status.toUpperCase()),
        );
    });

    it('renders "Members-only" message in "Status/Visibility" column, for MEMBERS_ONLY posts', async () => {
      const postsWithAlternatingVisibility = posts.map((post, i) => ({
        ...post,
        visibility: i % 2 === 0 ? 'PUBLIC' : ('MEMBERS_ONLY' as PostVisibility),
      }));

      await render(PostsTable, {
        posts: postsWithAlternatingVisibility,
      });

      const colIndex = TABLE_COLUMNS.indexOf('Status/Visibility');

      postsWithAlternatingVisibility.forEach((post, rowIndex) => {
        const cell = getTableDataCell(rowIndex, colIndex);

        if (post.visibility === 'MEMBERS_ONLY') {
          expect(cell.getByText('Members-only')).toBeInTheDocument();
        } else {
          expect(cell.getByText('Members-only')).not.toBeInTheDocument();
        }
      });
    });

    it(`displays each post's published date in DD/MM/YYYY format (if present)`, async () => {
      await render(PostsTable, { posts });

      const colIndex = TABLE_COLUMNS.indexOf('Published/Edited Date');

      posts.forEach((post, rowIndex) => {
        const cell = getTableDataCell(rowIndex, colIndex);
        if (post.publishedAt)
          expect(
            cell.getByText(formatDateTo_DD_MM_YYYY(new Date(post.publishedAt))),
          ).toBeInTheDocument();
      });
    });

    it(`displays each post's updated date in DD/MM/YYYY format 
		only if different than createdAt date`, async () => {
      await render(PostsTable, { posts });

      const colIndex = TABLE_COLUMNS.indexOf('Published/Edited Date');

      posts.forEach((post, rowIndex) => {
        const cell = getTableDataCell(rowIndex, colIndex);
        const differentDates =
          new Date(post.createdAt).getTime() !==
          new Date(post.updatedAt).getTime();

        if (differentDates)
          expect(
            cell.getByText(
              `Updated: ${formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}`,
            ),
          ).toBeInTheDocument();
        else
          expect(
            cell.getByText(
              `Updated: ${formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))}`,
            ),
          ).not.toBeInTheDocument();
      });
    });

    it(`displays post author's username as link in "Author" column,
     if viewer has role ADMIN`, async () => {
      await render(PostsTable, { posts, viewer: admin });

      const colIndex = TABLE_COLUMNS.indexOf('Author');

      posts.forEach((post, rowIndex) => {
        const cell = getTableDataCell(rowIndex, colIndex);
        const usernameLink = cell.getByRole('link');

        expect(usernameLink.element().textContent).toBe(post.author.username);
        expect(usernameLink).toHaveAttribute(
          'href',
          `/users?search=${post.authorId}`,
        );
      });
    });
  });

  describe('Expanded Row details', async () => {
    it('clicking on "expand details" adds another row containing post details', async () => {
      await render(PostsTable, { posts });
      expect(
        page.getByRole('heading', { name: /post details/i }),
      ).not.toBeInTheDocument();
      const postUAT = posts[0];
      await expandRow(0);
      const expandedRow = page.getByTestId(`row-details-${postUAT.id}`);
      expect(expandedRow).toBeInTheDocument();
      expect(
        expandedRow.getByRole('heading', { name: /post details/i }),
      ).toBeInTheDocument();
      expect(expandedRow.getByText(`ID: ${postUAT.id}`));
    });

    it(`clicking on "expand details" changes button name to "collapse details"
      and selecting it again hides row`, async () => {
      await render(PostsTable, { posts });
      const postUAT = posts[0];
      await expandRow(0);
      const expandedRow = page.getByTestId(`row-details-${postUAT.id}`);
      expect(expandedRow).toBeInTheDocument();
      const row = getTableRow(0);
      const collapseDetailsButton = row.getByRole('button', {
        name: /collapse details/i,
      });
      expect(collapseDetailsButton).toBeInTheDocument();
      await collapseDetailsButton.click();
      expect(collapseDetailsButton).not.toBeInTheDocument();

      // Wait for collapse animation (slide transition takes 200ms)
      // we can do that with `await expect.element()` which will poll until the
      // assertion passes:

      await expect
        .element(page.getByTestId(`row-details-${postUAT.id}`))
        .not.toBeInTheDocument();
    });

    it('contains post content', async () => {
      const postUAT = posts[0];
      const page = await render(PostsTable, { posts });
      await expandRow(0);
      const expandedRow = page.getByTestId(`row-details-${postUAT.id}`);
      expect(expandedRow.getByRole('paragraph').element().textContent).toBe(
        postUAT.content,
      );
    });

    it('contains author username if viewer has role ADMIN', async () => {
      const postUAT = posts[0];
      const page = await render(PostsTable, { posts, viewer: admin });
      await expandRow(0);
      const expandedRow = page.getByTestId(`row-details-${postUAT.id}`);
      expect(
        expandedRow.getByText(postUAT.author.username),
      ).toBeInTheDocument();
    });

    it('contains post tags', async () => {
      const postUAT = posts[0];
      await render(PostsTable, { posts, viewer: admin });
      await expandRow(0);
      const expandedRow = page.getByTestId(`row-details-${postUAT.id}`);
      for (const tag of postUAT.tags ?? [])
        expect(expandedRow.getByText(`#${tag}`)).toBeInTheDocument();
    });

    it('contains created date', async () => {
      const postUAT = posts[0];
      const page = await render(PostsTable, { posts, viewer: admin });
      await expandRow(0);
      const expandedRow = page.getByTestId(`row-details-${postUAT.id}`);
      expect(
        expandedRow.getByText(
          `Created ${formatDateTo_DD_MM_YYYY(postUAT.createdAt)}`,
        ),
      ).toBeInTheDocument();
    });

    it('contains last modified date', async () => {
      const postUAT = posts[0];
      const page = await render(PostsTable, { posts, viewer: admin });
      await expandRow(0);
      const expandedRow = page.getByTestId(`row-details-${postUAT.id}`);
      expect(
        expandedRow.getByText(
          `Last Modified ${formatDateTo_DD_MM_YYYY(postUAT.updatedAt)}`,
        ),
      ).toBeInTheDocument();
    });
  });

  async function expandRow(rowIndex: number) {
    const row = getTableRow(rowIndex);
    const showDetailsToggle = row.getByRole('button', {
      name: /expand details/i,
    });
    await showDetailsToggle.click();
  }

  function getTableRow(rowIndex: number) {
    const table = page.getByRole('table');
    const rows = table.getByRole('row').all().slice(1); // skip thead row
    if (rowIndex > rows.length)
      throw new Error(
        `Row index bigger than available rows (${rowIndex} > ${rows.length})`,
      );
    return rows[rowIndex];
  }

  function getTableDataCell(rowIndex: number, colIndex: number) {
    const cells = getTableRow(rowIndex).getByRole('cell').all();
    if (colIndex > cells.length)
      throw new Error(
        `Col index bigger than available columns (${colIndex} > ${cells.length})`,
      );
    return cells[colIndex];
  }
});
