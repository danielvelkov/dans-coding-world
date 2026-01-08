import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import Pagination from '../components/Pagination';

describe('Pagination', () => {
  const onPageSelect = vi.fn();
  const validProps = {
    totalPages: 1,
    currentPage: 1,
    onPageSelect,
  };

  it('renders successfully provided that valid data is passed', () => {
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
    const totalPages = 3;
    render(
      <Pagination {...validProps} totalPages={totalPages} currentPage={1} />
    );
    for (let i = 1; i <= totalPages; i++)
      expect(screen.getByRole('button', { name: 'page ' + i })).toBeTruthy();
  });

  it('disables prev button if on first page', () => {
    render(<Pagination {...validProps} totalPages={3} currentPage={1} />);
    const prevPageButton = screen.getByLabelText('prev page').closest('button');
    expect(prevPageButton?.disabled).toBe(true);
  });

  it('disables next button if on last page', () => {
    render(<Pagination {...validProps} totalPages={3} currentPage={3} />);
    const nextPageButton = screen.getByLabelText('next page').closest('button');
    expect(nextPageButton?.disabled).toBe(true);
  });

  it('calls onPageSelect handler when page button is clicked', async () => {
    const totalPages = 3;
    render(
      <Pagination {...validProps} totalPages={totalPages} currentPage={3} />
    );
    const user = userEvent.setup();

    for (let i = 1; i <= totalPages; i++) {
      const pageButton = screen.getByRole('button', { name: 'page ' + i });
      await user.click(pageButton);
      expect(onPageSelect).toHaveBeenCalledWith(i);
    }
  });

  it('calls onPageSelect handler with previous page as value when clicking on prev button', async () => {
    const currentPage = 3;
    render(
      <Pagination {...validProps} totalPages={3} currentPage={currentPage} />
    );
    const prevPageButton = screen.getByLabelText('prev page');
    const user = userEvent.setup();

    await user.click(prevPageButton);
    expect(onPageSelect).toHaveBeenCalledWith(currentPage - 1);
  });

  it('calls onPageSelect handler with next page as value when clicking on next button', async () => {
    const currentPage = 1;
    render(
      <Pagination {...validProps} totalPages={3} currentPage={currentPage} />
    );
    const nextPageButton = screen.getByLabelText('next page');
    const user = userEvent.setup();

    await user.click(nextPageButton);
    expect(onPageSelect).toHaveBeenCalledWith(currentPage + 1);
  });
});
