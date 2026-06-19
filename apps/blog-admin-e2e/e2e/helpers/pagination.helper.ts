import type { Page } from '@playwright/test';

export async function goToPage(page: Page, pageNum: number) {
  await page.getByLabel(`page ${pageNum}`, { exact: true }).click();
}

export async function clickNextPage(page: Page) {
  await page.getByLabel('next page', { exact: true }).click();
}

export async function clickPrevPage(page: Page) {
  await page.getByLabel('prev page', { exact: true }).click();
}

export async function selectRowEntriesPerPage(page: Page, size: number) {
  await page
    .getByLabel('Rows per page', { exact: true })
    .selectOption(String(size));
}
