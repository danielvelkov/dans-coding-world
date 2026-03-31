import {
  mockAuth,
  render,
  screen,
  waitFor,
} from '@dans-coding-world/public-blog-tools';
import userEvent from '@testing-library/user-event';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import Blog from './Blog';
import { BrowserRouter } from 'react-router-dom';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import qs from 'qs';
import { server } from './mocks/node.js';
import { FetchPostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';

vi.mock(
  '@dans-coding-world/public-blog-shared-hooks',
  async (importOriginal) => {
    return {
      ...(await importOriginal()),
      useAuth: vi.fn(),
    };
  }
);
vi.mock('@dans-coding-world/public-blog-data-access-api');

describe('Blog', () => {
  const renderFeature = () =>
    render(
      <BrowserRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <Blog />
      </BrowserRouter>
    );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    mockAuth();
    vi.clearAllMocks();
  });

  it('renders successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('on render requests posts from api with specified default filters', () => {
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
    ['items per page', '5'],
    ['items per page', '10'],
    ['sort', 'Published date.*asc'],
    ['sort', 'Published date.*desc'],
  ])(
    'always requests posts with status PUBLISHED, regardless of the filters specified (%s)',
    async (elementName, optionName) => {
      renderFeature();
      await selectDropdownOption(elementName, optionName);

      expect(api.get).toHaveBeenCalledWith(
        API_ENDPOINTS.POSTS.LIST,
        deepMatch({
          params: { filterBy: { status: ['PUBLISHED'] } },
        })
      );
    }
  );

  test.each([
    [
      'sortBy[publishedAt]=asc',
      'sort',
      'Published date.*asc',
      { sortBy: { publishedAt: 'asc' } },
    ],
    [
      'sortBy[updatedAt]=asc',
      'sort',
      'Last modified date.*asc',
      { sortBy: { updatedAt: 'asc' } },
    ],
    [`pageSize=10`, 'items per page', '10', { pageSize: 10 }],
    [`pageSize=25`, 'items per page', '25', { pageSize: 25 }],
  ] as [string, string, string, FetchPostsQueryParams][])(
    'updates URL params to "?%s" when %s dropdown changes (non-default values)',
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
    'does not include the URL param "?%s" in page URL',
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
