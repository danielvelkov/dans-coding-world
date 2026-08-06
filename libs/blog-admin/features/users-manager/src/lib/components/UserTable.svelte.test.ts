import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { expect, it, describe, vi } from 'vitest';

import UserTable from './UserTable.svelte';
import {
  OMITTED_COLUMN_NAMES,
  USERS_EMPTY_MESSAGE,
  USERS_LOADING_MESSAGE,
  USERS_NO_RESULTS_MESSAGE,
  TABLE_COLUMNS,
} from '../shared/user-table.constants.js';
import { randomSelect, range } from '@dans-coding-world/helpers';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';
import type { Profile, Role } from '@dans-coding-world/prisma-schema';

const USER_ROLES: Role[] = ['ADMIN', 'AUTHOR', 'MOD', 'USER'];

const admin = generateRandomUser({ id: 1, role: 'ADMIN' });
const otherAdmin = generateRandomUser({ id: 2, role: 'ADMIN' });
const user = generateRandomUser({ id: 3, role: 'USER' });

it('renders successfully', async () => {
  const screen = await render(UserTable);
  expect(screen).toBeDefined();
});

it('renders as <table> element in a wrapper', async () => {
  const { container } = await render(UserTable);
  expect((container.firstChild?.firstChild as HTMLElement).tagName).toBe(
    'TABLE',
  );
});

it.each(TABLE_COLUMNS)(`table contains "%s" column`, async (col) => {
  await render(UserTable);
  const thead = page.getByRole('columnheader', {
    name: !OMITTED_COLUMN_NAMES.includes(col) ? col : '',
  });

  expect(thead).toBeDefined();
});

it('table has additional thead row containing controls (Filter & Sort)', async () => {
  await render(UserTable, { users: [] });
  const table = page.getByRole('table');
  const controlRow = table.getByRole('row').all().slice(1)[0]; // skip primary header row

  expect(controlRow.getByLabelText(/sort by/i)).toBeInTheDocument();
  expect(controlRow.getByLabelText(/filter by/i)).toBeInTheDocument();
});

it('table displays empty message when no users are passed', async () => {
  await render(UserTable, { users: [] });
  expect(page.getByText(USERS_EMPTY_MESSAGE)).toBeInTheDocument();
});

it('table displays no results message when empty and filtering is active', async () => {
  await render(UserTable, {
    users: [],
    params: { filterBy: { isBanned: true } },
  });
  expect(page.getByText(USERS_NO_RESULTS_MESSAGE)).toBeInTheDocument();
});

it('table displays "loading" message on `isLoading` prop set to true', async () => {
  await render(UserTable, { isLoading: true });
  expect(page.getByText(USERS_LOADING_MESSAGE)).toBeInTheDocument();
});

it('table displays error message on `error` prop populated', async () => {
  const error = new Error('Failed to fetch users');
  await render(UserTable, { error });
  expect(page.getByText(new RegExp(error.message))).toBeInTheDocument();
});

