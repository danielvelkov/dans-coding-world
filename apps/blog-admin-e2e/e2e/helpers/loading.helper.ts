import { type Page } from '@playwright/test';

export async function waitOutLoader(page: Page, loadingMessage?: string) {
  const loader = page.getByRole('status', {
    name: new RegExp(`^${loadingMessage ?? 'Loading'}`, 'i'),
  });
  try {
    await loader.waitFor({ state: 'hidden', timeout: 2500 });
    return true;
  } catch {
    return false;
  }
}
