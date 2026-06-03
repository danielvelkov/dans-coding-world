import { render } from 'vitest-browser-svelte';
import { expect, it, describe } from 'vitest';
import { screen, within } from '@testing-library/svelte';

import PostsTable from './PostsTable.svelte';
import { TABLE_COLUMNS } from './shared.constants.js';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import type { PostVisibility } from '@dans-coding-world/prisma-schema';
import { formatDateTo_DD_MM_YYYY } from '@dans-coding-world/helpers';

it('renders successfully', async () => {
  const screen = await render(PostsTable);
  expect(screen).toBeDefined();
});

it('renders as <table> element', async () => {
  const { container } = await render(PostsTable);
  expect((container.firstChild as HTMLElement).tagName).toBe('TABLE');
});

it.each(TABLE_COLUMNS)('table contains "%s" column', async (col) => {
  await render(PostsTable);
  const thead = screen.getByRole('columnheader', { name: col });

  expect(thead).toBeInTheDocument();
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

  it(`displays each post's visibility in "Status/Visibility" col,
	if value different that PUBLIC`, async () => {
    const temp = [...posts];
    const postsWithAlternatingVisibility = temp.map((post, i) => ({
      ...post,
      visibility: (i % 2 === 0 ? 'PUBLIC' : 'MEMBERS_ONLY') as PostVisibility,
    }));
    await render(PostsTable, { posts: postsWithAlternatingVisibility });

    for (let i = 0; i < postsWithAlternatingVisibility?.length; i++)
      if (postsWithAlternatingVisibility[i].visibility === 'MEMBERS_ONLY')
        expect(
          within(
            getTableDataCell(i, TABLE_COLUMNS.indexOf('Status/Visibility')),
          ).getByText('(Members-only)'),
        ).toBeInTheDocument();
      else
        expect(
          within(
            getTableDataCell(i, TABLE_COLUMNS.indexOf('Status/Visibility')),
          ).queryByText('(Members-only)'),
        ).not.toBeInTheDocument();
  });

  it(`displays each post's published date in DD/MM/YYYY format (if present)`, async () => {
    await render(PostsTable, { posts });

    for (let i = 0; i < posts?.length; i++)
      if (posts[i].publishedAt)
        expect(
          within(
            getTableDataCell(i, TABLE_COLUMNS.indexOf('Published/Edited Date')),
          ).getByText(
            formatDateTo_DD_MM_YYYY(new Date(posts[i].publishedAt as Date)),
          ),
        ).toBeInTheDocument();
      else
        expect(
          within(
            getTableDataCell(i, TABLE_COLUMNS.indexOf('Published/Edited Date')),
          ).queryByText(
            formatDateTo_DD_MM_YYYY(new Date(posts[i].publishedAt as Date)),
          ),
        ).not.toBeInTheDocument();
  });

  it(`displays each post's updated date in DD/MM/YYYY format 
		only if different than createdAt date`, async () => {
    await render(PostsTable, { posts });

    for (let i = 0; i < posts?.length; i++)
      if (
        new Date(posts[i].createdAt).getTime() !==
        new Date(posts[i].updatedAt).getTime()
      )
        expect(
          within(
            getTableDataCell(i, TABLE_COLUMNS.indexOf('Published/Edited Date')),
          ).getByText(
            formatDateTo_DD_MM_YYYY(new Date(posts[i].updatedAt as Date)),
          ),
        ).toBeInTheDocument();
      else
        expect(
          within(
            getTableDataCell(i, TABLE_COLUMNS.indexOf('Published/Edited Date')),
          ).queryByText(
            formatDateTo_DD_MM_YYYY(new Date(posts[i].updatedAt as Date)),
          ),
        ).not.toBeInTheDocument();
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