describe('Rows', () => {
  const users = range(5).map(() => generateRandomUser());

  describe('Row columns', () => {
    it(`displays user avatar if profile's avatarUrl is set`, async () => {
      const imageURL = 'some.image.site/1';
      await render(UserTable, {
        users: [
          {
            ...user,
            profile: {
              ...(user.profile as Profile),
              avatarURL: imageURL,
            },
          },
        ],
      });
      const cell = getTableDataCell(0, TABLE_COLUMNS.indexOf('Avatar'));
      expect(cell.getByAltText(`${user.username}'s avatar`)).toHaveAttribute(
        'src',
        imageURL,
      );
    });

    it(`displays username in "Username" column`, async () => {
      await render(UserTable, { users });

      for (let i = 0; i < users.length; i++) {
        const cell = getTableDataCell(i, TABLE_COLUMNS.indexOf('Username'));
        expect(cell.getByText(users[i].username)).toBeInTheDocument();
      }
    });

    it(`displays email in "Email" column`, async () => {
      await render(UserTable, { users });

      for (let i = 0; i < users.length; i++) {
        const cell = getTableDataCell(i, TABLE_COLUMNS.indexOf('Email'));
        expect(cell.getByText(users[i].email)).toBeInTheDocument();
      }
    });

    it(`displays user role in uppercase in "Role" column`, async () => {
      await render(UserTable, { users });

      for (let i = 0; i < users.length; i++) {
        const cell = getTableDataCell(i, TABLE_COLUMNS.indexOf('Role'));
        expect(cell.getByText(users[i].role.toUpperCase())).toBeInTheDocument();
      }
    });

    it(`displays user ban status ( Active/Banned )`, async () => {
      await render(UserTable, { users });

      const colIndex = TABLE_COLUMNS.indexOf('Status');

      users.forEach((user, rowIndex) => {
        const cell = getTableDataCell(rowIndex, colIndex);
        expect(
          cell.getByText(user.isBanned ? 'Banned' : 'Active'),
        ).toBeInTheDocument();
      });
    });

    test(`displays action "delete" for admin`, async () => {
      await render(UserTable, { users: [user], viewer: admin });

      const colIndex = TABLE_COLUMNS.indexOf('Actions');
      const cell = getTableDataCell(0, colIndex);
      const action = cell.getByRole('button', {
        name: new RegExp(`delete`, 'i'),
      });

      expect(action).toBeInTheDocument();
    });

    it(`disables "Delete" action if the user in the table row is ADMIN`, async () => {
      await render(UserTable, {
        users: [admin],
        viewer: otherAdmin,
      });

      const colIndex = TABLE_COLUMNS.indexOf('Actions');
      const cell = getTableDataCell(0, colIndex);
      const deleteButton = cell.getByRole('button', { name: /delete/i });

      expect(deleteButton).toBeDisabled();
    });

    it('opens confirmation dialog on selecting "Delete" action', async () => {
      const mockDelete = vi.fn();
      const screen = await render(UserTable, {
        users: users.filter((u) => u.role !== 'ADMIN'),
        viewer: admin,
        onUserDelete: mockDelete,
      });
      const userTarget = users.filter((u) => u.role !== 'ADMIN')[0];
      const colIndex = TABLE_COLUMNS.indexOf('Actions');
      const cell = getTableDataCell(0, colIndex);

      await cell.getByRole('button', { name: /delete/i }).click();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeVisible();

      await dialog.getByRole('button', { name: /delete/i }).click();
      expect(mockDelete).toHaveBeenCalledWith(userTarget.id);
    });
  });

  describe('Expanded Row Details', () => {
    it('clicking "expand details" reveals row details panel', async () => {
      await render(UserTable, { users });
      const userTarget = users[0];

      await expandRow(0);

      const expandedRow = page.getByTestId(`row-details-${userTarget.id}`);
      expect(expandedRow).toBeInTheDocument();
      expect(expandedRow.getByText(`ID: ${userTarget.id}`)).toBeInTheDocument();
    });

    it('toggles collapse button and hides details panel when clicked again', async () => {
      await render(UserTable, { users });
      const userTarget = users[0];

      await expandRow(0);

      const row = getTableRow(0);
      const collapseDetailsButton = row.getByRole('button', {
        name: /collapse details/i,
      });
      expect(collapseDetailsButton).toBeInTheDocument();

      await collapseDetailsButton.click();

      await expect
        .element(page.getByTestId(`row-details-${userTarget.id}`))
        .not.toBeInTheDocument();
    });

    it('contains user first/last name and bio', async () => {
      const userTarget = users[0];
      await render(UserTable, { users });

      await expandRow(0);

      const expandedRow = page.getByTestId(`row-details-${userTarget.id}`);
      if (userTarget.profile) {
        expect(
          expandedRow.getByText(userTarget.profile.firstName),
        ).toBeInTheDocument();
        expect(
          expandedRow.getByText(userTarget.profile.lastName),
        ).toBeInTheDocument();
        expect(
          expandedRow.getByText(userTarget.profile.bio),
        ).toBeInTheDocument();
      }
    });

    describe('Actions', () => {
      test(`displays actions "change role" and "ban/unban" for admin`, async () => {
        await render(UserTable, { users, viewer: admin });
        await expandRow(0);

        const changeRoleAction = page.getByRole('button', {
          name: new RegExp(`change role`, 'i'),
        });
        const banAction = page.getByRole('button', {
          name: new RegExp(`ban`, 'i'),
        });

        expect(changeRoleAction).toBeInTheDocument();
        expect(banAction).toBeInTheDocument();
      });

      it(`disables actions in expanded row
          if the user in the table row is ADMIN`, async () => {
        await render(UserTable, { users: [admin], viewer: otherAdmin });
        await expandRow(0);

        const changeRoleAction = page.getByRole('button', {
          name: new RegExp(`change role`, 'i'),
        });
        const banAction = page.getByRole('button', {
          name: new RegExp(`ban`, 'i'),
        });

        expect(changeRoleAction).toBeDisabled();
        expect(banAction).toBeDisabled();
      });

      it('opens confirmation dialog on selecting "Ban/Unban" action', async () => {
        const mockBan = vi.fn();
        const screen = await render(UserTable, {
          users: users.filter((u) => u.role !== 'ADMIN'),
          viewer: admin,
          onUserBanStatusChange: mockBan,
        });
        const userTarget = users.filter((u) => u.role !== 'ADMIN')[0];
        await expandRow(0);
        await page.getByRole('button', { name: /ban/i }).click();

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeVisible();

        await dialog.getByRole('button', { name: /ban/i }).click();
        expect(mockBan).toHaveBeenCalledWith(
          userTarget.id,
          !userTarget.isBanned,
          expect.anything(),
        );
      });

      it(`keeps "Ban/Unban" confirmation dialog open and
         shows loading message until onSettled cb is called`, async () => {
        const mockBan = vi.fn();
        const screen = await render(UserTable, {
          users: users.filter((u) => u.role !== 'ADMIN'),
          viewer: admin,
          onUserBanStatusChange: mockBan,
        });
        await expandRow(0);
        await page.getByRole('button', { name: /ban/i }).click();

        const dialog = screen.getByRole('dialog');

        expect(dialog.getByText(/loading/i)).not.toBeInTheDocument();

        await dialog.getByRole('button', { name: /ban/i }).click();

        expect(dialog).toBeVisible();
        expect(dialog.getByText(/loading/i)).toBeInTheDocument();
        const onSettled = mockBan.mock.calls[0].at(-1); // call the onSettled
        onSettled();

        await expect
          .element(dialog.getByText(/loading/i))
          .not.toBeInTheDocument();
        await expect
          .element(screen.getByRole('dialog'))
          .not.toBeInTheDocument();
      });

      it('opens confirmation dialog on selecting "Change role" action', async () => {
        const mockChangeRole = vi.fn();
        const screen = await render(UserTable, {
          users: users.filter((u) => u.role !== 'ADMIN'),
          viewer: admin,
          onUserRoleChange: mockChangeRole,
        });
        const userTarget = users.filter((u) => u.role !== 'ADMIN')[0];
        await expandRow(0);
        await page.getByRole('button', { name: /change role/i }).click();

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeVisible();

        const roleSelect = dialog.getByRole('combobox', { name: /new role/i });
        expect(roleSelect).toBeInTheDocument();

        const randomNewRole = randomSelect(
          USER_ROLES.filter((r) => r !== userTarget.role && r !== 'ADMIN'),
        );
        await roleSelect.selectOptions([randomNewRole]);
        await dialog.getByRole('button', { name: /confirm change/i }).click();

        expect(mockChangeRole).toHaveBeenCalledWith(
          userTarget.id,
          randomNewRole,
          expect.anything(),
        );
      });

      it(`keeps "Change role" confirmation dialog open and
         shows loading message until onSettled cb is called`, async () => {
        const mockChangeRole = vi.fn();
        const screen = await render(UserTable, {
          users: users.filter((u) => u.role !== 'ADMIN'),
          viewer: admin,
          onUserRoleChange: mockChangeRole,
        });
        const userTarget = users.filter((u) => u.role !== 'ADMIN')[0];
        await expandRow(0);
        await page.getByRole('button', { name: /change role/i }).click();

        const dialog = screen.getByRole('dialog');
        expect(dialog.getByText(/loading/i)).not.toBeInTheDocument();

        const roleSelect = dialog.getByRole('combobox', { name: /new role/i });
        expect(roleSelect).toBeInTheDocument();

        const randomNewRole = randomSelect(
          USER_ROLES.filter((r) => r !== userTarget.role && r !== 'ADMIN'),
        );
        await roleSelect.selectOptions([randomNewRole]);
        await dialog.getByRole('button', { name: /confirm change/i }).click();
        expect(dialog).toBeVisible();
        expect(dialog.getByText(/loading/i)).toBeInTheDocument();
        const onSettled = mockChangeRole.mock.calls[0].at(-1); // call the onSettled
        onSettled();

        await expect
          .element(dialog.getByText(/loading/i))
          .not.toBeInTheDocument();
        await expect
          .element(screen.getByRole('dialog'))
          .not.toBeInTheDocument();
      });
    });
  });

  async function expandRow(rowIndex: number) {
    const row = getTableRow(rowIndex);
    const showDetailsToggle = row.getByRole('button', {
      name: /expand details/i,
    });
    await showDetailsToggle.click();
  }

  function getTableRow(rowIndex: number) {
    const table = page.getByRole('table');
    const rows = table.getByRole('row').all().slice(2); // skip thead row + control row
    if (rowIndex >= rows.length)
      throw new Error(
        `Row index bigger than available rows (${rowIndex} >= ${rows.length})`,
      );
    return rows[rowIndex];
  }

  function getTableDataCell(rowIndex: number, colIndex: number) {
    const cells = getTableRow(rowIndex).getByRole('cell').all();
    if (colIndex >= cells.length)
      throw new Error(
        `Col index bigger than available columns (${colIndex} >= ${cells.length})`,
      );
    return cells[colIndex];
  }
});
