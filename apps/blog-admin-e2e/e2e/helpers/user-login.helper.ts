import { randomSelect as randomItem } from '@dans-coding-world/helpers';
import type { UserDetail } from '@dans-coding-world/user-data-access';
import { expect, type Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.getByRole('textbox', { name: /^email/i }).fill(email);
  await page.getByRole('textbox', { name: /^password/i }).fill(password);
  await page.getByRole('button', { name: /^login$/i }).click();
}

export async function logout(page: Page) {
  await page.getByRole('link', { name: /^logout/i }).click();
}

export async function checkIfLoggedIn(page: Page): Promise<boolean> {
  // User account name is shown whenever authenticated, including while logout shows a spinner.
  const account = page.getByLabel(/^account name/i);
  try {
    await account.waitFor({ state: 'visible', timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}

export async function checkIfLoggedOut(page: Page): Promise<boolean> {
  const login = page.getByRole('link', { name: /^login/i });
  try {
    await login.waitFor({ state: 'visible', timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}

export async function loginAsRandomUser(page: Page, testUsers: UserDetail[]) {
  const randomUser = randomItem(testUsers);
  await expect(page.getByText(randomUser.email)).toBeHidden();
  await page.getByRole('link', { name: /^login/i }).click();
  await login(page, randomUser.email, randomUser.password);
  return randomUser;
}
