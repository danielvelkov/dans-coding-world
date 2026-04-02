import {
  fireEvent,
  render,
  screen,
  within,
} from '@dans-coding-world/public-blog-tools';
import { UserProfileDropdown } from '../components/UserProfileDropdown';
import { MemoryRouter } from 'react-router-dom';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

vi.mock('@dans-coding-world/public-blog-shared-hooks');

describe('UserProfileDropdown', () => {
  const mockUser = generateRandomUser();
  const mockLogout = vi.fn();
  const renderFeature = (user = mockUser) => {
    return render(
      <MemoryRouter>
        <UserProfileDropdown user={user} logoutAction={mockLogout} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it(`renders user's avatar as control that toggles dropdown`, () => {
    renderFeature();

    const avatarElement = screen.getByLabelText(/avatar/i);
    expect(avatarElement).toBeTruthy();
    togglesDropdownOnClick(avatarElement, false);
    togglesDropdownOnClick(avatarElement, true);
  });

  it(`renders user's username (or first name + last name) as
     control that toggles dropdown`, () => {
    renderFeature();

    const usernameElement = screen.getByText(
      mockUser.profile
        ? mockUser.profile.firstName + ' ' + mockUser.profile.lastName
        : mockUser.username
    );
    expect(usernameElement).toBeTruthy();
    togglesDropdownOnClick(usernameElement, false);
    togglesDropdownOnClick(usernameElement, true);
  });

  describe('expanded menu', () => {
    test.each(['profile', 'settings', 'logout'])(
      `has menuitem "%s"`,
      (name: string) => {
        renderFeature();
        toggleDropdown();
        const menu = screen.getByRole('menu');
        expect(
          within(menu).getByRole('menuitem', {
            name: new RegExp(`^${name}$`, 'i'),
          })
        );
      }
    );

    it(`has menuitem "create profile" if profile is not setup`, () => {
      renderFeature({ ...mockUser, profile: undefined });
      toggleDropdown();
      const menu = screen.getByRole('menu');
      expect(within(menu).getByRole('menuitem', { name: /^setup profile/i }));
    });

    it(`instead of "create profile", shows menu option to 
      edit profile if profile is already setup`, () => {
      renderFeature();
      toggleDropdown();
      const menu = screen.getByRole('menu');
      expect(within(menu).getByRole('menuitem', { name: /^edit profile/i }));
    });

    it('contains menu item for logout which logs out user on click', () => {
      renderFeature();
      expect(mockLogout).not.toHaveBeenCalled();
      toggleDropdown();
      const menu = screen.getByRole('menu');
      const logoutButton = within(menu).getByRole('menuitem', {
        name: /^logout/i,
      });
      fireEvent.click(logoutButton);
      expect(mockLogout).toHaveBeenCalled();
    });

    it('should close opened dropdown on menu item select', () => {
      renderFeature();
      toggleDropdown();
      const menu = screen.getByRole('menu');
      const editProfileAction = within(menu).getByRole('menuitem', {
        name: /^edit profile/i,
      });
      fireEvent.click(editProfileAction);
      expect(screen.queryByRole('menu')).toBeFalsy();
    });
  });

  function togglesDropdownOnClick(element: HTMLElement, toggled: boolean) {
    if (toggled) {
      expect(screen.getByRole('menu')).toBeTruthy();
      fireEvent.click(element);
      expect(screen.queryByRole('menu')).toBeFalsy();
    } else {
      expect(screen.queryByRole('menu')).toBeFalsy();
      fireEvent.click(element);
      expect(screen.getByRole('menu')).toBeTruthy();
    }
  }

  function toggleDropdown() {
    const avatarButton = screen.getByRole('button', {
      name: /avatar/,
    });
    fireEvent.click(avatarButton);
  }
});
