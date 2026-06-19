import type { Page } from '@playwright/test';
export const SORT_LABELS = [
  'Published (desc)',
  'Published (asc)',
  'Modified (asc)',
  'Modified (desc)',
] as const;

export type SortLabel = (typeof SORT_LABELS)[number];

export async function selectPostSorting(page: Page, label: SortLabel) {
  await page.getByLabel(/sort by:/i).selectOption({ label });
}
