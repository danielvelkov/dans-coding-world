import { render, screen } from '@dans-coding-world/public-blog-tools';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@dans-coding-world/public-blog-shared-hooks');

const mockAuthData = (data: ReturnType<typeof useAuth>) =>
  vi.mocked(useAuth).mockReturnValue(data);

describe('Header', () => {
  const defaultAuthData = {
    user: null,
    isAuthenticated: false,
    error: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };

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

    mockAuthData(defaultAuthData);
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

  it('changes login link to logout if "isAuthenticated" is true', async () => {
    mockAuthData({
      ...defaultAuthData,
      isAuthenticated: true,
    });

    renderFeature();

    expect(screen.queryByRole('link', { name: /login/i })).toBeFalsy();
    expect(screen.getByRole('link', { name: /logout/i })).toBeTruthy();
  });

  it('calls logout action from useAuth hook on "logout" button click', async () => {
    const user = userEvent.setup();
    mockAuthData({
      ...defaultAuthData,
      isAuthenticated: true,
    });

    renderFeature();

    const logoutButton = screen.getByRole('link', { name: /logout/i });
    await user.click(logoutButton);
    expect(defaultAuthData.logout).toHaveBeenCalledOnce();
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
