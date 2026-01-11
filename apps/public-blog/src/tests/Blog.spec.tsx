import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import Blog from '../routes/blog/Blog';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { MemoryRouter } from 'react-router-dom';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import qs from 'qs';

// Mock everything related to backend api
vi.mock('@dans-coding-world/public-blog-data-access-api');

const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

describe('Blog', () => {
  let queryClient: QueryClient;

  const renderFeature = () =>
    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <QueryClientProvider client={queryClient}>
          <Blog />
        </QueryClientProvider>
      </MemoryRouter>
    );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      data: generateMockPostsResponse({ length: 5, pageSize: 5 }),
      success: true,
      error: null,
    });
  });

  it('on initial render, the blog has predefined filters already', () => {
    renderFeature();
    expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.POSTS.LIST, {
      params: {
        filterBy: {
          status: ['PUBLISHED'],
          visibility: ['MEMBERS_ONLY', 'PUBLIC'],
        },
        sortBy: { publishedAt: 'desc' },
      },
    });
  });

  test.each([
    ['items per page', '10'],
    ['sort', 'Published date.*asc'],
  ])(
    'always queries posts with status PUBLISHED, regardless of filter',
    async (elementName, optionName) => {
      renderFeature();
      await selectDropdownOption(elementName, optionName);

      const mockApiGetFunctionParam = vi
        .mocked(api.get)
        .mock.calls.at(-1)?.[1] as Parameters<typeof api.get>[1];
      expect(mockApiGetFunctionParam?.params.filterBy).toHaveProperty(
        'status',
        ['PUBLISHED']
      );
    }
  );

  test.each([
    ['pageSize=10', 'items per page', '10', { pageSize: 10 }],
    [
      'sortBy[publishedAt]=asc',
      'sort',
      'Published date.*asc',
      { sortBy: { publishedAt: 'asc' } },
    ],
  ])(
    'includes search params (%s) in page URL when changing filters',
    async (_, elementName, optionName, value) => {
      renderFeature();
      await selectDropdownOption(elementName, optionName);
      expect(mockSetSearchParams).toHaveBeenLastCalledWith(qs.stringify(value));
    }
  );

  test.each([
    [
      'pageSize=5',
      'items per page',
      PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE.toString(),
    ],
    ['sortBy[publishedAt]=desc', 'sort', 'Published date.*desc'],
  ])(
    'does not include params (%s) in page URL, as they are set by default',
    async (_, elementName, optionName) => {
      renderFeature();
      await selectDropdownOption(elementName, optionName);
      expect(mockSetSearchParams).toHaveBeenLastCalledWith('');
    }
  );
});

async function selectDropdownOption(elementName: string, optionName: string) {
  const dropdown = screen.getByRole('combobox', {
    name: new RegExp(elementName, 'i'),
  });
  const user = userEvent.setup();
  await user.click(dropdown);

  const option = await screen.findByRole('option', {
    name: new RegExp('^' + optionName, 'i'),
  });
  await user.click(option);
}
