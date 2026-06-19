import {
  fireEvent,
  mockAuth,
  render,
  screen,
  waitFor,
  within,
} from '@dans-coding-world/public-blog-tools';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import EditUserProfile from '../EditUserProfile';
import { BaseResponse } from '@dans-coding-world/api-types';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { generateMockUserResponse } from '@dans-coding-world/shared-user-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';
import { useUpdateProfile } from '@dans-coding-world/public-blog-shared-hooks';
import userEvent from '@testing-library/user-event';
import type { Profile } from '@dans-coding-world/prisma-schema';

// TODO: somehow remove this nasty copy-paste
// mock only "useAuth" from shared hooks module
vi.mock('@dans-coding-world/public-blog-shared-hooks');
vi.mock('@dans-coding-world/public-blog-data-access-api');

const mockUserResponse = generateMockUserResponse({});
const testUser = mockUserResponse.data?.user as UserDetail;

describe('EditUserProfile', () => {
  const renderFeature = (user: UserDetail = testUser) => {
    return render(
      <MemoryRouter>
        <EditUserProfile userId={user.id} />
      </MemoryRouter>,
    );
  };

  const mockProfileUpdate = ({
    result = {},
  }: {
    result?: Partial<ReturnType<typeof useUpdateProfile>>;
  }) => {
    const returnValue = {
      isSubmitting: false,
      error: null,
      updateProfile: vi.fn(),
      isSuccess: false,
      reset: vi.fn(),
      ...result,
    };
    vi.mocked(useUpdateProfile).mockReturnValue(returnValue);
    return returnValue;
  };

  const validUpdateFields = {
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Some random bio',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    mockProfileUpdate({});
    vi.mocked(api.get<BaseResponse>).mockResolvedValue(mockUserResponse);
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('calls "reset()" from useUpdateProfile hook on mount', () => {
    const { reset } = mockProfileUpdate({});
    renderFeature();
    expect(reset).toHaveBeenCalled();
  });

  it('renders as an <form> element', async () => {
    const { container } = renderFeature();
    expect((container.firstChild as HTMLElement).tagName).toBe('FORM');
  });

  test.each(['First Name', 'Last Name'])(
    'contains "%s" input field',
    (name) => {
      renderFeature();
      const inputField = screen.getByLabelText(name);
      expect(inputField).toBeTruthy();
      expect(inputField.tagName).toBe('INPUT');
    },
  );

  it('contains "Bio" textarea field', () => {
    renderFeature();
    const bioTextArea = screen.getByLabelText('Bio');
    expect(bioTextArea).toBeTruthy();
    expect(bioTextArea.tagName).toBe('TEXTAREA');
  });

  it('should render error message on useUpdateProfile() hook returning an error', () => {
    const errorMessage = 'Failed to updateProfile';
    mockProfileUpdate({ result: { error: new Error(errorMessage) } });
    renderFeature();
    expect(screen.getByText(errorMessage)).toBeTruthy();
  });

  test.each([
    ['First Name', 'firstName', 'first-name-warning'],
    ['Last Name', 'lastName', 'last-name-warning'],
    ['Bio', 'bio', 'bio-warning'],
  ])(
    'should render warning for %s field if populated and set to empty string',
    async (labelName: string, prop: string, warningTestId: string) => {
      const user = userEvent.setup();
      vi.clearAllMocks();
      mockAuth({
        isAuthenticated: true,
        user: testUser,
      });
      mockProfileUpdate({});

      renderFeature();

      await waitFor(async () => {
        if (!testUser.profile) throw new Error('Missing profile mock');
        await screen.findByDisplayValue(
          testUser.profile[prop as keyof Profile],
        );
      });

      const input = screen.getByLabelText(labelName);

      await user.clear(input);

      await waitFor(() => {
        expect(
          within(screen.getByTestId(warningTestId)).getByText(
            'Field will be cleared',
          ),
        ).toBeInTheDocument();
      });
    },
  );

  it('calls "updateProfile()" on submit with valid form fields', async () => {
    const user = userEvent.setup();
    const { updateProfile } = mockProfileUpdate({});
    renderFeature();

    const saveButton = screen.getByRole('button', {
      name: 'Save',
    });

    await updateField(user, 'First Name', validUpdateFields.firstName);
    await updateField(user, 'Last Name', validUpdateFields.lastName);
    await updateField(user, 'Bio', validUpdateFields.bio);

    fireEvent(saveButton, new MouseEvent('click'));

    expect(updateProfile).toHaveBeenCalledWith({
      ...validUpdateFields,
      userId: testUser.id,
    });
  });

  it('should revert form fields to previous values on clicking "Revert changes"', async () => {
    const user = userEvent.setup();
    vi.clearAllMocks();

    if (!testUser.profile) throw new Error('Missing profile details');

    mockAuth({
      isAuthenticated: true,
      user: testUser,
    });

    mockProfileUpdate({});

    renderFeature();

    await screen.findByDisplayValue(testUser.profile.firstName);

    await updateField(user, 'First Name', validUpdateFields.firstName);
    await updateField(user, 'Last Name', validUpdateFields.lastName);
    await updateField(user, 'Bio', validUpdateFields.bio);

    const revertButton = screen.getByRole('button', {
      name: /revert changes/i,
    });
    await user.click(revertButton);

    expectFieldValue('First Name', testUser.profile.firstName);
    expectFieldValue('Last Name', testUser.profile.lastName);
    expectFieldValue('Bio', testUser.profile.bio);
  });

  it(`after clicking "Remove" on profile picture, 
    on submit it will call "updateProfile()" with flag "removeAvatar" = true`, async () => {
    const user = userEvent.setup();
    const { updateProfile } = mockProfileUpdate({});
    renderFeature();
    const removeAvatar = screen.getByRole('button', { name: /remove/i });
    await user.click(removeAvatar);

    const saveButton = screen.getByRole('button', {
      name: 'Save',
    });
    fireEvent(saveButton, new MouseEvent('click'));

    expect(updateProfile).toHaveBeenCalledWith({
      userId: testUser.id,
      removeAvatar: true,
    });
  });

  it('should render profile avatar (if present) or default avatar', async () => {
    renderFeature();
    await waitFor(() => {
      if (testUser.profile?.avatarURL) {
        expect(
          screen.getByRole('img', {
            name: `${testUser.username}'s avatar`,
          }),
        ).toBeInTheDocument();
      } else
        expect(
          screen.getByLabelText(`Default user avatar`),
        ).toBeInTheDocument();
    });
  });

  it('should display user selected avatar after selecting profile picture', async () => {
    const user = userEvent.setup();
    const file = new File(['(⌐□_□)'], 'chuck-norris.png', {
      type: 'image/png',
    });
    renderFeature();
    const mockUrl = 'blob:cloudflare/chuck.png';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

    const fileUpload = screen.getByTestId('file-input');
    await user.upload(fileUpload, file);
    expect(screen.getByRole('img')).toHaveAttribute('src', mockUrl);
  });

  it('should remove selected avatar after clicking on "Remove" button for avatar', async () => {
    const user = userEvent.setup();
    const file = new File(['(⌐□_□)'], 'chuck-norris.png', {
      type: 'image/png',
    });
    renderFeature();
    const mockUrl = 'blob:cloudflare/chuck.png';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

    const fileUpload = screen.getByTestId('file-input');
    await user.upload(fileUpload, file);
    expect(screen.getByRole('img')).toHaveAttribute('src', mockUrl);

    const removeAvatar = screen.getByRole('button', { name: /remove/i });
    await user.click(removeAvatar);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByLabelText(`Default user avatar`)).toBeInTheDocument();
  });

  it('should remove selected avatar after clicking on "Revert changes" button for avatar', async () => {
    const user = userEvent.setup();
    const file = new File(['(⌐□_□)'], 'chuck-norris.png', {
      type: 'image/png',
    });
    renderFeature();
    const mockUrl = 'blob:cloudflare/chuck.png';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

    const fileUpload = screen.getByTestId('file-input');
    await user.upload(fileUpload, file);
    expect(screen.getByRole('img')).toHaveAttribute('src', mockUrl);

    const revertChanges = screen.getByRole('button', {
      name: /revert changes/i,
    });
    await user.click(revertChanges);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByLabelText(`Default user avatar`)).toBeInTheDocument();
  });

  async function updateField(
    user: ReturnType<typeof userEvent.setup>,
    label: string,
    newValue: string,
  ) {
    const input = screen.getByLabelText(label);
    await user.clear(input);
    await user.type(input, newValue);
    expect(screen.getByDisplayValue(newValue)).toBeInTheDocument();
  }

  function expectFieldValue(label: string, value: string) {
    expect(screen.getByLabelText(label)).toHaveValue(value);
  }
});
