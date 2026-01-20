import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import BlogSidebar from '../BlogSidebar';
import {
  generateMockGetTagsResponse,
  generateMockPostMetadataResponse,
} from '@dans-coding-world/shared-post-testing';
import { MemoryRouter } from 'react-router-dom';
import {
  useFetchPostsMetadata,
  useFetchTags,
} from '@dans-coding-world/public-blog-shared-hooks';
import createMockQueryResult from './util/createMockQueryResult';
import {
  GetPostsMetadataResponse,
  GetTagsResponse,
} from '@dans-coding-world/shared-post-dto';
import { randomSelect } from '@dans-coding-world/helpers';

vi.mock('@dans-coding-world/public-blog-shared-hooks');

const mockTagsResponse = generateMockGetTagsResponse({
  length: 3,
});
const mockPostsMetadataResponse = generateMockPostMetadataResponse({
  length: 5,
});

describe('BlogSidebar', () => {
  const validProps = {
    params: {},
    setParams: vi.fn(),
  };

  const renderFeature = (
    params: Parameters<typeof BlogSidebar>[0] = validProps
  ) => {
    return render(
      <MemoryRouter>
        <BlogSidebar {...params} />
      </MemoryRouter>
    );
  };

  const mockTagData = (data: GetTagsResponse) => {
    const mockFetchTagsRes = createMockQueryResult<GetTagsResponse>({
      data,
    });
    vi.mocked(useFetchTags).mockReturnValue(mockFetchTagsRes);
  };

  const mockYearsData = (data: GetPostsMetadataResponse) => {
    const mockFetchPostsMetadataRes =
      createMockQueryResult<GetPostsMetadataResponse>({
        data,
      });
    vi.mocked(useFetchPostsMetadata).mockReturnValue(mockFetchPostsMetadataRes);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    validProps.setParams = vi.fn();

    mockTagData(mockTagsResponse.data as GetTagsResponse);

    mockYearsData(mockPostsMetadataResponse.data as GetPostsMetadataResponse);
  });

  it('renders successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('renders as an <aside> element', () => {
    const { container } = renderFeature();
    expect((container.firstChild as HTMLElement).tagName).toBe('ASIDE');
  });

  describe('Tags filter', () => {
    it('renders all tags from fetch response', async () => {
      renderFeature();

      await waitFor(() => {
        const tagSection = screen.getByLabelText('Tags');
        const tags = within(tagSection).getAllByRole('button');
        expect(tags).toHaveLength(
          mockTagsResponse.data?.items?.length as number
        );
      });
    });

    it('renders active tags with aria-pressed attribute when in params', async () => {
      renderFeature({
        ...validProps,
        params: {
          filterBy: { tags: mockTagsResponse.data?.items.map((t) => t.name) },
        },
      });
      await waitFor(() => {
        const tagSection = screen.getByLabelText('Tags');
        const tags = within(tagSection).getAllByRole('button');
        expect(
          tags.every((tag) => tag.getAttribute('aria-pressed') === 'true')
        ).toBe(true);
      });
    });

    it('renders inactive tags with aria-pressed="false" when not in params', async () => {
      renderFeature({
        ...validProps,
        params: { filterBy: { tags: [] } },
      });

      await waitFor(() => {
        const tagSection = screen.getByLabelText('Tags');
        const tags = within(tagSection).getAllByRole('button');

        tags.forEach((tag) => {
          expect(tag).toHaveAttribute('aria-pressed', 'false');
        });
      });
    });

    it('calls setParams() to remove tag when clicking on active tag', async () => {
      const params = {
        filterBy: { tags: mockTagsResponse.data?.items.map((t) => t.name) },
      };
      renderFeature({
        ...validProps,
        params,
      });
      await waitFor(() => {
        const tagSection = screen.getByLabelText('Tags');
        const tags = within(tagSection).getAllByRole('button');

        for (const tag of tags) {
          const tagName = tag.textContent;
          fireEvent(
            tag,
            new MouseEvent('click', { bubbles: true, cancelable: true })
          );
          expect(validProps.setParams).toHaveBeenLastCalledWith({
            ...params,
            filterBy: {
              ...params.filterBy,
              tags: params.filterBy.tags?.filter((t) => t !== tagName),
            },
          });
        }
      });
    });
  });

  describe('Published Years filter', () => {
    it('renders all available years', async () => {
      renderFeature();

      await waitFor(() => {
        const yearSection = screen.getByLabelText(/year/i);
        const yearButtons = within(yearSection).getAllByRole('button');
        expect(yearButtons).toHaveLength(
          mockPostsMetadataResponse.data?.years.length as number
        );
      });
    });

    it(`calls setParams() to deselect year
       when clicking on active year button `, async () => {
      const selectedYear = randomSelect(
        mockPostsMetadataResponse.data?.years as number[]
      );
      const params = {
        filterBy: { year: selectedYear },
      };
      renderFeature({
        ...validProps,
        params: {
          filterBy: { year: selectedYear },
        },
      });
      await waitFor(() => {
        const yearSection = screen.getByLabelText(/year/);
        const yearButton = within(yearSection).getByRole('button', {
          name: selectedYear.toString(),
        });
        expect(yearButton).toHaveAttribute('aria-pressed', 'true');

        fireEvent(
          yearButton,
          new MouseEvent('click', { bubbles: true, cancelable: true })
        );
        expect(validProps.setParams).toHaveBeenLastCalledWith({
          ...params,
          filterBy: {
            ...params.filterBy,
            year: undefined,
          },
        });
      });
    });

    it(`does not render filtering by years section if no years fetched,
       even if params specify this year`, async () => {
      const selectedYear = randomSelect(
        mockPostsMetadataResponse.data?.years as number[]
      );
      mockYearsData({
        ...(mockPostsMetadataResponse.data as GetPostsMetadataResponse),
        years: [],
      } as GetPostsMetadataResponse);
      renderFeature({
        ...validProps,
        params: {
          filterBy: { year: selectedYear },
        },
      });
      await waitFor(() => {
        expect(screen.queryByLabelText(/year/)).not.toBeInTheDocument();
      });
    });
  });
});
