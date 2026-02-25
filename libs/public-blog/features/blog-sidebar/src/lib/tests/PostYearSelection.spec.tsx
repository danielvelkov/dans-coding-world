import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@dans-coding-world/public-blog-tools';
import '@testing-library/jest-dom';
import { UseQueryResult } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { generateMockPostMetadataResponse } from '@dans-coding-world/shared-post-testing';
import { GetPostsMetadataResponse } from '@dans-coding-world/shared-post-dto';
import { PostYearSelection } from '../components/PostYearSelection';
import createMockQueryResult from './util/createMockQueryResult';

const { data } = generateMockPostMetadataResponse({ length: 5 });
if (!data) throw new Error('failed go generate mock response');

describe('PublishedYearSelectSection', () => {
  let validProps: Parameters<typeof PostYearSelection>[0];

  const renderFeature = (props = validProps) => {
    return render(
      <MemoryRouter>
        <PostYearSelection {...props} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    validProps = {
      onYearToggle: vi.fn(),
      yearsQuery: createMockQueryResult({ data }),
    };
    vi.clearAllMocks();
  });

  it('renders successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  test.each([
    ['while fetching published years', { isLoading: true }],
    ['on isError being true', { isError: true }],
    ['on error being returned', { error: new Error('An error occurred') }],
    [
      'on no years returned',
      { data: { years: [] } as GetPostsMetadataResponse },
    ],
  ])(
    'renders nothing %s',
    (_: string, params: Partial<UseQueryResult<GetPostsMetadataResponse>>) => {
      validProps.yearsQuery = createMockQueryResult({ ...params });
      const { container } = renderFeature();
      expect(container.firstChild).toBe(null);
    }
  );

  it('renders as a section labeled "Posts by year"', async () => {
    renderFeature();
    await waitFor(() => {
      expect(
        screen.getByLabelText(/Posts by year/, { selector: 'section' })
      ).toBeTruthy();
    });
  });

  it('renders each published year as a button', async () => {
    renderFeature();

    await waitFor(() => {
      const yearsSection = screen.getByLabelText(/Posts by year/i);
      const yearButtons = within(yearsSection).getAllByRole('button');
      expect(yearButtons.length).toBe(data.years.length);
      for (const year of data.years)
        expect(
          yearButtons.find((t) => t.textContent?.includes(year.toString()))
        ).toBeTruthy();
    });
  });

  it('renders buttons for filtering by year in desc order', async () => {
    renderFeature();

    await waitFor(() => {
      const yearsSection = screen.getByLabelText(/Posts by year/i);
      const yearButtons = within(yearsSection).getAllByRole('button');
      const sortedYears = [...data.years].sort((prev, next) => next - prev);
      for (let i = 0; i < yearButtons.length; i++)
        expect(yearButtons[i].textContent).toBe(sortedYears[i].toString());
    });
  });

  it('renders selected year as pressed button if present in list', async () => {
    const selectedYear = data.years[0];
    renderFeature({ ...validProps, selectedYear });

    await waitFor(() => {
      const yearsSection = screen.getByLabelText(/Posts by year/i);
      const yearButton = within(yearsSection).getByRole('button', {
        name: selectedYear.toString(),
      });
      expect(yearButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('calls onYearToggle handler with pressed year', async () => {
    const selectedYear = data.years[0];
    renderFeature({ ...validProps });

    await waitFor(() => {
      const yearsSection = screen.getByLabelText(/Posts by year/i);
      const yearButton = within(yearsSection).getByRole('button', {
        name: selectedYear.toString(),
      });
      fireEvent(
        yearButton,
        new MouseEvent('click', { cancelable: true, bubbles: true })
      );
      expect(validProps.onYearToggle).toHaveBeenCalledWith(selectedYear);
    });
  });
});
