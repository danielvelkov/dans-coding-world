import { type Page } from '@playwright/test';

export function getReportRow(page: Page, rowIndex: number) {
  return page.getByLabel(new RegExp(`row entry #${rowIndex + 1}$`, 'i'));
}

export async function expandReportRow(page: Page, rowIndex: number) {
  const row = getReportRow(page, rowIndex);
  await row.getByRole('button', { name: /expand details/i }).click();
  return row;
}

export async function getExpandedRow(page: Page, rowIndex: number) {
  await expandReportRow(page, rowIndex);
  const expandedRow = page.getByTestId(/^row-details-/);
  return expandedRow;
}

export const SORT_LABELS = ['Created (desc)', 'Created (asc)'] as const;

export type SortLabel = (typeof SORT_LABELS)[number];

export async function selectReportSorting(page: Page, label: SortLabel) {
  await page.getByLabel(/sort by:/i).selectOption({ label });
}

/**
 * @note Only works for admins
 */
export async function searchForUser(page: Page, text: string) {
  const search = page.getByRole('searchbox', { name: 'Search for:' });
  await search.click();
  await search.fill(text);
  await page
    .getByTestId('dropdown-search-listbox')
    .getByRole('option', { name: text })
    .click();
}

export async function selectReportFilter(page: Page, labels: string[]) {
  const wrapper = page.getByTestId('filter-reports');

  await wrapper.hover();

  await page.getByRole('listbox').selectOption(labels);
  await page.mouse.move(0, 0); // moves mouse to top-left, triggers mouseleave
}

export async function getReportedUserIdFromRow(
  expandedRowLocator: ReturnType<Page['getByTestId']>,
) {
  const filterBtn = expandedRowLocator.getByRole('button', {
    name: /filter by reported user/i,
  });

  const text = await filterBtn.innerText();
  const match = text.match(/\d+/);
  if (!match) throw new Error(`Could not parse user ID from text: "${text}"`);

  return Number(match[0]);
}

export async function getPostIdFromRow(
  expandedRowLocator: ReturnType<Page['getByTestId']>,
) {
  const filterBtn = expandedRowLocator.getByRole('button', {
    name: /filter by post id/i,
  });

  const text = await filterBtn.innerText();
  const match = text.match(/\d+/);
  if (!match) throw new Error(`Could not parse user ID from text: "${text}"`);

  return Number(match[0]);
}

export async function filterByReportedUserInRow(page: Page, rowIndex: number) {
  const expandedRow = await getExpandedRow(page, rowIndex);
  const userId = await getReportedUserIdFromRow(expandedRow);

  const filterBtn = expandedRow.getByRole('button', {
    name: /filter by reported user/i,
  });
  await filterBtn.click();

  return userId;
}

export async function filterByPostInRow(page: Page, rowIndex: number) {
  const expandedRow = await getExpandedRow(page, rowIndex);
  const userId = await getPostIdFromRow(expandedRow);

  const filterBtn = expandedRow.getByRole('button', {
    name: /filter by post id/i,
  });
  await filterBtn.click();

  return userId;
}
