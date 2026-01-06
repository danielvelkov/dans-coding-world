import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import SearchBox from '../components/search-box';

describe('SearchBox', () => {
  const validProps = {
    currentValue: 'Search query',
    onChange: vi.fn(),
  };

  it('renders successfully provided that valid data is passed', () => {
    const { baseElement } = render(<SearchBox {...validProps} />);
    expect(baseElement).toBeTruthy();
  });

  it('correctly sets the current value', () => {
    render(<SearchBox {...validProps} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue(validProps.currentValue);
  });

  it('calls onChange handler when user inputs text', async () => {
    render(<SearchBox {...validProps} currentValue="" />);
    const user = userEvent.setup();

    const input = screen.getByRole('textbox');
    const typedString = 'TEST';

    await user.type(input, typedString);
    expect(validProps.onChange).toHaveBeenCalledWith(typedString);
  });
});
