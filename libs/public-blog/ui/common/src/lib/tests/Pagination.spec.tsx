import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import Pagination from '../components/Pagination';

describe('Pagination', () => {
  const validProps = {
    totalPages: 5,
    currentPage: 5,
    onPageSelect: vi.fn(),
  };

  beforeEach(() => {
    validProps.onPageSelect = vi.fn();
  });

  it('renders successfully', () => {
    const { baseElement } = render(<Pagination {...validProps} />);
    expect(baseElement).toBeTruthy();
  });

  test.each([
    [
      'total pages are less than 1',
      {
        ...validProps,
        totalPages: 0,
      },
    ],
    [
      'current page is less than 1',
      {
        ...validProps,
        currentPage: 0,
      },
    ],
    [
      'current page bigger than total',
      {
        ...validProps,
        currentPage: 2,
        totalPages: 1,
      },
    ],
  ])('does not render anything when %s', (_, props) => {
    const { container } = render(<Pagination {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders buttons for each page number ', () => {
    render(<Pagination {...validProps} currentPage={1} />);
    for (let i = 1; i <= validProps.totalPages; i++)
      expect(screen.getByRole('button', { name: 'page ' + i })).toBeTruthy();
  });

  it('disables prev button if on first page', () => {
    render(<Pagination {...validProps} currentPage={1} />);
    const prevPageButton = screen.getByLabelText('prev page').closest('button');
    expect(prevPageButton?.disabled).toBe(true);
  });

  it('disables next button if on last page', () => {
    render(<Pagination {...validProps} currentPage={validProps.totalPages} />);
    const nextPageButton = screen.getByLabelText('next page').closest('button');
    expect(nextPageButton?.disabled).toBe(true);
  });

  it('calls onPageSelect handler when page button is clicked', async () => {
    render(<Pagination {...validProps} />);
    const user = userEvent.setup();

    for (let i = 1; i <= validProps.totalPages; i++) {
      const pageButton = screen.getByRole('button', { name: 'page ' + i });
      await user.click(pageButton);
      expect(validProps.onPageSelect).toHaveBeenCalledWith(i);
    }
  });

  it('calls onPageSelect handler with previous page as value when clicking on prev button', async () => {
    render(<Pagination {...validProps} />);
    const prevPageButton = screen.getByLabelText('prev page');
    const user = userEvent.setup();

    await user.click(prevPageButton);
    expect(validProps.onPageSelect).toHaveBeenCalledWith(
      validProps.totalPages - 1
    );
  });

  it('calls onPageSelect handler with next page as value when clicking on next button', async () => {
    const currentPage = 1;
    render(<Pagination {...validProps} currentPage={currentPage} />);
    const nextPageButton = screen.getByLabelText('next page');
    const user = userEvent.setup();

    await user.click(nextPageButton);
    expect(validProps.onPageSelect).toHaveBeenCalledWith(currentPage + 1);
  });
});
