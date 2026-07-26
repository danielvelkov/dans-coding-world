import { type Page } from '@playwright/test';

export async function fillContentEditor(page: Page, content: string) {
  const editor = page.locator('[data-testid="editor"] .ql-editor');
  await editor.click();
  await editor.fill(content);
}

export async function fillFormFields(
  page: Page,
  title?: string,
  isMembersOnly?: boolean,
  content?: string,
) {
  if (title) await page.getByLabel(/^title$/i).fill(title);
  if (content) await fillContentEditor(page, content);
  if (isMembersOnly !== undefined)
    await page.getByLabel(/members.only/i).setChecked(isMembersOnly);
}
