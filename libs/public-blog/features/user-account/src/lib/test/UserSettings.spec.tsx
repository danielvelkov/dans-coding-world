import {
  fireEvent,
  mockAuth,
  render,
  screen,
  waitFor,
  within,
} from '@dans-coding-world/public-blog-tools';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import UserSettings from '../UserSettings';
import { BaseResponse } from '@dans-coding-world/api-types';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { generateMockUserResponse } from '@dans-coding-world/shared-user-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';
import {
  useChangePassword,
  useDeleteAccount,
} from '@dans-coding-world/public-blog-shared-hooks';
import userEvent from '@testing-library/user-event';
import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { passwordGenerator } from '@dans-coding-world/helpers';

// TODO: somehow remove this nasty copy-paste
// mock only "useAuth" from shared hooks module
vi.mock('@dans-coding-world/public-blog-shared-hooks');
vi.mock('@dans-coding-world/shared-data-access-api');

const mockUserResponse = generateMockUserResponse({});
const testUser = mockUserResponse.data?.user as UserDetail;

describe('UserSettings', () => {
  const renderFeature = (user: UserDetail = testUser) => {
    return render(
      <MemoryRouter>
        <UserSettings />
      </MemoryRouter>
    );
  };

  const mockPasswordUpdate = ({
    result = {},
  }: {
    result?: Partial<ReturnType<typeof useChangePassword>>;
  }) => {
    const returnValue = {
      isSubmitting: false,
      error: null,
      changePassword: vi.fn(),
      isSuccess: false,
      reset: vi.fn(),
      ...result,
    };
    vi.mocked(useChangePassword).mockReturnValue(returnValue);
    return returnValue;
  };

  const mockDeleteAccount = ({
    result = {},
  }: {
    result?: Partial<ReturnType<typeof useDeleteAccount>>;
  }) => {
    const returnValue = {
      isSubmitting: false,
      error: null,
      deleteAccount: vi.fn(),
      isSuccess: false,
      reset: vi.fn(),
      ...result,
    };
    vi.mocked(useDeleteAccount).mockReturnValue(returnValue);
    return returnValue;
  };

  const validPassword = passwordGenerator(
    USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 6,
    {
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      includeUppercase: true,
    }
  );
  const validChangePasswordFields = {
    oldPassword: testUser.password,
    newPassword: validPassword,
    confirmPassword: validPassword,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth({ isLoading: false, isRefreshing: false, user: testUser });
    mockPasswordUpdate({});
    mockDeleteAccount({});
    vi.mocked(api.get<BaseResponse>).mockResolvedValue(mockUserResponse);
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('renders as an <form> element', async () => {
    const { container } = renderFeature();
    expect((container.firstChild as HTMLElement).tagName).toBe('FORM');
  });

  describe('Change password section', () => {
    it('calls "reset()" from useChangePassword hook on mount', () => {
      const { reset } = mockPasswordUpdate({});
      renderFeature();
      expect(reset).toHaveBeenCalled();
    });

    test.each(['Old Password', 'New Password', 'Confirm Password'])(
      'contains "%s" input field',
      (name) => {
        renderFeature();
        const inputField = screen.getByLabelText(name);
        expect(inputField).toBeTruthy();
        expect(inputField.tagName).toBe('INPUT');
      }
    );

    it('should render error message on useChangePassword() hook returning an error', () => {
      const errorMessage = 'Failed to change password';
      mockPasswordUpdate({ result: { error: new Error(errorMessage) } });
      renderFeature();
      expect(screen.getByText(errorMessage)).toBeTruthy();
    });

    it('should render success message on useChangePassword() hook returning isSuccess = true', () => {
      mockPasswordUpdate({ result: { isSuccess: true } });
      renderFeature();
      expect(screen.getByText('Password changed successfully')).toBeTruthy();
    });

    it('should display "Change password" button as loading spinner if isSubmitting = true ', () => {
      mockPasswordUpdate({ result: { isSubmitting: true } });
      renderFeature();
      expect(
        screen.queryByRole('button', {
          name: 'Change',
        })
      ).toBeFalsy();
      expect(screen.queryByRole('status')).toBeTruthy();
    });

    it(`should render error message if "New Password" and
     "Confirm password" do not match on submit`, async () => {
      const user = userEvent.setup();
      const { changePassword } = mockPasswordUpdate({});
      renderFeature();

      const changePasswordButton = screen.getByRole('button', {
        name: 'Change',
      });
      const { oldPassword, newPassword, confirmPassword } =
        validChangePasswordFields;

      await updateField(user, 'Old Password', oldPassword);
      await updateField(user, 'New Password', newPassword);
      await updateField(user, 'Confirm Password', confirmPassword + '1');

      fireEvent(changePasswordButton, new MouseEvent('click'));

      expect(changePassword).not.toHaveBeenCalled();
      expect(screen.getByText(/passwords do not match/i)).toBeTruthy();
    });

    it('calls "changePassword()" on submit with valid form fields', async () => {
      const user = userEvent.setup();
      const { changePassword } = mockPasswordUpdate({});
      renderFeature();

      const changePasswordButton = screen.getByRole('button', {
        name: 'Change',
      });
      const { oldPassword, newPassword, confirmPassword } =
        validChangePasswordFields;

      await updateField(user, 'Old Password', oldPassword);
      await updateField(user, 'New Password', newPassword);
      await updateField(user, 'Confirm Password', confirmPassword);

      fireEvent(changePasswordButton, new MouseEvent('click'));

      expect(changePassword).toHaveBeenCalledWith({
        oldPassword,
        newPassword,
      });
    });
  });

  describe('Delete profile section', () => {
    it('contains "Delete Profile" button', () => {
      renderFeature();
      const deleteProfileButton = screen.getByRole('button', {
        name: /delete.*/i,
      });
      expect(deleteProfileButton).toBeTruthy();
    });

    it(`selecting "Delete Profile" button opens dialog,
       prompting user if he is sure that he wants to delete account`, async () => {
      const user = userEvent.setup();
      renderFeature();
      const deleteProfileButton = screen.getByRole('button', {
        name: /delete.*/i,
      });
      await user.click(deleteProfileButton);

      await waitFor(() => {
        expect(
          screen.getByText(/are you sure you want to delete your account/i)
        ).toBeInTheDocument();
      });
    });

    it(`confirming "Account Deletion" dialog calls deleteAccount() action from useDeleteAccount() hook`, async () => {
      const user = userEvent.setup();
      const deleteAccountMock = vi.fn();
      renderFeature();
      mockDeleteAccount({ result: { deleteAccount: deleteAccountMock } });
      const deleteProfileButton = screen.getByRole('button', {
        name: /delete.*/i,
      });
      await user.click(deleteProfileButton);
      const modal = screen.getByRole('dialog');
      const confirmButton = within(modal).getByLabelText('Delete account');

      await user.click(confirmButton);
      expect(deleteAccountMock).toHaveBeenCalledWith(testUser.id);
    });

    it(`calls logout method from useAuth() hook, 
       on useDeleteAccount() hook returning isSuccess = true`, () => {
      const logoutMock = vi.fn();
      mockAuth({ logout: logoutMock });
      mockDeleteAccount({ result: { isSubmitting: false, isSuccess: true } });
      renderFeature();
      expect(logoutMock).toHaveBeenCalled();
    });
  });

  async function updateField(
    user: ReturnType<typeof userEvent.setup>,
    label: string,
    newValue: string
  ) {
    const input = screen.getByLabelText(label);
    await user.clear(input);
    await user.type(input, newValue);
  }
});
