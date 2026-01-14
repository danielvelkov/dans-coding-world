import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { TagSelectSection } from '../components/TagSelectSection';
import { UseQueryResult } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { generateMockGetTagsResponse } from '@dans-coding-world/shared-post-testing';
import { GetTagsResponse } from '@dans-coding-world/shared-post-dto';

function createTagsQueryMock(
  overrides?: Partial<UseQueryResult<GetTagsResponse>>
): UseQueryResult<GetTagsResponse> {
  return {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    ...overrides,
  } as UseQueryResult<GetTagsResponse>;
}

const { data } = generateMockGetTagsResponse({ length: 5 });
if (!data) throw new Error('failed to generate mock response');

describe('TagsSelectList', () => {
  let validProps: Parameters<typeof TagSelectSection>[0];

  const renderFeature = (props = validProps) => {
    return render(
      <MemoryRouter>
        <TagSelectSection {...props} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    validProps = {
      onTagToggle: vi.fn(),
      tagsQuery: createTagsQueryMock({ data }),
    };
    vi.clearAllMocks();
  });

  it('renders successfully ', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  test.each([
    ['while fetching tags', { isLoading: true }],
    ['on isError being true', { isError: true }],
    ['on error being returned', { error: new Error('An error occurred') }],
    ['on no tags being returned', { data: { count: 0, items: [] } }],
  ])(
    'renders nothing %s',
    (_: string, params: Partial<UseQueryResult<GetTagsResponse>>) => {
      validProps.tagsQuery = createTagsQueryMock(params);
      const { container } = renderFeature();
      expect(container.firstChild).toBe(null);
    }
  );

  it('renders as a section labeled "Tags"', async () => {
    renderFeature();
    await waitFor(() => {
      expect(
        screen.getByLabelText('Tags', { selector: 'section' })
      ).toBeTruthy();
    });
  });

  it('renders each fetched tag as a button', async () => {
    renderFeature();

    await waitFor(() => {
      const tagSection = screen.getByLabelText('Tags');
      const tags = within(tagSection).getAllByRole('button');
      expect(tags.length).toBe(data.count);
      for (const { name } of data.items)
        expect(tags.find((t) => t.textContent?.includes(name))).toBeTruthy();
    });
  });

  it('calls onTagToggle with selected tag when a tag is clicked', async () => {
    renderFeature();

    await waitFor(() => {
      const tagSection = screen.getByLabelText('Tags');
      const tags = within(tagSection).getAllByRole('button');
      for (const tag of tags) {
        fireEvent(
          tag,
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          })
        );
        expect(validProps.onTagToggle).toHaveBeenCalledWith(tag.textContent);
      }
    });
  });
});
