import { type ComponentProps } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { expect, it, describe } from 'vitest';
import AuthorFilter from './AuthorFilter.svelte';
import { generateMockUsersResponse } from '@dans-coding-world/shared-user-testing';

describe('AuthorFilter', () => {
  const mockUsersResponse = generateMockUsersResponse({ length: 5 });
  if (!mockUsersResponse.data || mockUsersResponse.data?.items.length === 0)
    throw new Error('Missing fixtures');
  const users = mockUsersResponse.data.items;

  const renderFeature = async (
    params?: Partial<ComponentProps<typeof AuthorFilter>>,
  ) => {
    const { queryData: queryDataOverride, ...rest } = params ?? {};
    return await render(AuthorFilter, {
      filters: {},
      onChange: vi.fn(),
      handleSearch: vi.fn(),
      loadNext: vi.fn(),
      queryData: {
        data: { pageParams: [], pages: [mockUsersResponse.data] },
        error: null,
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
        ...queryDataOverride,
      },
      ...rest,
    });
  };

  const openDropdown = async () => {
    await page.getByRole('searchbox').click();
  };

  it('renders successfully', async () => {
    const screen = await renderFeature();
    expect(screen).toBeDefined();
  });

  it('renders search input with author filter placeholder', async () => {
    await renderFeature();
    await expect
      .element(page.getByRole('searchbox'))
      .toHaveAttribute('placeholder', 'Filter by author...');
  });

  it('renders user options from query data', async () => {
    await renderFeature();
    await openDropdown();
    for (const user of users) {
      expect(
        page.getByRole('option', { name: user.username }),
      ).toBeInTheDocument();
    }
  });

  it('calls handleSearch when typing in search input', async () => {
    const handleSearch = vi.fn();
    await renderFeature({ handleSearch });
    await page.getByRole('searchbox').fill('alice');
    expect(handleSearch).toHaveBeenCalledWith('alice');
  });

  it('calls onChange with selected userId when an author is selected', async () => {
    const onChange = vi.fn();
    const user = users[0];
    await renderFeature({ onChange });
    await openDropdown();
    await page.getByRole('option', { name: user.username }).click();
    expect(onChange).toHaveBeenCalledWith({ userId: user.id });
  });

  it('marks selected author in the dropdown', async () => {
    const user = users[1];
    await renderFeature({ filters: { userId: user.id } });
    await openDropdown();
    await expect
      .element(page.getByRole('option', { name: user.username }))
      .toHaveAttribute('aria-selected', 'true');
  });

  it('displays error from query data', async () => {
    await renderFeature({
      queryData: {
        data: undefined,
        error: new Error('Failed to fetch users'),
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: false,
      },
    });
    await openDropdown();
    expect(page.getByText('Failed to fetch users')).toBeInTheDocument();
  });

  it('displays loading state while fetching users', async () => {
    await renderFeature({
      queryData: {
        data: undefined,
        error: null,
        hasNextPage: false,
        isFetchingNextPage: false,
        isLoading: true,
      },
    });
    await openDropdown();
    expect(page.getByText('Searching...')).toBeInTheDocument();
  });
});
