import {
  fireEvent,
  render,
  screen,
  mockAuth,
} from '@dans-coding-world/public-blog-tools';
import UserRegistration from '../UserRegistration';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { useRegister } from '@dans-coding-world/public-blog-shared-hooks';

vi.mock('@dans-coding-world/public-blog-shared-hooks');

describe('UserRegistration', () => {
  const renderFeature = () => {
    return render(
      <MemoryRouter>
        <UserRegistration />
      </MemoryRouter>
    );
  };

  const mockRegistration = ({
    result = {},
  }: {
    result?: Partial<ReturnType<typeof useRegister>>;
  }) => {
    const returnValue = {
      isSubmitting: false,
      error: null,
      register: vi.fn(),
      ...result,
    };
    vi.mocked(useRegister).mockReturnValue(returnValue);
    return returnValue;
  };

  const validFormFields = {
    email: 'valid@email.com',
    username: 'john1doe3',
    password: 'passWord123@',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuth();
    mockRegistration({});
  });

  it('renders successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('renders as an <form> element', async () => {
    const { container } = renderFeature();
    expect((container.firstChild as HTMLElement).tagName).toBe('FORM');
  });

  test.each(['Email Address', 'Username'])(
    'contains "%s" input field',
    (name) => {
      renderFeature();
      const emailInput = screen.getByLabelText(name);
      expect(emailInput).toBeTruthy();
      expect(emailInput.tagName).toBe('INPUT');
    }
  );

  test.each(['Password', 'Confirm Password'])(
    'contains "%s" password field',
    (name) => {
      renderFeature();
      const passwordInput = screen.getByLabelText(name);
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.tagName).toBe('INPUT');
      expect(passwordInput).toHaveAttribute('type', 'password');
    }
  );

  it('should render error message on useRegister() hook returning an error', () => {
    const errorMessage = 'Failed to register';
    mockRegistration({ result: { error: new Error(errorMessage) } });
    renderFeature();
    expect(screen.getByText(errorMessage)).toBeTruthy();
  });

  it(`should render error message if "Password" and
     "Confirm password" do not match on register`, async () => {
    const user = userEvent.setup();
    renderFeature();

    const emailInput = screen.getByLabelText('Email Address');
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPassInput = screen.getByLabelText('Confirm Password');

    await user.type(emailInput, validFormFields.email);
    await user.type(usernameInput, validFormFields.username);
    await user.type(passwordInput, validFormFields.password);
    await user.type(confirmPassInput, validFormFields.password + '1');
    const registerButton = screen.getByRole('button', {
      name: 'Create Account',
    });
    fireEvent(registerButton, new MouseEvent('click'));
    expect(screen.getByText(/passwords do not match/i)).toBeTruthy();
  });

  it(`should call register() method, on "Create Account" button click
    and form fields populated correctly`, async () => {
    const user = userEvent.setup();
    const mockRegister = vi.fn();
    mockRegistration({
      result: { register: mockRegister },
    });
    renderFeature();

    // Check that register() does not get called on empty inputs
    const registerButton = screen.getByRole('button', {
      name: 'Create Account',
    });
    fireEvent(registerButton, new MouseEvent('click'));
    expect(mockRegister).not.toHaveBeenCalled();

    const emailInput = screen.getByLabelText('Email Address');
    const usernameInput = screen.getByLabelText('Username');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPassInput = screen.getByLabelText('Confirm Password');

    await user.type(emailInput, validFormFields.email);
    await user.type(usernameInput, validFormFields.username);
    await user.type(passwordInput, validFormFields.password);
    await user.type(confirmPassInput, validFormFields.password);
    fireEvent(registerButton, new MouseEvent('click'));
    expect(mockRegister).toHaveBeenCalledWith(validFormFields);
  });
});
