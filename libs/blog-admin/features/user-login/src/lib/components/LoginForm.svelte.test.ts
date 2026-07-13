import { type ComponentProps } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { expect, it, describe } from 'vitest';
import LoginForm from './LoginForm.svelte';
import { createValidationErrorDetailsList } from '@dans-coding-world/exceptions';
import type { ResponseErrorDetails } from '@dans-coding-world/api-types';

describe('LoginForm', () => {
  const renderFeature = async (
    params?: Partial<ComponentProps<typeof LoginForm>>,
  ) => await render(LoginForm, { handleSubmit: vi.fn(), ...params });

  it('renders successfully', async () => {
    const screen = await renderFeature();
    expect(screen).toBeDefined();
  });

  it('renders as an <form> element', async () => {
    const { container } = await renderFeature();
    expect((container.firstChild as HTMLElement).tagName).toBe('FORM');
  });

  it('contains "Email" input field', async () => {
    const screen = await renderFeature();
    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeTruthy();
    expect(emailInput.element().tagName).toBe('INPUT');
  });

  it('contains "Password" password field', async () => {
    const screen = await renderFeature();
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.element().tagName).toBe('INPUT');
  });

  it('calls handleSubmit() cb with email & password on pressing login button', async () => {
    const email = 'valid.email@gmail.com';
    const password = 'pa55w01d';
    const mockHandler = vi.fn();

    const screen = await renderFeature({ handleSubmit: mockHandler });

    const emailInput = screen.getByLabelText('Email');
    await emailInput.fill(email);

    const passwordInput = screen.getByLabelText('Password');
    await passwordInput.fill(password);

    const submit = screen.getByRole('button', { name: /login/i });
    await submit.click();

    expect(mockHandler).toHaveBeenCalledWith(email, password);
  });

  it('should display loading message in login button when isLoading = true', async () => {
    const screen = await renderFeature({ isLoading: true });
    const submit = screen.getByRole('button');
    expect(submit).toHaveTextContent(/logging in/i);
  });

  it('should render error message if error param is present', async () => {
    const errorMessage = new Error('Failed to login');
    const screen = await renderFeature({ error: errorMessage });
    const loginError = screen.getByTestId('login-error');
    expect(loginError).toBeInTheDocument();
    expect(loginError).toHaveTextContent(errorMessage.message);
  });

  test.each([
    ['email', 'Invalid email'],
    ['password', 'Wrong password'],
  ])(
    'should render error details if %s error param present with details',
    async (field: string, errorMessage: string) => {
      const errorDetails = createValidationErrorDetailsList([
        { property: field, constraints: { valid: errorMessage } },
      ]);
      const error: ResponseErrorDetails & Error = {
        name: 'Validation',
        status: 400,
        message: 'Failed to login',
        details: errorDetails,
      };
      const screen = await renderFeature({ error });
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    },
  );
});
