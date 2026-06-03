import { render } from 'vitest-browser-svelte';
import { expect, it, describe } from 'vitest';
import { screen, within } from '@testing-library/svelte';

import PostsTable from './PostsTable.svelte';
import { ADMIN_ONLY_COLUMN, TABLE_COLUMNS } from './shared.constants.js';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import type { PostVisibility } from '@dans-coding-world/prisma-schema';
import { formatDateTo_DD_MM_YYYY } from '@dans-coding-world/helpers';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

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
    const thead = screen.getByRole('columnheader', { name: col });

    expect(thead).toBeInTheDocument();
  },
);

it('renders additional "Author" column if admin viewer', async () => {
  // non-admin viewer
  const { baseElement: baseElement_NonAdminViewer } = await render(PostsTable);
  expect(
    within(baseElement_NonAdminViewer).queryByRole('columnheader', {
      name: ADMIN_ONLY_COLUMN,
    }),
  ).toBeFalsy();

  // admin viewer
  const admin = generateRandomUser({ role: 'ADMIN' });
  const { baseElement: baseElement_AdminViewer } = await render(PostsTable, {
    viewer: admin,
  });
  expect(
    within(baseElement_AdminViewer).getByRole('columnheader', {
      name: ADMIN_ONLY_COLUMN,
    }),
  ).toBeTruthy();
});

it('table displays empty message on no posts passed', async () => {
  await render(PostsTable, { posts: [] });
  expect(
    screen.getByText('No posts yet - Create your first post'),
  ).toBeInTheDocument();
});

it('table displays "loading" message on `isLoading` prop set to "true"', async () => {
  await render(PostsTable, { isLoading: true });
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

it('table displays error message on `error` prop populated', async () => {
  const error = new Error('Something went wrong');
  await render(PostsTable, { error });
  expect(screen.getByText(new RegExp(error.message))).toBeInTheDocument();
});

describe('Row details', async () => {
  const { data } = generateMockPostsResponse({
    length: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
    pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
  });
  const posts = data?.items;
  if (!posts) throw new Error('Missing fixtures');

  it(`displays each post's title in "Title" column`, async () => {
    await render(PostsTable, { posts });

    for (let i = 0; i < posts?.length; i++)
      expect(
        within(getTableDataCell(i, TABLE_COLUMNS.indexOf('Title'))).getByText(
          posts[i].title,
        ),
      );
  });

  it(`displays each post's status in uppercase "Status/Visibility" column`, async () => {
    await render(PostsTable, { posts });

    for (let i = 0; i < posts?.length; i++)
      expect(
        within(
          getTableDataCell(i, TABLE_COLUMNS.indexOf('Status/Visibility')),
        ).getByText(posts[i].status.toUpperCase()),
      );
  });

  it('renders "(Members-only)" only for MEMBERS_ONLY posts', async () => {
    const postsWithAlternatingVisibility = posts.map((post, i) => ({
      ...post,
      visibility: i % 2 === 0 ? 'PUBLIC' : ('MEMBERS_ONLY' as PostVisibility),
    }));

    await render(PostsTable, { posts: postsWithAlternatingVisibility });

    const colIndex = TABLE_COLUMNS.indexOf('Status/Visibility');

    postsWithAlternatingVisibility.forEach((post, rowIndex) => {
      const cell = within(getTableDataCell(rowIndex, colIndex));

      if (post.visibility === 'MEMBERS_ONLY') {
        expect(cell.getByText('(Members-only)')).toBeInTheDocument();
      } else {
        expect(cell.queryByText('(Members-only)')).not.toBeInTheDocument();
      }
    });
  });

  it(`displays each post's published date in DD/MM/YYYY format (if present)`, async () => {
    await render(PostsTable, { posts });

    const colIndex = TABLE_COLUMNS.indexOf('Published/Edited Date');

    posts.forEach((post, rowIndex) => {
      const cell = within(getTableDataCell(rowIndex, colIndex));
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
      const cell = within(getTableDataCell(rowIndex, colIndex));
      const differentDates =
        new Date(post.createdAt).getTime() !==
        new Date(post.updatedAt).getTime();

      if (differentDates)
        expect(
          cell.getByText(formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))),
        ).toBeInTheDocument();
      else
        expect(
          cell.getByText(formatDateTo_DD_MM_YYYY(new Date(post.updatedAt))),
        ).not.toBeInTheDocument();
    });
  });
});

function getTableDataCell(rowIndex: number, colIndex: number) {
  const table = screen.getByRole('table');
  const rows = within(table).getAllByRole('row').slice(1); // skip thead row
  if (rowIndex > rows.length)
    throw new Error(
      `Row index bigger than available rows (${rowIndex} > ${rows.length})`,
    );
  const cells = within(rows[rowIndex]).getAllByRole('cell');
  if (colIndex > cells.length)
    throw new Error(
      `Col index bigger than available columns (${colIndex} > ${cells.length})`,
    );
  return cells[colIndex];
}
