import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import ItemsPerPage from './items-per-page';

describe('Items per page', () => {
  const onItemSelect = vi.fn();
  const validProps = {
    values: [10, 25, 50],
    currentValue: 25,
    onItemSelect,
  };

  it('renders successfully provided that valid data is passed', () => {
    const { baseElement } = render(<ItemsPerPage {...validProps} />);
    expect(baseElement).toBeTruthy();
  });

  it('renders same amount of options as values param', () => {
    render(<ItemsPerPage {...validProps} />);
    expect(screen.getAllByRole('option').length).toBe(validProps.values.length);
  });

  it('correctly sets the current value', () => {
    render(<ItemsPerPage {...validProps} />);
    for (const option of screen.getAllByRole('option') as HTMLOptionElement[])
      if (option.value === validProps.currentValue.toString())
        expect(option.selected).toBe(true);
      else expect(option.selected).toBe(false);
  });

  it('calls onItemSelect handler when item option is clicked', async () => {
    render(<ItemsPerPage {...validProps} />);
    const user = userEvent.setup();

    for (let i = 0; i < validProps.values.length; i++) {
      const pageButton = screen.getByRole('option', {
        name: validProps.values[i].toString(),
      });
      await user.click(pageButton);
      expect(onItemSelect).toHaveBeenCalledWith(validProps.values[i]);
    }
  });
});
