import { type Page } from '@playwright/test';

export function getUserRow(page: Page, rowIndex: number) {
  return page.getByLabel(new RegExp(`row entry #${rowIndex + 1}$`, 'i'));
}

export async function expandUserRow(page: Page, rowIndex: number) {
  const row = getUserRow(page, rowIndex);
  await row.getByRole('button', { name: /expand details/i }).click();
  return row;
}

export async function getExpandedRow(page: Page, rowIndex: number) {
  await expandUserRow(page, rowIndex);
  const expandedRow = page.getByTestId(/^row-details-/);
  return expandedRow;
}

export const SORT_LABELS = [
  'By User ID',
  'Username (z-a, then Z-A)',
  'Username (A-Z, then a-z)',
] as const;

export type SortLabel = (typeof SORT_LABELS)[number];

export async function selectUsernameSorting(page: Page, label: SortLabel) {
  await page.getByLabel(/sort by:/i).selectOption({ label });
}

export async function searchForUser(page: Page, text: string) {
  const search = page
    .locator('search')
    .getByRole('textbox', { name: /search by username/i });
  await search.fill(text);
}

export async function selectUserFilter(page: Page, label: string) {
  await page.getByRole('listbox').selectOption([label]);
}
