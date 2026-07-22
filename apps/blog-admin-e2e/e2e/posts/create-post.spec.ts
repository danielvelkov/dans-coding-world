/* eslint-disable playwright/no-conditional-in-test */
import type { Post, Role, Tag, User } from '@dans-coding-world/prisma-schema';
import { generateRandomString } from '@dans-coding-world/helpers';
import {
  ERROR_MESSAGES,
  ERROR_CODES,
  POST_CONSTRAINTS,
  TAG_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { test, expect, type Page } from '../fixtures/dbFixture';
import {
  checkIfLoggedIn,
  login,
  loginAsRandomUser,
} from '../helpers/user-login.helper';
import { waitOutLoader } from '../helpers/loading.helper';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';

const EXISTING_POST_TITLE = 'Already Taken Post Title';
const VALID_CONTENT = 'This is enough content for the form.';

async function fillContentEditor(page: Page, content: string) {
  const editor = page.locator('[data-testid="editor"] .ql-editor');
  await editor.click();
  await editor.fill(content);
}

async function fillFormFields(
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

async function setTitleBeyondMaxLength(page: Page, title: string) {
  const input = page.getByLabel(/^title$/i);
  await input.evaluate((el: HTMLInputElement) => {
    el.removeAttribute('maxlength');
    el.maxLength = 99999;
  });
  await input.fill(title);
}

test.describe('Create post page', () => {
  let users: User[] = [];
  let seededTags: Tag[] = [];
  let seededPosts: Post[] = [];

  test.beforeAll(async ({ db }) => {
    users = await db.seedUsers({
      users: null,
      options: { clearExisting: true, useDefaults: true },
    });

    seededTags = await db.seedTags({
      tags: null,
      options: { clearExisting: true, useDefaults: true },
    });

    seededPosts = await db.seedPosts({
      posts: [
        {
          title: 'Published post',
          content: VALID_CONTENT,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          authorId: users.find((u) => u.role === 'AUTHOR')?.id ?? 1,
        },
        {
          title: EXISTING_POST_TITLE,
          content: VALID_CONTENT,
          status: 'DRAFT',
          visibility: 'PUBLIC',
          authorId: users.find((u) => u.role === 'AUTHOR')?.id ?? 1,
        },
      ],
      options: { clearExisting: true, useDefaults: false },
    });

    const publishedPost = seededPosts.find((p) => p.status === 'PUBLISHED');
    if (!publishedPost)
      throw new Error(
        'Missing Published post to attach tags to so as to make them public',
      );
    await db.attachTags({
      data: [
        {
          postId: publishedPost.id.toString(),
          tagIds: seededTags.map((t) => t.id.toString()),
        },
      ],
    });
  });

  test('shows 401 UNAUTHORIZED when not logged in', async ({ page }) => {
    await page.goto('/posts/new');
    await expect(page.getByText(/401/i)).toBeVisible();
    await expect(page.getByText(/authentication required/i)).toBeVisible();
  });

  test.describe('Authenticated AUTHOR/ADMIN', () => {
    const allowedRoles: Role[] = ['ADMIN', 'AUTHOR'];

    test.beforeEach(async ({ page }) => {
      await loginAsRandomUser(
        page,
        users.filter((u) => allowedRoles.includes(u.role)),
      );
      await waitOutLoader(page);
      expect(await checkIfLoggedIn(page)).toBe(true);
      await page.goto('/posts/new');
      await waitOutLoader(page);
    });

    test('contains "Create post" heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /create post/i }),
      ).toBeVisible();
    });

    test.describe('Form fields', () => {
      test('shows title input', async ({ page }) => {
        const titleInput = page.getByLabel(/^title$/i);
        await expect(titleInput).toBeVisible();
        await expect(titleInput).toHaveAttribute('id', 'title');
      });

      test('shows editor', async ({ page }) => {
        await expect(page.getByTestId('editor')).toBeInViewport();
        await expect(
          page.locator('[data-testid="editor"] .ql-editor'),
        ).toBeVisible();
      });

      test('clicking on "members-only" checkbox toggles it', async ({
        page,
      }) => {
        const checkbox = page.getByLabel(/members.only/i);
        await expect(checkbox).not.toBeChecked();
        await checkbox.click();
        await expect(checkbox).toBeChecked();
        await checkbox.click();
        await expect(checkbox).not.toBeChecked();
      });

      test('search input shows all tags as options in dropdown on click', async ({
        page,
      }) => {
        await page.getByPlaceholder(/search tag/i).click();
        const listbox = page.getByTestId('dropdown-search-listbox');
        await expect(listbox).toBeInViewport();

        for (const tag of seededTags) {
          await expect(
            listbox.getByRole('option', { name: new RegExp(`#${tag.name}`) }),
          ).toBeAttached();
        }
      });

      test(`search input shows loading spinner in dropdown on click if
        while tags query resolves`, async ({ page }) => {
        test.setTimeout(30_000);
        await page.route(`**${API_ENDPOINTS.TAGS.LIST}**`, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await route.continue();
        });

        await page.goto('/posts/new');
        await page.getByPlaceholder(/search tag/i).click();
        await expect(page.getByTestId('dropdown-search-listbox')).toContainText(
          /searching/i,
        );
      });

      test('selecting tag from search input dropdown adds it to selected tags', async ({
        page,
      }) => {
        const tag = seededTags[0];
        await page.getByPlaceholder(/search tag/i).click();
        await page
          .getByTestId('dropdown-search-listbox')
          .getByRole('option', { name: new RegExp(`#${tag.name}`) })
          .click();
        await expect(page.getByTestId(`chip-${tag.name}`)).toBeVisible();
      });

      test('pressing [Enter] after inputting string in tag input adds to selected tags', async ({
        page,
      }) => {
        const customTag = `custom-${generateRandomString(6)}`;
        const tagInput = page.getByPlaceholder(/add tag.../i);
        await tagInput.fill(customTag);
        await tagInput.press('Enter');
        await expect(page.getByTestId(`chip-${customTag}`)).toBeVisible();
      });

      test('pressing [Backspace] on empty tag input removes last selected tag', async ({
        page,
      }) => {
        const first = `alpha-${generateRandomString(4)}`;
        const second = `beta-${generateRandomString(4)}`;
        const tagInput = page.getByPlaceholder(/add tag.../i);

        await tagInput.fill(first);
        await tagInput.press('Enter');
        await tagInput.fill(second);
        await tagInput.press('Enter');
        await expect(page.getByTestId(`chip-${first}`)).toBeVisible();
        await expect(page.getByTestId(`chip-${second}`)).toBeVisible();

        await tagInput.click();
        await expect(tagInput).toHaveValue('');
        await tagInput.press('Backspace');
        await expect(page.getByTestId(`chip-${second}`)).toBeHidden();
        await expect(page.getByTestId(`chip-${first}`)).toBeVisible();
      });

      test('user cannot enter an already added tag', async ({ page }) => {
        const tag = `dup-${generateRandomString(5)}`;
        const tagInput = page.getByPlaceholder(/add tag.../i);

        await tagInput.fill(tag);
        await tagInput.press('Enter');
        await expect(page.getByTestId(`chip-${tag}`)).toBeVisible();

        await tagInput.fill(tag);
        await tagInput.press('Enter');
        await expect(page.getByTestId(`chip-${tag}`)).toHaveCount(1);
      });

      test.describe('validation', () => {
        test('user cannot type into "Title" field past specified limit', async ({
          page,
        }) => {
          const longTitle = generateRandomString(
            POST_CONSTRAINTS.MAX_TITLE_LENGTH + 20,
          );
          const input = page.getByLabel(/^title$/i);
          await fillFormFields(page, longTitle);
          await expect(input).not.toHaveValue(longTitle);
          await expect(input).toHaveValue(
            longTitle.substring(0, POST_CONSTRAINTS.MAX_TITLE_LENGTH),
          );
        });

        test('user cannot save/publish if title is too short', async ({
          page,
        }) => {
          const shortTitle = generateRandomString(
            POST_CONSTRAINTS.MIN_TITLE_LENGTH - 1,
          );
          await fillFormFields(page, shortTitle, undefined, VALID_CONTENT);
          await page.getByRole('button', { name: /save as draft/i }).click();
          await expect(page.getByTestId('title-error')).toBeVisible();
          await expect(page.getByTestId('title-error')).toContainText(
            VALIDATION_MESSAGES.minLength(POST_CONSTRAINTS.MIN_TITLE_LENGTH),
          );
        });

        test('user cannot save/publish if title is too long', async ({
          page,
        }) => {
          const longTitle = generateRandomString(
            POST_CONSTRAINTS.MAX_TITLE_LENGTH + 5,
          );
          await setTitleBeyondMaxLength(page, longTitle);
          await fillContentEditor(page, VALID_CONTENT);
          await page.getByRole('button', { name: /save as draft/i }).click();
          await expect(page.getByTestId('title-error')).toBeVisible();
          await expect(page.getByTestId('title-error')).toContainText(
            VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH),
          );
        });

        test('user cannot save/publish if title is already used by another post', async ({
          page,
        }) => {
          test.slow();
          expect(seededPosts.length).toBeGreaterThan(0);
          await fillFormFields(
            page,
            EXISTING_POST_TITLE,
            undefined,
            VALID_CONTENT,
          );
          await page.getByRole('button', { name: /save as draft/i }).click();
          await expect(page.getByTestId('post-form-error')).toBeVisible();
          await expect(page.getByTestId('post-form-error')).toContainText(
            ERROR_MESSAGES[ERROR_CODES.VALIDATION.POST_EXISTS],
          );
        });

        test('user cannot save/publish if content is too short', async ({
          page,
        }) => {
          const shortContent = generateRandomString(
            POST_CONSTRAINTS.MIN_CONTENT_LENGTH - 1,
          );
          await fillFormFields(
            page,
            generateRandomString(10),
            undefined,
            shortContent,
          );
          await page.getByRole('button', { name: /save as draft/i }).click();
          await expect(page.getByTestId('content-error')).toBeVisible();
          await expect(page.getByTestId('content-error')).toContainText(
            VALIDATION_MESSAGES.minLength(POST_CONSTRAINTS.MIN_CONTENT_LENGTH),
          );
        });

        test('user cannot save/publish if content is too long', async ({
          page,
        }) => {
          test.setTimeout(30000);
          await fillFormFields(
            page,
            generateRandomString(10),
            false,
            generateRandomString(POST_CONSTRAINTS.MAX_CONTENT_LENGTH + 100),
          );
          await page.getByRole('button', { name: /save as draft/i }).click();
          await expect(page.getByTestId('content-error')).toBeVisible();
          await expect(page.getByTestId('content-error')).toContainText(
            /formatted content is too large/i,
          );
        });

        test('user cannot enter a tag that is too short', async ({ page }) => {
          const shortTag = generateRandomString(
            TAG_CONSTRAINTS.MIN_NAME_LENGTH - 1,
          );
          const tagInput = page.getByPlaceholder(/add tag.../i);
          await tagInput.fill(shortTag);
          await tagInput.press('Enter');
          await expect(page.getByTestId(`chip-${shortTag}`)).toBeHidden();
          await expect(page.getByTestId('tag-error')).toBeVisible();
          await expect(page.getByTestId('tag-error')).toContainText(
            VALIDATION_MESSAGES.minLength(TAG_CONSTRAINTS.MIN_NAME_LENGTH),
          );
        });

        test('user cannot enter a tag that is too long', async ({ page }) => {
          const longTag = generateRandomString(
            TAG_CONSTRAINTS.MAX_NAME_LENGTH + 5,
          );
          const tagInput = page.getByPlaceholder(/add tag.../i);
          await tagInput.fill(longTag);
          await tagInput.press('Enter');
          await expect(page.getByTestId(`chip-${longTag}`)).toBeHidden();
          await expect(page.getByTestId('tag-error')).toBeVisible();
          await expect(page.getByTestId('tag-error')).toContainText(
            VALIDATION_MESSAGES.maxLength(TAG_CONSTRAINTS.MAX_NAME_LENGTH),
          );
        });

        test('user cannot enter a tag that contains invalid characters', async ({
          page,
        }) => {
          const invalidTag = `${generateRandomString(4)}_BAD`;
          const tagInput = page.getByPlaceholder(/add tag.../i);
          await tagInput.fill(invalidTag);
          await tagInput.press('Enter');
          await expect(page.getByTestId(`chip-${invalidTag}`)).toBeHidden();
          await expect(page.getByTestId('tag-error')).toBeVisible();
          await expect(page.getByTestId('tag-error')).toContainText(
            VALIDATION_MESSAGES.tags.invalid,
          );
        });
      });
    });

    test.describe('Content preview', () => {
      test('changing the text in editor updates it in post preview', async ({
        page,
      }) => {
        const text = 'Some html content';
        await fillContentEditor(page, text);
        await expect(page.getByTestId('preview')).toContainText(text);
      });

      test('selecting Headers format option from editor toolbar updates preview as HTML', async ({
        page,
      }) => {
        const content = 'Hello World';
        await fillContentEditor(page, content);
        const preview = page.getByTestId('preview');
        await expect(
          preview.getByRole('heading', { name: content }),
        ).toBeHidden();

        await page
          .locator('[data-testid="editor"] .ql-editor')
          .press('Control+A');
        await page.locator('.ql-picker.ql-header .ql-picker-label').click();
        await page
          .locator('.ql-picker.ql-header .ql-picker-item[data-value="1"]')
          .click();
        await expect(
          preview.getByRole('heading', { name: content, level: 1 }),
        ).toBeVisible();

        await page.locator('.ql-picker.ql-header .ql-picker-label').click();
        await page
          .locator('.ql-picker.ql-header .ql-picker-item[data-value="2"]')
          .click();
        await expect(
          preview.getByRole('heading', { name: content, level: 2 }),
        ).toBeVisible();
      });

      test('does not execute javascript inside post preview on update', async ({
        page,
      }) => {
        let dialogShown = false;
        page.on('dialog', async (dialog) => {
          dialogShown = true;
          await dialog.dismiss();
        });

        await page.evaluate(() => {
          const root = document.querySelector('[data-testid="editor"]') as {
            __quill?: {
              clipboard: {
                dangerouslyPasteHTML: (html: string) => void;
              };
            };
          } | null;
          root?.__quill?.clipboard.dangerouslyPasteHTML(
            '<img src="x" onerror="alert(\'hacked\')" width="0" height="0"><script>alert("hacked")</script>',
          );
        });

        const preview = page.getByTestId('preview');
        await expect(preview.locator('[onerror]')).toHaveCount(0);
        await expect(preview.locator('script')).toHaveCount(0);
        expect(dialogShown).toBe(false);
      });
    });

    test.describe('saving/publishing', () => {
      test('contains "save as draft" action', async ({ page }) => {
        await expect(
          page.getByRole('button', { name: /^save as draft$/i }),
        ).toBeVisible();
      });

      test(`selecting "save as draft" action on valid data creates post as draft,
         shows success notification and navigates to post's edit page`, async ({
        page,
      }) => {
        test.slow();
        const title = `Draft ${generateRandomString(8)}`;
        await fillFormFields(page, title, undefined, VALID_CONTENT);
        await page.getByRole('button', { name: /^save as draft$/i }).click();

        await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);
        await expect(
          page.getByText(/post created successfully/i),
        ).toBeVisible();
        await expect(
          page.getByText(new RegExp(`current status:.*DRAFT`, 'i')),
        ).toBeVisible();
        await expect(page.getByLabel(/^title$/i)).toHaveValue(title);
      });

      test('contains "Publish" action', async ({ page }) => {
        await expect(
          page.getByRole('button', { name: /^publish$/i }),
        ).toBeVisible();
      });

      test('selecting "Publish" action on valid data opens confirmation dialog', async ({
        page,
      }) => {
        await fillFormFields(
          page,
          `Publish dialog ${generateRandomString(6)}`,
          undefined,
          VALID_CONTENT,
        );
        await page.getByRole('button', { name: /^publish$/i }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(/confirm publish/i);
      });

      test(`selecting "Publish" action on valid data opens dialog
        which on confirmation creates post as published,
        shows success notification and navigates to post's edit page`, async ({
        page,
      }) => {
        test.slow();
        const title = `Published ${generateRandomString(8)}`;
        await fillFormFields(page, title, undefined, VALID_CONTENT);
        await page.getByRole('button', { name: /^publish$/i }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: /^confirm$/i }).click();

        await expect(page).toHaveURL(/\/posts\/\d+\/edit$/);
        await expect(
          page.getByText(/post created successfully/i),
        ).toBeVisible();
        await expect(
          page.getByText(new RegExp(`current status:.*PUBLISHED`, 'i')),
        ).toBeVisible();
        await expect(page.getByLabel(/^title$/i)).toHaveValue(title);
      });
    });
  });

  test.describe('Logged in as User/Mod', () => {
    const allowedRoles: Role[] = ['USER', 'MOD'];
    test.beforeEach(async ({ page }) => {
      const user = users.find((u) => allowedRoles.includes(u.role));
      if (!user) throw new Error('Missing fixture');
      await page.goto('/login');
      await login(page, user.email, user.password);
      expect(await checkIfLoggedIn(page)).toBe(true);
    });

    test('shows 403 FORBIDDEN when trying to navigate to page', async ({
      page,
    }) => {
      await page.goto('/posts/new');
      await expect(page.getByText(/403/i)).toBeVisible();
      await expect(page.getByText(/access denied/i)).toBeVisible();
    });
  });
});
