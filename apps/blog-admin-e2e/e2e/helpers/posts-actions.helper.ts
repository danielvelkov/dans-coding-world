import { type Page } from '@playwright/test';
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

export async function searchForPost(page: Page, text: string) {
  const input = page
    .locator('search')
    .getByRole('textbox', { name: /search by/i });
  await input.clear();
  await input.fill(text);
}

export async function selectPostFilter(page: Page, labels: string[]) {
  const wrapper = page.getByTestId('filter-posts');

  await wrapper.hover();

  await page.getByRole('listbox').selectOption(labels);
  await page.mouse.move(0, 0); // moves mouse to top-left, triggers mouseleave
}
