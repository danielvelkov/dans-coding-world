import { render, screen } from '@dans-coding-world/public-blog-tools';
import '@testing-library/jest-dom';

import Tag from '../components/Tag';
import userEvent from '@testing-library/user-event';

describe('Tag', () => {
  const validProps = {
    isActive: false,
    name: 'tag-1',
    onClick: vi.fn(),
  };

  it('renders successfully provided that valid data is passed', () => {
    const { baseElement } = render(<Tag {...validProps} />);
    expect(baseElement).toBeTruthy();
  });

  it('renders as button', async () => {
    render(<Tag {...validProps} />);
    expect(
      screen.getByRole('button', { name: new RegExp(validProps.name) })
    ).toBeInTheDocument();
  });

  it('renders as pressed button when isActive is true', async () => {
    render(<Tag {...validProps} isActive={true} />);

    expect(
      screen.getByRole('button', { name: new RegExp(validProps.name) })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([
    ['Remove .*', true],
    ['Add .*', false],
  ])(
    'renders with aria-label="%s tag filter" if isActive is %s',
    (label, isActive) => {
      render(<Tag {...validProps} isActive={isActive} />);
      expect(
        screen.getByRole('button', { name: new RegExp(validProps.name) })
      ).toHaveAttribute('aria-label', expect.stringMatching(new RegExp(label)));
    }
  );

  it('calls onClick with set name', async () => {
    render(<Tag {...validProps} />);
    const user = userEvent.setup();

    await user.click(
      screen.getByRole('button', { name: new RegExp(validProps.name) })
    );
    expect(validProps.onClick).toHaveBeenCalledWith(validProps.name);
  });
});
