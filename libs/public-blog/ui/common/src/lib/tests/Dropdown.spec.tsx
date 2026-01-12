import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import Dropdown from '../components/Dropdown';

describe('Dropdown', () => {
  const validProps = {
    values: [5, 10, 25].map((value) => ({ value, label: value.toString() })),
    currentValue: 25,
    onItemSelect: vi.fn(),
  };

  it('renders successfully provided that valid data is passed', () => {
    const { baseElement } = render(<Dropdown {...validProps} />);
    expect(baseElement).toBeTruthy();
  });

  it('renders the current value as selected', async () => {
    render(<Dropdown {...validProps} />);
    expect(screen.getByText(validProps.currentValue)).toBeInTheDocument();
    expect(
      screen.queryByText(
        validProps.values.filter(
          ({ value }) => value !== validProps.currentValue
        )?.[0].value
      )
    ).not.toBeInTheDocument();
  });

  it('calls onItemSelect handler when user selects a value', async () => {
    render(<Dropdown {...validProps} />);
    const user = userEvent.setup();

    const dropdown = screen.getByRole('combobox');
    await user.click(dropdown);

    const otherValue = validProps.values.filter(
      ({ value }) => value !== validProps.currentValue
    )?.[0].value;

    const option = await screen.findByRole('option', {
      name: otherValue.toString(),
    });
    await user.click(option);

    expect(validProps.onItemSelect).toHaveBeenCalledWith(otherValue);
  });
});
