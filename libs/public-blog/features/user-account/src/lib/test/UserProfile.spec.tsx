import {
  mockAuth,
  render,
  screen,
  waitFor,
  within,
} from '@dans-coding-world/public-blog-tools';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import UserProfile from '../UserProfile';
import { BaseResponse } from '@dans-coding-world/api-types';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { generateMockUserResponse } from '@dans-coding-world/shared-user-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';

// TODO: somehow remove this nasty copy-paste
// mock only "useAuth" from shared hooks module
vi.mock(
  '@dans-coding-world/public-blog-shared-hooks',
  async (importOriginal) => {
    return {
      ...(await importOriginal()),
      useAuth: vi.fn(),
    };
  },
);
vi.mock('@dans-coding-world/public-blog-data-access-api');

const mockUserResponse = generateMockUserResponse({});
const testUser = mockUserResponse.data?.user as UserDetail;

describe('UserProfile', () => {
  const renderFeature = (user: UserDetail = testUser) => {
    return render(
      <MemoryRouter>
        <UserProfile userId={user.id} />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    vi.mocked(api.get<BaseResponse>).mockResolvedValue(mockUserResponse);
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('should render username as h2', async () => {
    renderFeature();
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe(testUser.username);
    });
  });

  it('should render profile details in a <dl>', async () => {
    renderFeature();
    await waitFor(() => {
      const descriptionList = screen.getByTestId('user-info');
      within(descriptionList).getByText(testUser.profile?.firstName ?? '-');
      within(descriptionList).getByText(testUser.profile?.lastName ?? '-');
      within(descriptionList).getByText(testUser.profile?.bio ?? '-');
      expect(
        within(descriptionList).queryByText(testUser.email ?? '-'),
      ).not.toBeInTheDocument();
    });
  });

  it('should show email if logged in as same user', async () => {
    vi.clearAllMocks();
    mockAuth({
      user: testUser,
      isAuthenticated: true,
    });
    vi.mocked(api.get<BaseResponse>).mockResolvedValue(mockUserResponse);
    renderFeature();
    await waitFor(() => {
      const descriptionList = screen.getByTestId('user-info');
      expect(
        within(descriptionList).queryByText(testUser.email ?? '-'),
      ).toBeInTheDocument();
    });
  });

  test.each(['Logout', 'Edit', 'Settings'])(
    'should show "%s" button if logged in as same user',
    async (name) => {
      vi.clearAllMocks();
      mockAuth({
        user: testUser,
        isAuthenticated: true,
      });
      vi.mocked(api.get<BaseResponse>).mockResolvedValue(mockUserResponse);
      renderFeature();
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: new RegExp(name) }),
        ).toBeInTheDocument();
      });
    },
  );

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
});
