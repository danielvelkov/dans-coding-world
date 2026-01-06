import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ItemsPerPage from '../components/items-per-page';

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
    for (const value of validProps.values) {
      fireEvent.change(screen.getByRole('combobox'), { target: { value } });
      expect(onItemSelect).toHaveBeenCalledWith(value.toString());
    }
  });
});
