import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import Dropdown from '../components/Dropdown';

describe('Dropdown', () => {
  const onItemSelect = vi.fn();
  const validProps = {
    values: [10, 25, 50].map((value) => ({ value, label: value.toString() })),
    currentValue: 25,
    onItemSelect,
  };

  it('renders successfully provided that valid data is passed', () => {
    const { baseElement } = render(<Dropdown {...validProps} />);
    expect(baseElement).toBeTruthy();
  });
});
