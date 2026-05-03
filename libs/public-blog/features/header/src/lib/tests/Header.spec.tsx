import { render, screen, mockAuth } from '@dans-coding-world/public-blog-tools';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { MemoryRouter } from 'react-router-dom';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

vi.mock('@dans-coding-world/public-blog-shared-hooks');

describe('Header', () => {
  const defaultProps: Parameters<typeof Header>[0] = {
    isDarkMode: false,
    setIsDarkMode: vi.fn(),
  };

  const renderFeature = (props = defaultProps) => {
    return render(
      <MemoryRouter>
        <Header {...props} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuth({
      user: generateRandomUser(),
    });
  });

  it('renders successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('renders as a <header> element', () => {
    const { container } = renderFeature();
    expect((container.firstChild as HTMLElement).tagName).toBe('HEADER');
  });

  it('contains links to blog and login by default', () => {
    renderFeature();
    screen.getByRole('link', { name: /blog/i });
    screen.getByRole('link', { name: /login/i });
  });

  it('changes login link to user profile dropdown if user logged in', async () => {
    const randomUser = generateRandomUser();
    mockAuth({
      isAuthenticated: true,
      user: randomUser,
    });

    renderFeature();

    expect(screen.queryByRole('link', { name: /login/i })).toBeFalsy();
    expect(
      screen.getByRole('button', {
        name: /avatar/,
      })
    ).toBeTruthy();
    expect(screen.getByText(randomUser.email)).toBeTruthy();
  });

  it('contains dark/light theme change button', () => {
    renderFeature();
    expect(screen.getByRole('button', { name: /change.*mode/i })).toBeTruthy();
  });

  it('sets to opposite theme on "change mode" button click ', async () => {
    const user = userEvent.setup();
    renderFeature();
    const changeModeButton = screen.getByRole('button', {
      name: /change.*mode/i,
    });

    await user.click(changeModeButton);
    expect(defaultProps.setIsDarkMode).toHaveBeenCalledWith(
      !defaultProps.isDarkMode
    );
  });
});
