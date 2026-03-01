import { render, screen } from '@dans-coding-world/public-blog-tools';
import '@testing-library/jest-dom';

import UserAvatar from '../components/UserAvatar';

describe('UserAvatar', () => {
  const validProps = {
    avatarURL:
      'https://web.archive.org/web/19991008210347im_/http://sophie.net/images/sophie.jpg',
    name: 'Sophie',
  };

  it('renders successfully provided that valid data is passed', () => {
    const { baseElement } = render(<UserAvatar {...validProps} />);
    expect(baseElement).toBeTruthy();
  });

  it('renders as an img', async () => {
    render(<UserAvatar {...validProps} />);
    expect(screen.getByRole('img', { name: /Sophie/i })).toBeInTheDocument();
  });

  it('renders an icon in its place when no avatarURL provided', async () => {
    render(<UserAvatar {...validProps} avatarURL={null as any} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/default.*avatar/i)).toBeInTheDocument()
  });
});
