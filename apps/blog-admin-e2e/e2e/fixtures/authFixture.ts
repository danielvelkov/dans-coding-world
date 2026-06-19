import { test as base } from '../fixtures/dbFixture';
import type { User } from '@dans-coding-world/prisma-schema';
import type { Page } from '@playwright/test';
import type { Db } from '../fixtures/dbFixture';

interface UserState {
  current: User[] | undefined;
}

interface Auth {
  logInPage(args: { page: Page; user: User }): Promise<void>;
}

export const test = base.extend<{
  db: Db;
  users: UserState;
  auth: Auth;
}>({
  users: async ({ db }, use) => {
    let storedUsers: User[] | undefined;

    const userState = {
      get current() {
        return storedUsers;
      },
      set current(value: User[] | undefined) {
        storedUsers = value;
      },
    };

    await use(userState);
  },

  auth: async ({ db, users }, use) => {
    const auth: Auth = {
      async logInPage({ page, user }) {
        await page.goto('/login');

        await page.getByLabel('Email').fill(user.email);
        await page.getByLabel('Password').fill(user.password);

        await page.getByRole('button', { name: 'Log in' }).click();

        await page.waitForURL('/posts');
      },
    };

    await use(auth);
  },
});

export * from '@playwright/test';
