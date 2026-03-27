import {
  fireEvent,
  render,
  screen,
} from '@dans-coding-world/public-blog-tools';
import userEvent from '@testing-library/user-event';
import { UserLogin } from '../UserLogin';
import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@dans-coding-world/public-blog-shared-hooks');

const mockAuthData = (data: ReturnType<typeof useAuth>) =>
  vi.mocked(useAuth).mockReturnValue(data);

describe('UserLogin', () => {
  const defaultAuthData = {
    user: null,
    isAuthenticated: false,
    error: null,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  };

  const renderFeature = () => {
    return render(
      <MemoryRouter>
        <UserLogin />
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

  it('renders as an <form> element', async () => {
    const { container } = renderFeature();
    expect((container.firstChild as HTMLElement).tagName).toBe('FORM');
  });

  it('contains "Email" input field', () => {
    renderFeature();
    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeTruthy();
    expect(emailInput.tagName).toBe('INPUT');
  });

  it('contains "Password" password field', () => {
    renderFeature();
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.tagName).toBe('INPUT');
  });

  it('should render error message on useAuth() hook returning an error', () => {
    const errorMessage = 'Failed to login';
    mockAuthData({ ...defaultAuthData, error: new Error(errorMessage) });
    renderFeature();
    expect(screen.getByText(errorMessage)).toBeTruthy();
  });

  it(`should call login() method from useAuth() hook, on "Login" button click
    and username and password fields filled`, async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn();
    mockAuthData({
      ...defaultAuthData,
      login: mockLogin,
    });
    renderFeature();

    // Check that login() does not get called on empty inputs
    const loginButton = screen.getByRole('button', { name: 'Login' });
    fireEvent(loginButton, new MouseEvent('click'));
    expect(mockLogin).not.toHaveBeenCalled();

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    const email = 'valid@email.com';
    const pass = 'validPassword';

    await user.type(emailInput, email);
    await user.type(passwordInput, pass);
    fireEvent(loginButton, new MouseEvent('click'));
    expect(mockLogin).toHaveBeenCalledWith({ email, password: pass });
  });
});
