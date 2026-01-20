import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import Blog from './Blog';
import { BrowserRouter } from 'react-router-dom';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import qs from 'qs';
import { server } from './mocks/node.js';
import { defaultFilters } from './utils/merge-post-query-defaults';

vi.mock('@dans-coding-world/public-blog-data-access-api');

describe('Blog', () => {
  let queryClient: QueryClient;

  const renderFeature = () =>
    render(
      <BrowserRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <QueryClientProvider client={queryClient}>
          <Blog />
        </QueryClientProvider>
      </BrowserRouter>
    );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('renders successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('renders with specific default filters', () => {
    renderFeature();
    expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.POSTS.LIST, {
      params: defaultFilters,
    });
  });

  test.each([
    ['items per page', '10'],
    ['sort', 'Published date.*asc'],
  ])(
    'always requests posts with status PUBLISHED, regardless of (%s) filters specified',
    async (elementName, optionName) => {
      renderFeature();
      await selectDropdownOption(elementName, optionName);

      expect(api.get).toHaveBeenLastCalledWith(
        API_ENDPOINTS.POSTS.LIST,
        deepMatch({
          params: { filterBy: { status: ['PUBLISHED'] } },
        })
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
    'updates URL params to "?%s" when filter changes (non-default values)',
    async (_, elementName, optionName, value) => {
      renderFeature();
      await selectDropdownOption(elementName, optionName);
      await waitFor(() => {
        const url = new URL(window.location.href);
        expect(url.search).toContain(qs.stringify(value));
      });
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
      await waitFor(() => {
        const url = new URL(window.location.href);
        expect(url.search).toContain('');
      });
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

const deepMatch = (obj: object): void =>
  expect.objectContaining(
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        value !== null && typeof value === 'object' && !Array.isArray(value)
          ? deepMatch(value)
          : value,
      ])
    )
  );
